#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <Windows.h>
#include <d3d11.h>
#include <d3d11_1.h>
#include <dxgi1_2.h>
#include <wrl/client.h>
#include <MinHook.h>
extern "C" {
#include <scssdk_telemetry.h>
}
#include "protocol.hpp"
#include <vector>
#include <mutex>
#include <thread>
#include <atomic>
#include <memory>
#include <algorithm>
#include <cstdio>
#include "helper_runtime.hpp"
#pragma comment(lib,"d3d11.lib")
#pragma comment(lib,"user32.lib")
using Microsoft::WRL::ComPtr;
namespace {
std::atomic<bool> running{false};
std::atomic<unsigned> calls{0}, uploaded{0};
thread_local bool internal=false;
thread_local bool inPresent=false;
struct PresentGuard{bool nested=inPresent;PresentGuard(){inPresent=true;}~PresentGuard(){inPresent=nested;}};
struct Guard { Guard(){++calls;} ~Guard(){--calls;} };
struct Known { ComPtr<ID3D11Texture2D> texture; D3D11_TEXTURE2D_DESC desc; uint64_t serial=~0ull; };
struct Mapped { ID3D11DeviceContext *context; ComPtr<ID3D11Texture2D> texture; D3D11_MAPPED_SUBRESOURCE data; };
std::vector<Known> known;
std::vector<Mapped> mapped;
std::mutex resources, frames;
std::shared_ptr<std::vector<uint8_t>> latest;
uint64_t serial=0, received=0;
std::thread receiver;
std::atomic<bool> receiverDone{true};
std::vector<void*> hooks;
bool testProcess=false;
std::wstring pipeName=L"\\\\.\\pipe\\FH6CarPlay-v4";
std::atomic<unsigned> candidateCount{0},presentCount{0},updateCount{0};
scs_log_t gameLog=nullptr;
using Create=HRESULT(STDMETHODCALLTYPE*)(ID3D11Device*,const D3D11_TEXTURE2D_DESC*,const D3D11_SUBRESOURCE_DATA*,ID3D11Texture2D**);
using Present=HRESULT(STDMETHODCALLTYPE*)(IDXGISwapChain*,UINT,UINT);
using Present1=HRESULT(STDMETHODCALLTYPE*)(IDXGISwapChain1*,UINT,UINT,const DXGI_PRESENT_PARAMETERS*);
using Update=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext*,ID3D11Resource*,UINT,const D3D11_BOX*,const void*,UINT,UINT);
using Map=HRESULT(STDMETHODCALLTYPE*)(ID3D11DeviceContext*,ID3D11Resource*,UINT,D3D11_MAP,UINT,D3D11_MAPPED_SUBRESOURCE*);
using Unmap=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext*,ID3D11Resource*,UINT);
using Copy=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext*,ID3D11Resource*,ID3D11Resource*);
using Region=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext*,ID3D11Resource*,UINT,UINT,UINT,UINT,ID3D11Resource*,UINT,const D3D11_BOX*);
using Update1=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext1*,ID3D11Resource*,UINT,const D3D11_BOX*,const void*,UINT,UINT,UINT);
using Region1=void(STDMETHODCALLTYPE*)(ID3D11DeviceContext1*,ID3D11Resource*,UINT,UINT,UINT,UINT,ID3D11Resource*,UINT,const D3D11_BOX*,UINT);
Create originalCreate; Present originalPresent; Present1 originalPresent1;
template<int N> struct Context { static inline Update update; static inline Update1 update1; static inline Region1 region1; static inline Map map; static inline Unmap unmap; static inline Copy copy; static inline Region region; };
bool candidate(const D3D11_TEXTURE2D_DESC &d) {
  return d.Width==fh6::width && d.Height==fh6::height && d.ArraySize==1 && d.MipLevels==1 && d.SampleDesc.Count==1 &&
    (d.Format==DXGI_FORMAT_B8G8R8A8_UNORM || d.Format==DXGI_FORMAT_B8G8R8A8_UNORM_SRGB || d.Format==DXGI_FORMAT_B8G8R8A8_TYPELESS || d.Format==DXGI_FORMAT_R8G8B8A8_UNORM || d.Format==DXGI_FORMAT_R8G8B8A8_UNORM_SRGB || d.Format==DXGI_FORMAT_R8G8B8A8_TYPELESS);
}
ComPtr<ID3D11Texture2D> texture(ID3D11Resource *r) {
  ComPtr<ID3D11Texture2D> t;
  if(!r || FAILED(r->QueryInterface(IID_PPV_ARGS(&t)))) return {};
  D3D11_TEXTURE2D_DESC d; t->GetDesc(&d); return candidate(d)?t:ComPtr<ID3D11Texture2D>{};
}
void identify(ID3D11Resource *r) {
  auto t=texture(r); if(!t) return;
  std::lock_guard lock(resources);
  // Reloads/copies can overwrite the GPU contents without a new video frame.
  // Invalidate the upload even when the COM identity is unchanged (also while
  // idle, so reloaded marker pixels become transparent again).
  for(auto &k:known)if(k.texture.Get()==t.Get()){k.serial=~0ull;return;}
  D3D11_TEXTURE2D_DESC d; t->GetDesc(&d);
  // Bound retained references; pointer reuse cannot turn a different texture into a target.
  if(known.size()==32) known.erase(known.begin());
  known.push_back({t,d});
}
void revoke(ID3D11Resource *r) {
  std::lock_guard lock(resources);
  std::erase_if(known,[&](auto &k){return k.texture.Get()==r;});
}
bool origin(const D3D11_BOX *b) {return !b || (b->left==0 && b->top==0 && b->front==0 && b->right>=16 && b->bottom>=1);}
void inspect(ID3D11Resource *r,const void *p,UINT pitch) {
  if(!texture(r)) return;
  if(fh6::is_marker(p,pitch)) identify(r); else revoke(r);
}
void propagate(ID3D11Resource *dst,ID3D11Resource *src) {
  bool match; {std::lock_guard lock(resources); match=std::any_of(known.begin(),known.end(),[&](auto &k){return k.texture.Get()==src;});}
  if(match) identify(dst); else revoke(dst);
}
HRESULT STDMETHODCALLTYPE create(ID3D11Device *d,const D3D11_TEXTURE2D_DESC *desc,const D3D11_SUBRESOURCE_DATA *data,ID3D11Texture2D **out) {
  Guard g; auto copy=*desc;
  bool marker=running && candidate(copy) && data && fh6::is_marker(data->pSysMem,data->SysMemPitch);
  if(running && candidate(copy))++candidateCount;
  if(marker && copy.Usage==D3D11_USAGE_IMMUTABLE) copy.Usage=D3D11_USAGE_DEFAULT;
  HRESULT hr=originalCreate(d,&copy,data,out);
  if(marker && SUCCEEDED(hr) && out && *out) {try{identify(*out);}catch(...){}}
  return hr;
}
template<int N> void STDMETHODCALLTYPE update(ID3D11DeviceContext*c,ID3D11Resource*r,UINT s,const D3D11_BOX*b,const void*p,UINT pitch,UINT depth) {
  Guard g; Context<N>::update(c,r,s,b,p,pitch,depth);
  if(running && !internal && s==0 && origin(b)) {try{inspect(r,p,pitch);}catch(...){}}
}
template<int N> void STDMETHODCALLTYPE update1(ID3D11DeviceContext1*c,ID3D11Resource*r,UINT s,const D3D11_BOX*b,const void*p,UINT pitch,UINT depth,UINT flags) {
  Guard g; Context<N>::update1(c,r,s,b,p,pitch,depth,flags);
  if(running && !internal && s==0 && origin(b)){++updateCount;try{inspect(r,p,pitch);}catch(...){}}
}
template<int N> void STDMETHODCALLTYPE region1(ID3D11DeviceContext1*c,ID3D11Resource*d,UINT ds,UINT x,UINT y,UINT z,ID3D11Resource*s,UINT ss,const D3D11_BOX*b,UINT flags) {
  Guard g; Context<N>::region1(c,d,ds,x,y,z,s,ss,b,flags);
  if(running && !internal && !ds && !ss && !x && !y && !z && (!b || (origin(b)&&b->right==fh6::width&&b->bottom==fh6::height&&b->back==1))){try{propagate(d,s);}catch(...){}}
}
template<int N> HRESULT STDMETHODCALLTYPE map(ID3D11DeviceContext*c,ID3D11Resource*r,UINT s,D3D11_MAP a,UINT f,D3D11_MAPPED_SUBRESOURCE*out) {
  Guard g; auto hr=Context<N>::map(c,r,s,a,f,out);
  if(running && !internal && SUCCEEDED(hr) && s==0 && a!=D3D11_MAP_READ) {try{auto t=texture(r);if(t){std::lock_guard lock(resources);mapped.push_back({c,t,*out});}}catch(...){}}
  return hr;
}
template<int N> void STDMETHODCALLTYPE unmap(ID3D11DeviceContext*c,ID3D11Resource*r,UINT s) {
  Guard g;
  if(running && !internal && s==0) {try{
    D3D11_MAPPED_SUBRESOURCE data{};
    {std::lock_guard lock(resources);auto m=std::find_if(mapped.begin(),mapped.end(),[&](auto &v){return v.context==c && v.texture.Get()==r;});if(m!=mapped.end()){data=m->data;mapped.erase(m);}}
    if(data.pData) inspect(r,data.pData,data.RowPitch);
  }catch(...){}}
  Context<N>::unmap(c,r,s);
}
template<int N> void STDMETHODCALLTYPE copy(ID3D11DeviceContext*c,ID3D11Resource*d,ID3D11Resource*s) {
  Guard g; Context<N>::copy(c,d,s); if(running && !internal){try{propagate(d,s);}catch(...){}}
}
template<int N> void STDMETHODCALLTYPE region(ID3D11DeviceContext*c,ID3D11Resource*d,UINT ds,UINT x,UINT y,UINT z,ID3D11Resource*s,UINT ss,const D3D11_BOX*b) {
  Guard g; Context<N>::region(c,d,ds,x,y,z,s,ss,b);
  if(running && !internal && !ds && !ss && !x && !y && !z && (!b || (origin(b)&&b->right==fh6::width&&b->bottom==fh6::height&&b->back==1))){try{propagate(d,s);}catch(...){}}
}
void paint(IDXGISwapChain *swap) {
  std::shared_ptr<std::vector<uint8_t>> frame;uint64_t current=0;
  {std::lock_guard lock(frames);if(latest && GetTickCount64()-received<2000){frame=latest;current=serial;}}
  ComPtr<ID3D11Device> dev;if(FAILED(swap->GetDevice(IID_PPV_ARGS(&dev))))return;
  ComPtr<ID3D11DeviceContext> ctx;dev->GetImmediateContext(&ctx);
  std::lock_guard lock(resources);
  struct InternalGuard{InternalGuard(){internal=true;}~InternalGuard(){internal=false;}} guard;
  static const std::vector<uint8_t> clearPixels(fh6::pixels_size,0);
  static std::vector<uint8_t> rgbaPixels(fh6::pixels_size);
  bool converted=false;
  for(auto &k:known){
    if(k.serial==current || !(k.desc.BindFlags&D3D11_BIND_SHADER_RESOURCE) || (k.desc.Usage!=D3D11_USAGE_DEFAULT && k.desc.Usage!=D3D11_USAGE_DYNAMIC))continue;
    ComPtr<ID3D11Device> owner;k.texture->GetDevice(&owner);if(owner.Get()!=dev.Get())continue;
    // frame holds shared ownership while the receiver publishes the next frame.
    // BGRA can be uploaded directly; convert once if this batch has RGBA targets.
    const uint8_t *pixels=frame?frame->data()+24:clearPixels.data();
    if(frame&&(k.desc.Format==DXGI_FORMAT_R8G8B8A8_UNORM || k.desc.Format==DXGI_FORMAT_R8G8B8A8_UNORM_SRGB || k.desc.Format==DXGI_FORMAT_R8G8B8A8_TYPELESS)){
      if(!converted){for(size_t i=0;i<rgbaPixels.size();i+=4){rgbaPixels[i]=pixels[i+2];rgbaPixels[i+1]=pixels[i+1];rgbaPixels[i+2]=pixels[i];rgbaPixels[i+3]=pixels[i+3];}converted=true;}
      pixels=rgbaPixels.data();
    }
    if(k.desc.Usage==D3D11_USAGE_DYNAMIC){D3D11_MAPPED_SUBRESOURCE m;if(FAILED(ctx->Map(k.texture.Get(),0,D3D11_MAP_WRITE_DISCARD,0,&m)))continue;for(UINT y=0;y<fh6::height;++y)std::memcpy(static_cast<uint8_t*>(m.pData)+size_t(y)*m.RowPitch,pixels+size_t(y)*fh6::stride,fh6::stride);ctx->Unmap(k.texture.Get(),0);}
    else ctx->UpdateSubresource(k.texture.Get(),0,nullptr,pixels,fh6::stride,0);
    k.serial=current;++uploaded;
  }
}
void on_present(IDXGISwapChain*s){
  if(!running||internal)return;
  try{
    paint(s);unsigned targets=0;{std::lock_guard lock(resources);for(auto &k:known)if(k.desc.BindFlags&D3D11_BIND_SHADER_RESOURCE)++targets;}
    if(gameLog && ++presentCount%1800==1){char line[240];std::snprintf(line,sizeof(line),"FH6 0.4: presents=%u candidates=%u update1=%u targets=%u uploaded=%u",presentCount.load(),candidateCount.load(),updateCount.load(),targets,uploaded.load());gameLog(SCS_LOG_TYPE_message,line);}
  }catch(...){}
}
HRESULT STDMETHODCALLTYPE present(IDXGISwapChain*s,UINT a,UINT b){Guard g;PresentGuard pg;if(!pg.nested&&!(b&DXGI_PRESENT_TEST))on_present(s);return originalPresent(s,a,b);}
HRESULT STDMETHODCALLTYPE present1(IDXGISwapChain1*s,UINT a,UINT b,const DXGI_PRESENT_PARAMETERS*p){Guard g;PresentGuard pg;if(!pg.nested&&!(b&DXGI_PRESENT_TEST))on_present(s);return originalPresent1(s,a,b,p);}
bool read_exact(HANDLE pipe,void*p,DWORD n){DWORD at=0,count;while(running&&at<n){if(!ReadFile(pipe,static_cast<char*>(p)+at,n-at,&count,nullptr)||!count)return false;at+=count;}return at==n;}
void receive(){
  struct Done{~Done(){receiverDone=true;}}done;
  while(running){
    HANDLE pipe=CreateNamedPipeW(pipeName.c_str(),PIPE_ACCESS_DUPLEX|FILE_FLAG_FIRST_PIPE_INSTANCE,PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,1,64,UINT(fh6::pixels_size+24),0,nullptr);
    if(pipe==INVALID_HANDLE_VALUE)return;
    if(ConnectNamedPipe(pipe,nullptr)||GetLastError()==ERROR_PIPE_CONNECTED){while(running){
      auto f=std::make_shared<std::vector<uint8_t>>(fh6::pixels_size+24);
      if(!read_exact(pipe,f->data(),24) || std::memcmp(f->data(),"FH6F",4) || fh6::read32(f->data()+4)!=2 || fh6::read32(f->data()+8)!=fh6::width || fh6::read32(f->data()+12)!=fh6::height || fh6::read32(f->data()+16)!=fh6::stride)break;
      if(!read_exact(pipe,f->data()+24,UINT(fh6::pixels_size)))break;
      {std::lock_guard lock(frames);latest=f;received=GetTickCount64();++serial;}
      unsigned count=0;{std::lock_guard lock(resources);for(auto &k:known)if(k.desc.BindFlags&D3D11_BIND_SHADER_RESOURCE)++count;}
      uint32_t ack[3]={fh6::read32(f->data()+20),count,uploaded.load()};DWORD written;if(!WriteFile(pipe,ack,sizeof(ack),&written,nullptr)||written!=sizeof(ack))break;
    }}
    DisconnectNamedPipe(pipe);CloseHandle(pipe);
    {std::lock_guard lock(frames);latest.reset();}
  }
}
bool hook(void*address,void*replacement,void**original){if(std::find(hooks.begin(),hooks.end(),address)!=hooks.end())return true;if(MH_CreateHook(address,replacement,original)!=MH_OK)return false;hooks.push_back(address);return true;}
template<int N> bool hook_context(ID3D11DeviceContext *c){auto v=*reinterpret_cast<void***>(c);
  bool ok=hook(v[14],reinterpret_cast<void*>(map<N>),reinterpret_cast<void**>(&Context<N>::map)) && hook(v[15],reinterpret_cast<void*>(unmap<N>),reinterpret_cast<void**>(&Context<N>::unmap)) && hook(v[46],reinterpret_cast<void*>(region<N>),reinterpret_cast<void**>(&Context<N>::region)) && hook(v[47],reinterpret_cast<void*>(copy<N>),reinterpret_cast<void**>(&Context<N>::copy)) && hook(v[48],reinterpret_cast<void*>(update<N>),reinterpret_cast<void**>(&Context<N>::update));
  ComPtr<ID3D11DeviceContext1> c1;if(ok && SUCCEEDED(c->QueryInterface(IID_PPV_ARGS(&c1)))){auto v1=*reinterpret_cast<void***>(c1.Get());ok=hook(v1[115],reinterpret_cast<void*>(region1<N>),reinterpret_cast<void**>(&Context<N>::region1))&&hook(v1[116],reinterpret_cast<void*>(update1<N>),reinterpret_cast<void**>(&Context<N>::update1));}return ok;
}
void stop(){running=false;for(auto h:hooks)MH_DisableHook(h);while(calls.load())Sleep(1);ets2helper::stop();if(receiver.joinable()){while(!receiverDone){CancelSynchronousIo(receiver.native_handle());auto p=CreateFileW(pipeName.c_str(),GENERIC_READ|GENERIC_WRITE,0,nullptr,OPEN_EXISTING,0,nullptr);if(p!=INVALID_HANDLE_VALUE)CloseHandle(p);Sleep(10);}receiver.join();}for(auto h:hooks)MH_RemoveHook(h);hooks.clear();MH_Uninitialize();known.clear();mapped.clear();latest.reset();gameLog=nullptr;}
bool start(){
  if(running)return true;
  wchar_t exe[MAX_PATH]{};GetModuleFileNameW(nullptr,exe,MAX_PATH);auto name=wcsrchr(exe,L'\\');testProcess=name && !_wcsicmp(name+1,L"standalone_probe.exe");
  if(testProcess)pipeName=L"\\\\.\\pipe\\FH6CarPlay-test";
  WNDCLASSW wc{};wc.lpfnWndProc=DefWindowProcW;wc.hInstance=GetModuleHandleW(nullptr);wc.lpszClassName=L"FH6HookBootstrap";RegisterClassW(&wc);
  auto window=CreateWindowW(wc.lpszClassName,L"",WS_OVERLAPPED,0,0,64,64,nullptr,nullptr,wc.hInstance,nullptr);
  DXGI_SWAP_CHAIN_DESC d{};d.BufferDesc.Width=64;d.BufferDesc.Height=64;d.BufferDesc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;d.SampleDesc.Count=1;d.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;d.BufferCount=1;d.OutputWindow=window;d.Windowed=TRUE;
  ComPtr<ID3D11Device> dev;ComPtr<ID3D11DeviceContext> ctx,deferred;ComPtr<IDXGISwapChain> swap;
  auto hr=D3D11CreateDeviceAndSwapChain(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,0,nullptr,0,D3D11_SDK_VERSION,&d,&swap,&dev,nullptr,&ctx);
  if(FAILED(hr)){DestroyWindow(window);return false;}
  bool ok=MH_Initialize()==MH_OK;
  if(ok){auto dv=*reinterpret_cast<void***>(dev.Get());auto sv=*reinterpret_cast<void***>(swap.Get());ok=hook(dv[5],reinterpret_cast<void*>(create),reinterpret_cast<void**>(&originalCreate)) && hook(sv[8],reinterpret_cast<void*>(present),reinterpret_cast<void**>(&originalPresent)) && hook_context<0>(ctx.Get());}
  if(ok){ComPtr<IDXGISwapChain1>s1;if(SUCCEEDED(swap.As(&s1))){auto sv=*reinterpret_cast<void***>(s1.Get());ok=hook(sv[22],reinterpret_cast<void*>(present1),reinterpret_cast<void**>(&originalPresent1));}}
  if(ok && SUCCEEDED(dev->CreateDeferredContext(0,&deferred)))ok=hook_context<1>(deferred.Get());
  if(ok){running=true;for(auto h:hooks)if(MH_EnableHook(h)!=MH_OK)ok=false;}
  if(ok){try{receiverDone=false;receiver=std::thread(receive);}catch(...){receiverDone=true;ok=false;}}
  swap.Reset();deferred.Reset();ctx.Reset();dev.Reset();DestroyWindow(window);
  if(!ok)stop();return ok;
}
}
SCSAPI_RESULT scs_telemetry_init(const scs_u32_t version,const scs_telemetry_init_params_t *const params){
  if(version!=SCS_TELEMETRY_VERSION_1_00 && version!=SCS_TELEMETRY_VERSION_1_01)return SCS_RESULT_unsupported;
  if(params)gameLog=static_cast<const scs_telemetry_init_params_v100_t*>(params)->common.log;
  try{bool ok=start();if(ok&&!testProcess)ets2helper::start();if(gameLog)gameLog(ok?SCS_LOG_TYPE_message:SCS_LOG_TYPE_error,ok?"ETS2CarPlay 0.7.0: browser video bridge ready.":"ETS2CarPlay 0.7.0: initialization failed");return ok?SCS_RESULT_ok:SCS_RESULT_generic_error;}catch(...){stop();return SCS_RESULT_generic_error;}
}
SCSAPI_VOID scs_telemetry_shutdown(){stop();}
