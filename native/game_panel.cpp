#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#define DIRECTINPUT_VERSION 0x0800
#include <Windows.h>
#include <d3d11.h>
#include <dinput.h>
#include <wrl/client.h>
#include <MinHook.h>
#include <imgui.h>
#include <backends/imgui_impl_dx11.h>
#include <atomic>
#include <mutex>
#include <thread>
#include <deque>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>
#include "game_panel.hpp"
#pragma comment(lib,"dinput8.lib")
#pragma comment(lib,"dxguid.lib")
#pragma comment(lib,"d3dcompiler.lib")
using Microsoft::WRL::ComPtr;
namespace fh6panel { namespace {
std::atomic<bool> alive{false},done{true},open{false},connected{false};
std::atomic<unsigned> inputCalls{0};
std::thread worker;
std::mutex commandsMutex,statusMutex,charactersMutex;
std::deque<std::string> commands;
std::vector<unsigned> characters;
std::string status="YouTube motoru baslatiliyor...";
std::vector<std::string> audioLabels;
std::string audioVideo;
int selectedAudio=-1;
std::string captionVideo;
bool captionsAvailable=false,captionsEnabled=false;
void receive_status(const std::string &line){
  std::lock_guard lock(statusMutex);
  if(line.rfind("@captions\t",0)==0){std::istringstream stream(line.substr(10));std::string video,available,enabled;if(std::getline(stream,video,'\t')&&std::getline(stream,available,'\t')&&std::getline(stream,enabled,'\t')){captionVideo=video;captionsAvailable=available=="1";captionsEnabled=enabled=="1";}return;}
  if(line.rfind("@audio\t",0)!=0){status=line;return;}
  std::istringstream stream(line.substr(7));std::string video,selected,label;
  if(!std::getline(stream,video,'\t')||!std::getline(stream,selected,'\t'))return;
  int index=-1;try{index=std::stoi(selected);}catch(...){return;}
  std::vector<std::string> labels;while(std::getline(stream,label,'\t')&&labels.size()<64)labels.push_back(label);
  audioVideo=video;audioLabels=std::move(labels);selectedAudio=index>=0&&size_t(index)<audioLabels.size()?index:-1;
}
const wchar_t *controlPipe=L"\\\\.\\pipe\\FH6CarPlay-control-v4";
HWND window=nullptr;WNDPROC previousProc=nullptr;
ImGuiContext *gui=nullptr;
ComPtr<ID3D11Device> device;ComPtr<ID3D11DeviceContext> context;
std::vector<void*> inputHooks;
HANDLE helper=nullptr;
RECT previousClip{};
bool inputReady=false;
bool testMode=false;
using State=HRESULT(STDMETHODCALLTYPE*)(IDirectInputDevice8W*,DWORD,LPVOID);
using Data=HRESULT(STDMETHODCALLTYPE*)(IDirectInputDevice8W*,DWORD,LPDIDEVICEOBJECTDATA,LPDWORD,DWORD);
using Warp=BOOL(WINAPI*)(int,int);
using Clip=BOOL(WINAPI*)(const RECT*);
template<int N>struct Input{static inline State state;static inline Data data;};
Warp warpOriginal=nullptr;Clip clipOriginal=nullptr;
struct InputGuard{InputGuard(){++inputCalls;}~InputGuard(){--inputCalls;}};
bool capturing(){return open && window && GetForegroundWindow()==window;}
bool is_keyboard_or_mouse(IDirectInputDevice8W *d){DIDEVICEINSTANCEW info{};info.dwSize=sizeof(info);if(FAILED(d->GetDeviceInfo(&info)))return false;auto type=GET_DIDEVICE_TYPE(info.dwDevType);return type==DI8DEVTYPE_KEYBOARD||type==DI8DEVTYPE_MOUSE;}
template<int N>HRESULT STDMETHODCALLTYPE input_state(IDirectInputDevice8W*d,DWORD size,LPVOID buffer){InputGuard g;auto hr=Input<N>::state(d,size,buffer);if(SUCCEEDED(hr)&&buffer&&capturing()&&is_keyboard_or_mouse(d))ZeroMemory(buffer,size);return hr;}
template<int N>HRESULT STDMETHODCALLTYPE input_data(IDirectInputDevice8W*d,DWORD size,LPDIDEVICEOBJECTDATA data,LPDWORD count,DWORD flags){InputGuard g;auto hr=Input<N>::data(d,size,data,count,flags);if(SUCCEEDED(hr)&&count&&capturing()&&is_keyboard_or_mouse(d))*count=0;return hr;}
BOOL WINAPI warp(int x,int y){InputGuard g;return capturing()?TRUE:warpOriginal(x,y);}
BOOL WINAPI clip(const RECT*r){InputGuard g;return capturing()?TRUE:clipOriginal(r);}
LRESULT CALLBACK wndproc(HWND w,UINT m,WPARAM a,LPARAM b){
  InputGuard g;
  if(capturing()){
    if(m==WM_CHAR){std::lock_guard lock(charactersMutex);if(characters.size()<256)characters.push_back(unsigned(a));return 0;}
    if(m==WM_INPUT){return DefWindowProcW(w,m,a,b);}
    if((m>=WM_KEYFIRST&&m<=WM_KEYLAST)||(m>=WM_MOUSEFIRST&&m<=WM_MOUSELAST))return 0;
  }
  return CallWindowProcW(previousProc,w,m,a,b);
}
bool add_hook(void*address,void*replacement,void**original){
  if(std::find(inputHooks.begin(),inputHooks.end(),address)!=inputHooks.end())return true;
  if(MH_CreateHook(address,replacement,original)!=MH_OK)return false;
  inputHooks.push_back(address);return MH_EnableHook(address)==MH_OK;
}
template<int N>bool input_device(IDirectInput8W *di,const GUID &id){ComPtr<IDirectInputDevice8W>d;if(FAILED(di->CreateDevice(id,&d,nullptr)))return false;auto v=*reinterpret_cast<void***>(d.Get());return add_hook(v[9],reinterpret_cast<void*>(input_state<N>),reinterpret_cast<void**>(&Input<N>::state))&&add_hook(v[10],reinterpret_cast<void*>(input_data<N>),reinterpret_cast<void**>(&Input<N>::data));}
void set_open(bool value){
  if(value&&!inputReady)return;
  if(value==open)return;
  if(testMode){open=value;return;}
  if(value){GetClipCursor(&previousClip);open=true;clipOriginal(nullptr);}
  else {open=false;if(clipOriginal)clipOriginal(&previousClip);}
}
void send(std::string message){
  // Every command is one bounded line. Clipboard text cannot introduce commands.
  if(message.size()>2200||message.find_first_of("\r\n")!=std::string::npos)return;
  std::lock_guard lock(commandsMutex);if(commands.size()<32)commands.push_back(std::move(message)+'\n');
}
std::string clipboard(){
  std::string result;if(!OpenClipboard(window))return result;
  HANDLE data=GetClipboardData(CF_UNICODETEXT);
  if(data){auto length=GlobalSize(data)/sizeof(wchar_t);auto text=static_cast<const wchar_t*>(GlobalLock(data));if(text&&length){size_t n=wcsnlen_s(text,(std::min)(length,size_t(2048)));int bytes=WideCharToMultiByte(CP_UTF8,0,text,int(n),nullptr,0,nullptr,nullptr);if(bytes>0&&bytes<2048){result.resize(bytes);WideCharToMultiByte(CP_UTF8,0,text,int(n),result.data(),bytes,nullptr,nullptr);} }if(text)GlobalUnlock(data);}
  CloseClipboard();result.erase(std::remove_if(result.begin(),result.end(),[](char c){return static_cast<unsigned char>(c)<32;}),result.end());return result;
}
void launch_helper(){
  wchar_t modulePath[32768]{};HMODULE module=nullptr;
  if(!GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&launch_helper),&module))return;
  GetModuleFileNameW(module,modulePath,32768);auto slash=wcsrchr(modulePath,L'\\');if(!slash)return;*(slash+1)=0;
  std::wstring config=std::wstring(modulePath)+L"FH6Player.ini";wchar_t executable[32768]{};
  GetPrivateProfileStringW(L"Player",L"Executable",L"",executable,32768,config.c_str());
  if(!*executable||GetFileAttributesW(executable)==INVALID_FILE_ATTRIBUTES){std::lock_guard lock(statusMutex);status="FH6Player.ini veya YouTube motoru bulunamadi.";return;}
  std::wstring command=L"\""+std::wstring(executable)+L"\" --embedded --owner-pid="+std::to_wstring(GetCurrentProcessId());
  STARTUPINFOW si{};si.cb=sizeof(si);si.dwFlags=STARTF_USESHOWWINDOW;si.wShowWindow=SW_HIDE;PROCESS_INFORMATION pi{};
  if(CreateProcessW(executable,command.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW,nullptr,nullptr,&si,&pi)){helper=pi.hProcess;CloseHandle(pi.hThread);}else{std::lock_guard lock(statusMutex);status="YouTube motoru baslatilamadi.";}
}
void receive_control(){
  struct Finish{~Finish(){done=true;}}finish;
  // Create the endpoint before launching the child to avoid a startup race.
  bool launched=false;
  while(alive){
    HANDLE pipe=CreateNamedPipeW(controlPipe,PIPE_ACCESS_DUPLEX|FILE_FLAG_FIRST_PIPE_INSTANCE,PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,1,8192,8192,0,nullptr);
    if(pipe==INVALID_HANDLE_VALUE)return;
    if(!launched){if(!testMode)launch_helper();launched=true;}
    if(ConnectNamedPipe(pipe,nullptr)||GetLastError()==ERROR_PIPE_CONNECTED){
      connected=true;std::string incoming;
      while(alive){
        DWORD available=0;if(!PeekNamedPipe(pipe,nullptr,0,nullptr,&available,nullptr))break;
        if(available){char bytes[2048];DWORD read=0;if(!ReadFile(pipe,bytes,(std::min)(available,DWORD(sizeof(bytes))),&read,nullptr)||!read)break;incoming.append(bytes,read);if(incoming.size()>16384)break;size_t end;while((end=incoming.find('\n'))!=std::string::npos){receive_status(incoming.substr(0,end));incoming.erase(0,end+1);}}
        std::string command;{std::lock_guard lock(commandsMutex);if(!commands.empty()){command=std::move(commands.front());commands.pop_front();}}
        if(!command.empty()){DWORD written;if(!WriteFile(pipe,command.data(),DWORD(command.size()),&written,nullptr)||written!=command.size())break;}
        Sleep(16);
      }
      connected=false;
    }
    DisconnectNamedPipe(pipe);CloseHandle(pipe);
  }
}
void inputs(){
  auto &io=ImGui::GetIO();POINT cursor{};GetCursorPos(&cursor);ScreenToClient(window,&cursor);io.AddMousePosEvent(float(cursor.x),float(cursor.y));
  for(int i=0;i<3;++i)io.AddMouseButtonEvent(i,(GetAsyncKeyState(i==0?VK_LBUTTON:i==1?VK_RBUTTON:VK_MBUTTON)&0x8000)!=0);
  for(int i=0;i<26;++i)io.AddKeyEvent(ImGuiKey(ImGuiKey_A+i),(GetAsyncKeyState('A'+i)&0x8000)!=0);
  for(int i=0;i<10;++i)io.AddKeyEvent(ImGuiKey(ImGuiKey_0+i),(GetAsyncKeyState('0'+i)&0x8000)!=0);
  const std::pair<int,ImGuiKey> keys[]={{VK_TAB,ImGuiKey_Tab},{VK_LEFT,ImGuiKey_LeftArrow},{VK_RIGHT,ImGuiKey_RightArrow},{VK_UP,ImGuiKey_UpArrow},{VK_DOWN,ImGuiKey_DownArrow},{VK_HOME,ImGuiKey_Home},{VK_END,ImGuiKey_End},{VK_DELETE,ImGuiKey_Delete},{VK_BACK,ImGuiKey_Backspace},{VK_RETURN,ImGuiKey_Enter},{VK_ESCAPE,ImGuiKey_Escape},{VK_SPACE,ImGuiKey_Space}};
  for(auto [vk,key]:keys)io.AddKeyEvent(key,(GetAsyncKeyState(vk)&0x8000)!=0);
  io.AddKeyEvent(ImGuiMod_Ctrl,(GetAsyncKeyState(VK_CONTROL)&0x8000)!=0);io.AddKeyEvent(ImGuiMod_Shift,(GetAsyncKeyState(VK_SHIFT)&0x8000)!=0);io.AddKeyEvent(ImGuiMod_Alt,(GetAsyncKeyState(VK_MENU)&0x8000)!=0);
  std::lock_guard lock(charactersMutex);for(auto c:characters)io.AddInputCharacter(c);characters.clear();
}
} // namespace
void start(bool testing){
  if(alive)return;
  testMode=testing;
  if(testMode){controlPipe=L"\\\\.\\pipe\\FH6CarPlay-control-test";inputReady=true;alive=true;done=false;open=true;worker=std::thread(receive_control);return;}
  ComPtr<IDirectInput8W>di;
  bool ok=SUCCEEDED(DirectInput8Create(GetModuleHandleW(nullptr),DIRECTINPUT_VERSION,IID_IDirectInput8W,reinterpret_cast<void**>(di.GetAddressOf()),nullptr));
  if(ok)ok=input_device<0>(di.Get(),GUID_SysKeyboard)&&input_device<1>(di.Get(),GUID_SysMouse);
  auto user=GetModuleHandleW(L"user32.dll");
  if(ok)ok=add_hook(reinterpret_cast<void*>(GetProcAddress(user,"SetCursorPos")),reinterpret_cast<void*>(warp),reinterpret_cast<void**>(&warpOriginal))&&add_hook(reinterpret_cast<void*>(GetProcAddress(user,"ClipCursor")),reinterpret_cast<void*>(clip),reinterpret_cast<void**>(&clipOriginal));
  inputReady=ok;alive=true;done=false;try{worker=std::thread(receive_control);}catch(...){done=true;alive=false;throw;}
}
void draw(IDXGISwapChain*swap,unsigned targets,unsigned uploads){
  (void)targets;(void)uploads;
  if(testMode&&connected){static ULONGLONG since=GetTickCount64();static int stage=0;auto elapsed=GetTickCount64()-since;if(stage==0&&elapsed>1500){send("pause");stage=1;}if(stage==1&&elapsed>3000){send("play");stage=2;}}
  DXGI_SWAP_CHAIN_DESC sd{};if(FAILED(swap->GetDesc(&sd))||!IsWindow(sd.OutputWindow))return;
  RECT client{};GetClientRect(sd.OutputWindow,&client);if(client.right<320||client.bottom<240)return;
  if(window && window!=sd.OutputWindow)return;
  if(!gui){
    if(FAILED(swap->GetDevice(IID_PPV_ARGS(&device))))return;device->GetImmediateContext(&context);
    window=sd.OutputWindow;gui=ImGui::CreateContext();ImGui::SetCurrentContext(gui);auto &io=ImGui::GetIO();io.IniFilename=nullptr;io.LogFilename=nullptr;io.ConfigFlags|=ImGuiConfigFlags_NavEnableKeyboard;
    char fonts[MAX_PATH]{};if(GetWindowsDirectoryA(fonts,MAX_PATH)){std::string font=std::string(fonts)+"\\Fonts\\segoeui.ttf";if(GetFileAttributesA(font.c_str())!=INVALID_FILE_ATTRIBUTES)io.Fonts->AddFontFromFileTTF(font.c_str(),18.f);}
    ImGui::StyleColorsDark();ImGui::GetStyle().WindowRounding=10;ImGui::GetStyle().FrameRounding=5;
    if(!ImGui_ImplDX11_Init(device.Get(),context.Get())){ImGui::DestroyContext(gui);gui=nullptr;return;}
    if(!testMode){SetLastError(0);previousProc=reinterpret_cast<WNDPROC>(SetWindowLongPtrW(window,GWLP_WNDPROC,reinterpret_cast<LONG_PTR>(wndproc)));if(!previousProc){inputReady=false;}}
  }
  bool focused=testMode||GetForegroundWindow()==window;
  bool chord=!testMode&&focused&&(GetAsyncKeyState(VK_CONTROL)&0x8000)&&(GetAsyncKeyState(VK_MENU)&0x8000)&&(GetAsyncKeyState('Y')&0x8000);
  static bool held=false;if(chord&&!held)set_open(!open);held=chord;
  if(!focused)set_open(false);
  if(!open)return;
  ImGui::SetCurrentContext(gui);auto &io=ImGui::GetIO();io.DisplaySize=ImVec2(float(client.right),float(client.bottom));
  static ULONGLONG last=0;auto now=GetTickCount64();io.DeltaTime=last?float((std::min)(now-last,ULONGLONG(100)))/1000.f:1.f/60;last=now;if(io.DeltaTime<=0)io.DeltaTime=1.f/240;
  io.MouseDrawCursor=!testMode;if(!testMode)inputs();ImGui_ImplDX11_NewFrame();ImGui::NewFrame();
  ImGui::SetNextWindowSize(ImVec2(610,350),ImGuiCond_FirstUseEver);ImGui::SetNextWindowPos(ImVec2(40,60),ImGuiCond_FirstUseEver);
  bool visible=true;ImGui::Begin("FH6 / YouTube",&visible,ImGuiWindowFlags_NoCollapse);
  static char url[2048]{};static int volume=50;
  ImGui::TextUnformatted("YouTube bağlantısı");ImGui::SetNextItemWidth(-1);
  bool enter=ImGui::InputText("##url",url,sizeof(url),ImGuiInputTextFlags_EnterReturnsTrue);
  if(ImGui::Button("Yapıştır")){auto text=clipboard();strncpy_s(url,text.c_str(),_TRUNCATE);}ImGui::SameLine();
  if(ImGui::Button("Aç")||enter)send(std::string("load\t")+url);
  ImGui::Separator();
  if(ImGui::Button("Oynat"))send("play");ImGui::SameLine();
  if(ImGui::Button("Duraklat"))send("pause");
  if(ImGui::SliderInt("Ses",&volume,0,100))send("volume\t"+std::to_string(volume));
  std::string message,video,ccVideo;std::vector<std::string> languages;int selected;bool ccAvailable,ccEnabled;
  {std::lock_guard lock(statusMutex);message=status;video=audioVideo;languages=audioLabels;selected=selectedAudio;ccVideo=captionVideo;ccAvailable=captionsAvailable;ccEnabled=captionsEnabled;}
  const char*label=selected>=0?languages[size_t(selected)].c_str():languages.empty()?"Bu videoda seçenek yok":"Dil seç";
  ImGui::BeginDisabled(languages.size()<2);
  if(ImGui::BeginCombo("Ses dili",label)){for(size_t i=0;i<languages.size();++i){ImGui::PushID(int(i));if(ImGui::Selectable(languages[i].c_str(),int(i)==selected))send("audio\t"+video+"\t"+std::to_string(i));ImGui::PopID();}ImGui::EndCombo();}
  ImGui::EndDisabled();
  ImGui::BeginDisabled(!ccAvailable);
  if(ImGui::Button(!ccAvailable?"Altyazı yok":ccEnabled?"Altyazıyı kapat":"Altyazıyı aç"))send("captions\t"+ccVideo+"\t"+(ccEnabled?"0":"1"));
  ImGui::EndDisabled();
  ImGui::TextWrapped("%s",message.c_str());
  ImGui::TextDisabled("Ctrl+Alt+Y: paneli ac / kapat");
  ImGui::End();ImGui::Render();if(!visible)set_open(false);
  ComPtr<ID3D11Texture2D>back;ComPtr<ID3D11RenderTargetView>view;if(FAILED(swap->GetBuffer(0,IID_PPV_ARGS(&back)))||FAILED(device->CreateRenderTargetView(back.Get(),nullptr,&view)))return;
  ID3D11RenderTargetView*oldTargets[D3D11_SIMULTANEOUS_RENDER_TARGET_COUNT]{};ID3D11DepthStencilView*oldDepth=nullptr;
  context->OMGetRenderTargets(D3D11_SIMULTANEOUS_RENDER_TARGET_COUNT,oldTargets,&oldDepth);
  auto rtv=view.Get();context->OMSetRenderTargets(1,&rtv,nullptr);ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
  context->OMSetRenderTargets(D3D11_SIMULTANEOUS_RENDER_TARGET_COUNT,oldTargets,oldDepth);
  for(auto target:oldTargets)if(target)target->Release();if(oldDepth)oldDepth->Release();
}
void stop(){
  set_open(false);alive=false;
  bool keepWindowChain=false;
  if(window&&previousProc&&IsWindow(window)){if(reinterpret_cast<WNDPROC>(GetWindowLongPtrW(window,GWLP_WNDPROC))==wndproc)SetWindowLongPtrW(window,GWLP_WNDPROC,reinterpret_cast<LONG_PTR>(previousProc));else{HMODULE pinned;GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_PIN,reinterpret_cast<LPCWSTR>(&wndproc),&pinned);keepWindowChain=true;}}
  for(auto address:inputHooks)MH_DisableHook(address);while(inputCalls.load())Sleep(1);for(auto address:inputHooks)MH_RemoveHook(address);inputHooks.clear();
  if(worker.joinable()){while(!done){CancelSynchronousIo(worker.native_handle());auto pipe=CreateFileW(controlPipe,GENERIC_READ|GENERIC_WRITE,0,nullptr,OPEN_EXISTING,0,nullptr);if(pipe!=INVALID_HANDLE_VALUE)CloseHandle(pipe);Sleep(10);}worker.join();}
  if(helper){CloseHandle(helper);helper=nullptr;}
  if(gui){ImGui::SetCurrentContext(gui);ImGui_ImplDX11_Shutdown();ImGui::DestroyContext(gui);gui=nullptr;}context.Reset();device.Reset();if(!keepWindowChain){window=nullptr;previousProc=nullptr;}
}
} // namespace fh6panel
