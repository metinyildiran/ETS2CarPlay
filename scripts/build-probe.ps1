$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
Import-Module (Join-Path $vs 'Common7\Tools\Microsoft.VisualStudio.DevShell.dll')
Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64'
Push-Location "$root\build\standalone"
try{& cl /nologo /std:c++20 /EHsc /O2 /MT /W4 /DFH6_STANDALONE "$root\native\dx11_probe.cpp" /Fe:standalone_probe.exe;if($LASTEXITCODE){throw 'Probe build failed'}}finally{Pop-Location}
