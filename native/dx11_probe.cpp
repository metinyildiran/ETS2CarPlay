#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <Windows.h>
#include <d3d11.h>
#include <d3d11_1.h>
#include <wrl/client.h>
#include <vector>
#include <cstdio>
#include "protocol.hpp"
#pragma comment(lib,"d3d11.lib")
#pragma comment(lib,"user32.lib")
using Microsoft::WRL::ComPtr;
static bool check(HRESULT hr,const char *where) { if (FAILED(hr)) { std::printf("%s failed %08lx\n",where,hr); return false; } return true; }
static int reloadProbe(ID3D11Device* device,ID3D11DeviceContext* ctx,IDXGISwapChain* swap) {
  HANDLE pipe=INVALID_HANDLE_VALUE;
  for(int i=0;i<300&&pipe==INVALID_HANDLE_VALUE;++i){pipe=CreateFileW(L"\\\\.\\pipe\\FH6CarPlay-test",GENERIC_READ|GENERIC_WRITE,0,nullptr,OPEN_EXISTING,0,nullptr);if(pipe==INVALID_HANDLE_VALUE)Sleep(10);}
  if(pipe==INVALID_HANDLE_VALUE)return 2;
  std::vector<uint8_t> frame(fh6::pixels_size+24),marker(fh6::pixels_size,0);
  std::memcpy(frame.data(),"FH6F",4);uint32_t header[5]={2,fh6::width,fh6::height,fh6::stride,1};std::memcpy(frame.data()+4,header,sizeof(header));
  for(size_t i=24;i<frame.size();i+=4){frame[i]=31;frame[i+1]=67;frame[i+2]=193;frame[i+3]=255;}
  for(size_t i=0;i<sizeof(fh6::marker);++i){marker[i*4]=marker[i*4+1]=marker[i*4+2]=fh6::marker[i];marker[i*4+3]=255;}
  auto send=[&](){DWORD n=0;uint32_t ack[3];return WriteFile(pipe,frame.data(),DWORD(frame.size()),&n,nullptr)&&n==frame.size()&&ReadFile(pipe,ack,sizeof(ack),&n,nullptr)&&n==sizeof(ack)&&ack[1]<=32;};
  D3D11_TEXTURE2D_DESC td{};td.Width=fh6::width;td.Height=fh6::height;td.MipLevels=td.ArraySize=td.SampleDesc.Count=1;td.Format=DXGI_FORMAT_B8G8R8A8_UNORM;td.Usage=D3D11_USAGE_DEFAULT;td.BindFlags=D3D11_BIND_SHADER_RESOURCE;
  auto rd=td;rd.Usage=D3D11_USAGE_STAGING;rd.BindFlags=0;rd.CPUAccessFlags=D3D11_CPU_ACCESS_READ;
  ComPtr<ID3D11Texture2D> readback,previous;
  if(FAILED(device->CreateTexture2D(&rd,nullptr,&readback)))return 2;
  auto verify=[&](ID3D11Texture2D* texture,bool playing){ctx->CopyResource(readback.Get(),texture);D3D11_MAPPED_SUBRESOURCE m{};if(FAILED(ctx->Map(readback.Get(),0,D3D11_MAP_READ,0,&m)))return false;auto p=static_cast<uint8_t*>(m.pData);bool ok=playing?p[0]==31&&p[1]==67&&p[2]==193&&p[3]==255:p[0]==0&&p[1]==0&&p[2]==0&&p[3]==0;ctx->Unmap(readback.Get(),0);return ok;};
  D3D11_SUBRESOURCE_DATA data{marker.data(),fh6::stride,UINT(marker.size())};
  int failures=0;
  for(int i=0;i<64;++i){
    if(!send())return 2;
    ComPtr<ID3D11Texture2D> current;
    if(FAILED(device->CreateTexture2D(&td,&data,&current)))return 2;
    swap->Present(0,0);if(!verify(current.Get(),true))++failures;
    if(previous&&!verify(previous.Get(),true))++failures;
    // Reload into the SAME texture without receiving a new frame. A cached
    // serial must not leave the DDS marker or an old truck image on screen.
    ctx->UpdateSubresource(current.Get(),0,nullptr,marker.data(),fh6::stride,0);
    swap->Present(0,0);if(!verify(current.Get(),true))++failures;
    if(i%8==0){ctx->ClearState();if(FAILED(swap->ResizeBuffers(0,64+UINT(i),64,DXGI_FORMAT_UNKNOWN,0)))return 2;swap->Present(0,0);if(!verify(current.Get(),true))++failures;}
    previous=current;
  }
  // Disconnect while a cab is loaded, then open another cab after the timeout.
  CloseHandle(pipe);Sleep(2200);swap->Present(0,0);if(!verify(previous.Get(),false))++failures;
  ctx->UpdateSubresource(previous.Get(),0,nullptr,marker.data(),fh6::stride,0);swap->Present(0,0);if(!verify(previous.Get(),false))++failures;
  ComPtr<ID3D11Texture2D> idle;if(FAILED(device->CreateTexture2D(&td,&data,&idle)))return 2;swap->Present(0,0);if(!verify(idle.Get(),false))++failures;
  std::printf("reload cycles=64 overlapping-cabs=64 resize=8 navigation-return=1 failures=%d\n",failures);
  return failures?1:0;
}
int main(int argc,char **argv) {
  bool stream=false,single=false,noUi=false,reload=false;
  for(int i=1;i<argc;++i){if(!strcmp(argv[i],"--stream"))stream=true;if(!strcmp(argv[i],"--single"))single=true;if(!strcmp(argv[i],"--no-ui"))noUi=true;}
  for(int i=1;i<argc;++i)if(!strcmp(argv[i],"--reload"))reload=true;

#ifndef FH6_STANDALONE
  (void)argc;
#endif
  // Separate hidden test process. No game attachment or foreground window.
  wchar_t path[MAX_PATH]; GetModuleFileNameW(nullptr,path,MAX_PATH);
  auto slash = wcsrchr(path,L'\\'); if (!slash) return 2;
#ifdef FH6_STANDALONE
  wcscpy_s(slash+1,MAX_PATH-size_t(slash+1-path),L"FH6Standalone.dll");
  auto plugin=LoadLibraryW(path);if(!plugin)return 2;
  auto init=reinterpret_cast<int(*)(unsigned,const void*)>(GetProcAddress(plugin,"scs_telemetry_init"));
  auto shutdown=reinterpret_cast<void(*)()>(GetProcAddress(plugin,"scs_telemetry_shutdown"));
  if(!init || !shutdown || init(0x10001,nullptr)!=0){std::printf("Plugin init failed\n");return 2;}
#else
  wcscpy_s(slash+1,MAX_PATH-size_t(slash+1-path),L"dxgi.dll");
  if (!LoadLibraryW(path)) { std::printf("ReShade load failed %lu\n",GetLastError()); return 2; }
#endif
  WNDCLASSW wc{}; wc.lpfnWndProc=DefWindowProcW; wc.hInstance=GetModuleHandleW(nullptr); wc.lpszClassName=L"FH6HiddenProbe";
  RegisterClassW(&wc);
  HWND window=CreateWindowW(wc.lpszClassName,L"FH6 isolated DX11 test",WS_OVERLAPPED,0,0,64,64,nullptr,nullptr,wc.hInstance,nullptr);
  if(noUi)SetWindowPos(window,nullptr,0,0,820,560,SWP_NOZORDER|SWP_NOACTIVATE);
  DXGI_SWAP_CHAIN_DESC sd{}; sd.BufferDesc.Width=64; sd.BufferDesc.Height=64; sd.BufferDesc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;
  sd.SampleDesc.Count=1; sd.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT; sd.BufferCount=1; sd.OutputWindow=window; sd.Windowed=TRUE;
  if(noUi){sd.BufferDesc.Width=800;sd.BufferDesc.Height=520;}
  ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> ctx; ComPtr<IDXGISwapChain> swap;
  if (!check(D3D11CreateDeviceAndSwapChain(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,single?D3D11_CREATE_DEVICE_SINGLETHREADED:0,nullptr,0,D3D11_SDK_VERSION,&sd,&swap,&device,nullptr,&ctx),"device")) return 2;
  if(noUi){
    ComPtr<ID3D11Texture2D> back,read;ComPtr<ID3D11RenderTargetView>view;
    swap->GetBuffer(0,IID_PPV_ARGS(&back));device->CreateRenderTargetView(back.Get(),nullptr,&view);
    const float black[4]={0,0,0,1};
    for(int i=0;i<3;++i){ctx->ClearRenderTargetView(view.Get(),black);swap->Present(0,0);}
    D3D11_TEXTURE2D_DESC d;back->GetDesc(&d);d.Usage=D3D11_USAGE_STAGING;d.BindFlags=0;d.CPUAccessFlags=D3D11_CPU_ACCESS_READ;
    if(FAILED(device->CreateTexture2D(&d,nullptr,&read)))return 2;ctx->CopyResource(read.Get(),back.Get());D3D11_MAPPED_SUBRESOURCE m{};
    if(FAILED(ctx->Map(read.Get(),0,D3D11_MAP_READ,0,&m)))return 2;
    unsigned nonblack=0;std::vector<unsigned char> pixels(size_t(d.Width)*d.Height*4);
    for(UINT y=0;y<d.Height;++y)for(UINT x=0;x<d.Width;++x){auto p=static_cast<unsigned char*>(m.pData)+size_t(y)*m.RowPitch+x*4;auto q=pixels.data()+(size_t(y)*d.Width+x)*4;q[0]=p[2];q[1]=p[1];q[2]=p[0];q[3]=255;if(p[0]||p[1]||p[2])++nonblack;}
    ctx->Unmap(read.Get(),0);BITMAPFILEHEADER f{};f.bfType=0x4d42;f.bfOffBits=sizeof(f)+sizeof(BITMAPINFOHEADER);f.bfSize=f.bfOffBits+DWORD(pixels.size());BITMAPINFOHEADER b{};b.biSize=sizeof(b);b.biWidth=LONG(d.Width);b.biHeight=-LONG(d.Height);b.biPlanes=1;b.biBitCount=32;
    FILE*file=nullptr;fopen_s(&file,"no-ui-test.bmp","wb");if(file){fwrite(&f,sizeof(f),1,file);fwrite(&b,sizeof(b),1,file);fwrite(pixels.data(),pixels.size(),1,file);fclose(file);}
    std::printf("overlay pixels=%u\n",nonblack);if(nonblack!=0)return 3;
  }
  D3D11_TEXTURE2D_DESC td{}; td.Width=fh6::width; td.Height=fh6::height; td.MipLevels=1; td.ArraySize=1;
  td.Format=DXGI_FORMAT_B8G8R8A8_UNORM; td.SampleDesc.Count=1; td.Usage=D3D11_USAGE_DEFAULT; td.BindFlags=D3D11_BIND_SHADER_RESOURCE;
  std::vector<uint8_t> pixels(fh6::pixels_size,12);
  for (size_t i=0;i<pixels.size();i+=4) pixels[i+3]=255;
  for (size_t i=0;i<sizeof(fh6::marker);++i) pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=fh6::marker[i];
  D3D11_SUBRESOURCE_DATA data{pixels.data(),fh6::stride,UINT(fh6::pixels_size)};
  int failures=0;
  if(reload)failures+=reloadProbe(device.Get(),ctx.Get(),swap.Get());
  for (int route=0;route<5;++route) {
    pixels[0]=fh6::marker[0];
    ComPtr<ID3D11Texture2D> texture,upload,readback;
    if (!check(device->CreateTexture2D(&td,route==0?&data:nullptr,&texture),"texture")) return 2;
    if (route==1 || route==3) {
      if (route==3) pixels[0]++; // Same size, invalid signature must remain untouched.
      ctx->UpdateSubresource(texture.Get(),0,nullptr,pixels.data(),fh6::stride,0);
    }
    if (route==2) {
      auto ud=td; ud.Usage=D3D11_USAGE_STAGING; ud.BindFlags=0; ud.CPUAccessFlags=D3D11_CPU_ACCESS_WRITE;
      if (!check(device->CreateTexture2D(&ud,nullptr,&upload),"upload")) return 2;
      D3D11_MAPPED_SUBRESOURCE map{};
      if (!check(ctx->Map(upload.Get(),0,D3D11_MAP_WRITE,0,&map),"map")) return 2;
      for (UINT y=0;y<fh6::height;++y) std::memcpy(static_cast<uint8_t*>(map.pData)+size_t(y)*map.RowPitch,pixels.data()+size_t(y)*fh6::stride,fh6::stride);
      ctx->Unmap(upload.Get(),0);
      ctx->CopyResource(texture.Get(),upload.Get());
    }
    if(route==4){ComPtr<ID3D11DeviceContext1> c1;if(FAILED(ctx.As(&c1)))return 2;c1->UpdateSubresource1(texture.Get(),0,nullptr,pixels.data(),fh6::stride,0,0);}
    swap->Present(0,0);
    auto rd=td; rd.Usage=D3D11_USAGE_STAGING; rd.BindFlags=0; rd.CPUAccessFlags=D3D11_CPU_ACCESS_READ;
    if (!check(device->CreateTexture2D(&rd,nullptr,&readback),"readback")) return 2;
#ifdef FH6_STANDALONE
    if(route==0 && stream){
      bool sawVideo=false,sawNavigation=false;unsigned visibleFrames=0;
      for(int i=0;i<1400;++i){
        swap->Present(0,0);ctx->CopyResource(readback.Get(),texture.Get());
        D3D11_MAPPED_SUBRESOURCE streamMap{};
        if(SUCCEEDED(ctx->Map(readback.Get(),0,D3D11_MAP_READ,0,&streamMap))){
          auto alpha=static_cast<uint8_t*>(streamMap.pData)[3];
          if(alpha==255){sawVideo=true;++visibleFrames;}else if(alpha==0&&sawVideo)sawNavigation=true;
          ctx->Unmap(readback.Get(),0);
        }
        Sleep(10);
      }
      std::printf("stream video=%d navigation-return=%d opaque-observations=%u\n",sawVideo,sawNavigation,visibleFrames);
      if(!sawVideo||!sawNavigation)++failures;
    }
#endif
    ctx->CopyResource(readback.Get(),texture.Get());
    D3D11_MAPPED_SUBRESOURCE map{};
    if (!check(ctx->Map(readback.Get(),0,D3D11_MAP_READ,0,&map),"read")) return 2;
    auto p=static_cast<uint8_t*>(map.pData);
    bool pass=route==3 ? p[0]==pixels[0] : p[0]==0 && p[1]==0 && p[2]==0 &&
#ifdef FH6_STANDALONE
      p[3]==0;
#else
      p[3]==255;
#endif
    std::printf("route %d (%s): %s first=%u,%u,%u,%u\n",route,route==0?"initial":route==1?"late-update":route==2?"staging-map-copy":route==3?"unrelated":"update-subresource-1",pass?"PASS":"FAIL",p[0],p[1],p[2],p[3]);
    failures+=!pass;
    ctx->Unmap(readback.Get(),0);
  }
  ctx->ClearState(); ctx->Flush();
  swap.Reset(); ctx.Reset(); device.Reset(); DestroyWindow(window);
#ifdef FH6_STANDALONE
  shutdown();FreeLibrary(plugin);
#endif
  return failures?1:0;
}
