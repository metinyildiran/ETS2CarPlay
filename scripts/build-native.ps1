$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vs) { throw 'Visual Studio C++ build tools bulunamadı.' }
Import-Module (Join-Path $vs 'Common7\Tools\Microsoft.VisualStudio.DevShell.dll')
Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64'
New-Item -ItemType Directory -Path (Join-Path $root 'dist'),(Join-Path $root 'build') -Force | Out-Null
Push-Location (Join-Path $root 'build')
try {
  & cl /nologo /std:c++20 /EHsc /W4 /O2 /MT /LD "/I$root\vendor\reshade" "$root\native\addon.cpp" /link "/OUT:$root\dist\FH6CarPlay.addon64"
  if ($LASTEXITCODE -ne 0) { throw 'Eklenti derlenemedi.' }
  & cl /nologo /std:c++20 /EHsc /W4 /MT "$root\native\protocol_test.cpp" /Fe:protocol_test.exe
  if ($LASTEXITCODE -ne 0) { throw 'Test derlenemedi.' }
  & .\protocol_test.exe
  if ($LASTEXITCODE -ne 0) { throw 'Protokol testi başarısız.' }
  & cl /nologo /std:c++20 /EHsc /W4 /O2 /MT "/I$root\vendor\reshade" "$root\native\bridge_probe.cpp" /Fe:bridge_probe.exe
  if ($LASTEXITCODE -ne 0) { throw 'Aktarım testi derlenemedi.' }
} finally { Pop-Location }
