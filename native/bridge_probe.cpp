// Isolated test of the exact HTTP receiver used by the add-on; never loads ETS2.
#include "addon.cpp"
#include <cstdlib>
int main(int argc, char **argv) {
  if (argc != 2) return 2;
  auto port = std::strtoul(argv[1], nullptr, 10);
  if (!port || port > 65535) return 2;
  running = true;
  worker = std::thread(poll_frames, uint16_t(port));
  bool okay = false;
  for (int i=0; i<40; ++i) {
    {
      std::lock_guard lock(frame_mutex);
      if (latest) {
        auto p = latest->data() + fh6::header_size;
        okay = p[0] == 23 && p[1] == 67 && p[2] == 149 && p[3] == 255;
        break;
      }
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }
  running = false; wake.notify_all(); worker.join();
  return okay ? 0 : 1;
}
