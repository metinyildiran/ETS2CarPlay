$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
Import-Module (Join-Path $vs 'Common7\Tools\Microsoft.VisualStudio.DevShell.dll')
Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64'
New-Item -ItemType Directory -Path "$root\build\standalone","$root\dist\standalone" -Force | Out-Null
Push-Location "$root\build\standalone"
try {
  & cl /nologo /c /O2 /MT "/I$root\vendor\minhook\include" "$root\vendor\minhook\src\buffer.c" "$root\vendor\minhook\src\hook.c" "$root\vendor\minhook\src\trampoline.c" "$root\vendor\minhook\src\hde\hde64.c"
  if($LASTEXITCODE){throw 'MinHook build failed'}
  & cl /nologo /LD /std:c++20 /EHsc /O2 /MT /W4 /utf-8 "/I$root\vendor\minhook\include" "/I$root\vendor\scs-sdk\include" "$root\native\standalone.cpp" "$root\native\helper_runtime.cpp" buffer.obj hook.obj trampoline.obj hde64.obj /link "/DEF:$root\native\standalone.def" "/OUT:$root\dist\standalone\FH6Standalone.dll"
  if($LASTEXITCODE){throw 'Standalone build failed'}
  Copy-Item "$root\dist\standalone\FH6Standalone.dll" .\FH6Standalone.dll -Force
  & cl /nologo /std:c++20 /EHsc /O2 /MT /W4 /DFH6_STANDALONE "$root\native\dx11_probe.cpp" /Fe:standalone_probe.exe
  if($LASTEXITCODE){throw 'Standalone test build failed'}
} finally {Pop-Location}
