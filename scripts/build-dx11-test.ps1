$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
Import-Module (Join-Path $vs 'Common7\Tools\Microsoft.VisualStudio.DevShell.dll')
Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64'
$gameBin='D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2\bin\win_x64'
foreach ($variant in @('old','new')) {
  $dir=Join-Path $root ('build\dx11-'+$variant)
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $gameBin 'dxgi.dll') -Destination (Join-Path $dir 'dxgi.dll')
  $addon=if ($variant -eq 'old') {Join-Path $gameBin 'FH6CarPlay.addon64'} else {Join-Path $root 'dist\FH6CarPlay.addon64'}
  Copy-Item -LiteralPath $addon -Destination (Join-Path $dir 'FH6CarPlay.addon64')
  Push-Location $dir
  try {
    & cl /nologo /std:c++20 /EHsc /W4 /MT "$root\native\dx11_probe.cpp" /Fe:dx11_probe.exe
    if ($LASTEXITCODE -ne 0) {throw 'DX11 test build failed'}
  } finally {Pop-Location}
}
