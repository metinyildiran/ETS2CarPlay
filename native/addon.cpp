#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <Windows.h>
#include <winhttp.h>
#include <reshade.hpp>
#include "protocol.hpp"
#include <atomic>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <vector>
#include <algorithm>
#include <chrono>
#include <memory>
#include <cstdio>
#pragma comment(lib, "winhttp.lib")
using namespace reshade::api;
using Clock = std::chrono::steady_clock;
struct Target { device *dev; resource handle; bool bgra; bool dynamic; uint64_t revision = ~uint64_t(0); };
struct Known { device *dev; resource handle; resource_desc desc; bool identified = false; };
struct Mapping { device *dev; resource handle; subresource_data data; std::thread::id thread; };
static std::vector<Known> known;
static std::vector<Mapping> mappings;
static thread_local bool writing_frame = false;
static std::atomic<unsigned> diagnostic_count{0};
static std::vector<Target> targets;
static std::mutex target_mutex, frame_mutex, wait_mutex;
static std::condition_variable wake;
static std::atomic<bool> running{false};
static std::atomic<unsigned> target_count{0};
static std::thread worker;
static std::shared_ptr<const std::vector<uint8_t>> latest;
static Clock::time_point received;
static uint64_t revision = 0;
struct InternetHandle {
  HINTERNET h;
  explicit InternetHandle(HINTERNET value) : h(value) {}
  ~InternetHandle() { if (h) WinHttpCloseHandle(h); }
  operator HINTERNET() const { return h; }
};
static void poll_frames(uint16_t port) {
  InternetHandle session(WinHttpOpen(L"FH6CarPlay/0.2", WINHTTP_ACCESS_TYPE_NO_PROXY, nullptr, nullptr, 0));
  if (!session.h) return;
  WinHttpSetTimeouts(session, 500, 500, 500, 500);
  InternetHandle connection(WinHttpConnect(session, L"127.0.0.1", port, 0));
  if (!connection.h) return;
  while (running) {
    try {
      InternetHandle request(WinHttpOpenRequest(connection, L"GET", L"/frame", nullptr, nullptr, nullptr, 0));
      if (request.h) {
        DWORD redirect = WINHTTP_OPTION_REDIRECT_POLICY_NEVER;
        WinHttpSetOption(request, WINHTTP_OPTION_REDIRECT_POLICY, &redirect, sizeof(redirect));
        std::wstring headers = L"X-FH6-Bridge: 1\r\nX-FH6-Targets: " + std::to_wstring(target_count.load()) + L"\r\n";
        if (WinHttpSendRequest(request, headers.c_str(), DWORD(-1), nullptr, 0, 0, 0) && WinHttpReceiveResponse(request, nullptr)) {
          DWORD code = 0, length = sizeof(code);
          WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, nullptr, &code, &length, nullptr);
          if (code == 200) {
            auto bytes = std::make_shared<std::vector<uint8_t>>(fh6::header_size + fh6::pixels_size + 1);
            DWORD total = 0, count = 0;
            while (running && total < bytes->size() && WinHttpReadData(request, bytes->data() + total, DWORD(bytes->size() - total), &count) && count) total += count;
            if (fh6::valid_frame(bytes->data(), total)) {
              bytes->resize(total);
              std::lock_guard lock(frame_mutex);
              latest = std::move(bytes); received = Clock::now(); ++revision;
            }
          }
        }
      }
    } catch (...) { /* A dropped frame must not unwind into the game. */ }
    std::unique_lock lock(wait_mutex);
    wake.wait_for(lock, std::chrono::milliseconds(100), [] { return !running.load(); });
  }
}
static bool candidate(const resource_desc &desc) {
  if (desc.type != resource_type::texture_2d) return false;
  const auto format = desc.texture.format;
  return desc.type == resource_type::texture_2d && desc.texture.width == fh6::width &&
    desc.texture.height == fh6::height && desc.texture.levels == 1 && desc.texture.depth_or_layers == 1 &&
    desc.texture.samples == 1 && (format == format::r8g8b8a8_unorm || format == format::r8g8b8a8_unorm_srgb ||
    format == format::b8g8r8a8_unorm || format == format::b8g8r8a8_unorm_srgb ||
    format == format::r8g8b8a8_typeless || format == format::b8g8r8a8_typeless);
}
static bool matching(const resource_desc &desc, const subresource_data *data) {
  return candidate(desc) && data && fh6::is_marker(data->data, data->row_pitch);
}
// Caller holds target_mutex. Staging resources retain provenance but are never video targets.
static void identify(device *dev, resource handle, const char *route) {
  auto k = std::find_if(known.begin(), known.end(), [=](const Known &v) { return v.dev == dev && v.handle == handle; });
  if (k == known.end() || k->identified) return;
  k->identified = true;
  char msg[256];
  std::snprintf(msg, sizeof(msg), "FH6CarPlay 0.2.1: marker via %s, heap=%u usage=%u.", route, unsigned(k->desc.heap), unsigned(k->desc.usage));
  reshade::log::message(reshade::log::level::info, msg);
  if ((k->desc.usage & resource_usage::shader_resource) == 0 ||
      (k->desc.flags & resource_flags::immutable) != 0 ||
      (k->desc.heap != memory_heap::gpu_only && k->desc.heap != memory_heap::cpu_to_gpu)) return;
  auto f = k->desc.texture.format;
  targets.push_back({dev, handle, f == format::b8g8r8a8_unorm || f == format::b8g8r8a8_unorm_srgb || f == format::b8g8r8a8_typeless, k->desc.heap == memory_heap::cpu_to_gpu});
  target_count = unsigned(targets.size());
  reshade::log::message(reshade::log::level::info, "FH6CarPlay: unique screen marker found.");
}
static bool on_create(device *dev, resource_desc &desc, subresource_data *data, resource_usage) {
  if (dev->get_api() != device_api::d3d11 || !matching(desc, data)) return false;
  desc.heap = memory_heap::cpu_to_gpu;
  desc.flags = (desc.flags & ~resource_flags::immutable) | resource_flags::dynamic;
  return true;
}
static void on_init(device *dev, const resource_desc &desc, const subresource_data *data, resource_usage, resource handle) {
  if (dev->get_api() != device_api::d3d11 || !candidate(desc)) return;
  try {
    std::lock_guard lock(target_mutex);
    known.push_back({dev, handle, desc});
    if (diagnostic_count++ < 24) {
      char msg[200];
      std::snprintf(msg,sizeof(msg),"FH6CarPlay 0.2.1: candidate fmt=%u heap=%u initial=%u pitch=%u.",unsigned(desc.texture.format),unsigned(desc.heap),data && data->data ? 1u : 0u,data ? data->row_pitch : 0u);
      reshade::log::message(reshade::log::level::info,msg);
    }
    if (matching(desc, data)) identify(dev, handle, "initial-data");
  } catch (...) {}
}
static bool origin_box(const subresource_box *box) {
  return !box || (box->left == 0 && box->top == 0 && box->front == 0 && box->right >= 16 && box->bottom >= 1 && box->back >= 1);
}
static bool on_upload(device *dev, const subresource_data &data, resource dest, uint32_t sub, const subresource_box *box) {
  if (writing_frame || sub != 0 || !origin_box(box)) return false;
  try {
    std::lock_guard lock(target_mutex);
    if (std::any_of(known.begin(),known.end(),[=](const Known &k){return k.dev==dev && k.handle==dest;}) && fh6::is_marker(data.data,data.row_pitch)) identify(dev,dest,"update-subresource");
  } catch (...) {}
  return false;
}
static bool on_upload_command(command_list *cmd, const subresource_data &data, resource dest, uint32_t sub, const subresource_box *box) {
  return on_upload(cmd->get_device(),data,dest,sub,box);
}
static void on_map(device *dev, resource handle, uint32_t sub, const subresource_box *box, map_access access, subresource_data *data) {
  if (writing_frame || sub != 0 || !origin_box(box) || access == map_access::read_only || !data || !data->data) return;
  try {
    std::lock_guard lock(target_mutex);
    if (std::any_of(known.begin(),known.end(),[=](const Known &k){return k.dev==dev && k.handle==handle;})) mappings.push_back({dev,handle,*data,std::this_thread::get_id()});
  } catch (...) {}
}
static void on_unmap(device *dev, resource handle, uint32_t sub) {
  if (writing_frame || sub != 0) return;
  try {
    std::lock_guard lock(target_mutex);
    auto m = std::find_if(mappings.begin(),mappings.end(),[=](const Mapping &v){return v.dev==dev && v.handle==handle && v.thread==std::this_thread::get_id();});
    if (m == mappings.end()) return;
    const bool match = fh6::is_marker(m->data.data,m->data.row_pitch);
    mappings.erase(m);
    if (match) identify(dev,handle,"map-unmap");
  } catch (...) {}
}
static bool on_copy(command_list *cmd, resource src, resource dest) {
  if (writing_frame) return false;
  try {
    auto dev = cmd->get_device();
    std::lock_guard lock(target_mutex);
    if (std::any_of(known.begin(),known.end(),[=](const Known &k){return k.dev==dev && k.handle==src && k.identified;})) identify(dev,dest,"texture-copy");
  } catch (...) {}
  return false;
}
static bool on_copy_region(command_list *cmd, resource src, uint32_t ss, const subresource_box *sb, resource dst, uint32_t ds, const subresource_box *db, filter_mode) {
  // Propagate only complete, unscaled base-level copies. Never infer from dimensions alone.
  auto full = [](const subresource_box *b){return !b || (b->left==0 && b->top==0 && b->front==0 && b->right==fh6::width && b->bottom==fh6::height && b->back==1);};
  if (ss==0 && ds==0 && full(sb) && full(db)) return on_copy(cmd,src,dst);
  return false;
}
static void on_destroy(device *dev, resource handle) {
  std::lock_guard lock(target_mutex);
  std::erase_if(targets, [=](const Target &t) { return t.dev == dev && t.handle == handle; });
  std::erase_if(known, [=](const Known &t) { return t.dev == dev && t.handle == handle; });
  std::erase_if(mappings, [=](const Mapping &t) { return t.dev == dev && t.handle == handle; });
  target_count = unsigned(targets.size());
}
static void on_destroy_device(device *dev) {
  std::lock_guard lock(target_mutex);
  std::erase_if(targets, [=](const Target &t) { return t.dev == dev; });
  std::erase_if(known, [=](const Known &t) { return t.dev == dev; });
  std::erase_if(mappings, [=](const Mapping &t) { return t.dev == dev; });
  target_count = unsigned(targets.size());
}
static void on_present(command_queue *queue, swapchain *, const rect *, const rect *, uint32_t, const rect *) {
  if (!target_count.load()) return;
  std::shared_ptr<const std::vector<uint8_t>> frame;
  uint64_t current = 0;
  {
    std::lock_guard lock(frame_mutex);
    if (latest && Clock::now() - received < std::chrono::seconds(2)) { frame = latest; current = revision; }
  }
  std::lock_guard lock(target_mutex);
  struct WritingGuard { WritingGuard(){writing_frame=true;} ~WritingGuard(){writing_frame=false;} } guard;
  static std::vector<uint8_t> scratch(fh6::pixels_size);
  for (auto &t : targets) {
    if (t.dev != queue->get_device() || t.revision == current) continue;
    subresource_data mapped{};
    if (t.dynamic) {
      if (!t.dev->map_texture_region(t.handle, 0, nullptr, map_access::write_discard, &mapped)) continue;
    } else { mapped = {scratch.data(),fh6::stride, uint32_t(fh6::pixels_size)}; }
    if (mapped.row_pitch >= fh6::stride) {
      for (uint32_t y = 0; y < fh6::height; ++y) {
        auto dst = static_cast<uint8_t *>(mapped.data) + size_t(y) * mapped.row_pitch;
        const auto src = frame ? frame->data() + fh6::header_size + size_t(y) * fh6::stride : nullptr;
        for (uint32_t x = 0; x < fh6::width; ++x) {
          dst[x*4] = src ? src[x*4 + (t.bgra ? 2 : 0)] : 0;
          dst[x*4+1] = src ? src[x*4+1] : 0;
          dst[x*4+2] = src ? src[x*4 + (t.bgra ? 0 : 2)] : 0;
          dst[x*4+3] = 255;
        }
      }
      t.revision = current;
    }
    if (t.dynamic) t.dev->unmap_texture_region(t.handle, 0);
    else t.dev->update_texture_region(mapped,t.handle,0);
  }
}
extern "C" __declspec(dllexport) const char *NAME = "FH6 YouTube Screen";
extern "C" __declspec(dllexport) const char *DESCRIPTION = "Updates only the FH6CarPlay screen marker from the local video bridge.";
extern "C" __declspec(dllexport) bool AddonInit(HMODULE module, HMODULE) {
  if (!reshade::register_addon(module)) return false;
  reshade::register_event<reshade::addon_event::create_resource>(on_create);
  reshade::register_event<reshade::addon_event::init_resource>(on_init);
  reshade::register_event<reshade::addon_event::destroy_resource>(on_destroy);
  reshade::register_event<reshade::addon_event::destroy_device>(on_destroy_device);
  reshade::register_event<reshade::addon_event::present>(on_present);
  reshade::register_event<reshade::addon_event::update_texture_region>(on_upload);
  reshade::register_event<reshade::addon_event::update_texture_region_command>(on_upload_command);
  reshade::register_event<reshade::addon_event::map_texture_region>(on_map);
  reshade::register_event<reshade::addon_event::unmap_texture_region>(on_unmap);
  reshade::register_event<reshade::addon_event::copy_resource>(on_copy);
  reshade::register_event<reshade::addon_event::copy_texture_region>(on_copy_region);
  reshade::log::message(reshade::log::level::info,"FH6CarPlay 0.2.1: late-upload tracking enabled.");
  try { running = true; worker = std::thread(poll_frames, uint16_t(32126)); }
  catch (...) { running = false; reshade::unregister_addon(module); return false; }
  return true;
}
extern "C" __declspec(dllexport) void AddonUninit(HMODULE module, HMODULE) {
  running = false; wake.notify_all();
  if (worker.joinable()) worker.join();
  reshade::unregister_addon(module);
  { std::lock_guard lock(target_mutex); targets.clear(); known.clear(); mappings.clear(); target_count = 0; }
  { std::lock_guard lock(frame_mutex); latest.reset(); }
}
