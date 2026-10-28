#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <string>
#include "helper_runtime.hpp"
namespace ets2helper {
namespace { HANDLE helper=nullptr; }
void start(){
  if(helper)return;
  wchar_t modulePath[32768]{};HMODULE module=nullptr;
  if(!GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS|GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,reinterpret_cast<LPCWSTR>(&start),&module))return;
  if(!GetModuleFileNameW(module,modulePath,32768))return;
  auto slash=wcsrchr(modulePath,L'\\');if(!slash)return;*(slash+1)=0;
  const std::wstring config=std::wstring(modulePath)+L"FH6Player.ini";wchar_t executable[32768]{};
  GetPrivateProfileStringW(L"Player",L"Executable",L"",executable,32768,config.c_str());
  if(!*executable||GetFileAttributesW(executable)==INVALID_FILE_ATTRIBUTES)return;
  std::wstring command=L"\""+std::wstring(executable)+L"\" --embedded --owner-pid="+std::to_wstring(GetCurrentProcessId());
  STARTUPINFOW si{};si.cb=sizeof(si);si.dwFlags=STARTF_USESHOWWINDOW;si.wShowWindow=SW_HIDE;PROCESS_INFORMATION pi{};
  if(CreateProcessW(executable,command.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW,nullptr,nullptr,&si,&pi)){helper=pi.hProcess;CloseHandle(pi.hThread);}
}
void stop(){
  // The helper observes the owner PID and exits when the game closes.
  if(helper){CloseHandle(helper);helper=nullptr;}
}
}
