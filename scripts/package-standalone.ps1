$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
& node "$root\scripts\build-navigation-mod.js"
if($LASTEXITCODE){throw 'Navigation mod build failed'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$output=Join-Path $root 'dist\standalone\FH6YouTubeNavigation.scs'
if(Test-Path -LiteralPath $output){Remove-Item -LiteralPath $output}
$modRoot=[IO.Path]::GetFullPath("$root\build\navigation-mod")
$archive=[IO.Compression.ZipFile]::Open($output,[IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $modRoot -File -Recurse | ForEach-Object {
    $entry=$_.FullName.Substring($modRoot.Length+1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose() }
# Portable Electron runtime: no Node/Electron installation is needed on the target PC.
$player=Join-Path $root 'dist\standalone\Player'
New-Item -ItemType Directory -Path "$player\resources\app" -Force | Out-Null
Copy-Item "$root\desktop\node_modules\electron\dist\*" $player -Recurse -Force
Get-ChildItem "$root\desktop" -File | Where-Object {$_.Extension -in '.cjs','.js','.html','.css','.json'} | Copy-Item -Destination "$player\resources\app" -Force
Copy-Item "$root\vendor\minhook\LICENSE.txt" "$root\dist\standalone\MinHook-LICENSE.txt" -Force
Copy-Item "$root\vendor\scs-sdk\sdk_license.txt" "$root\dist\standalone\SCS-SDK-LICENSE.txt" -Force
New-Item -ItemType Directory -Path "$root\dist\standalone\scripts" -Force | Out-Null
Copy-Item "$root\scripts\install-standalone.ps1","$root\scripts\restore-standalone.ps1" "$root\dist\standalone\scripts" -Force
Copy-Item "$root\STANDALONE.md" "$root\dist\standalone\README.md" -Force
@'
@echo off
set "ELECTRON_RUN_AS_NODE="
start "FH6 YouTube" "%~dp0Player\electron.exe"
'@ | Set-Content -LiteralPath "$root\dist\standalone\Start-Standalone.cmd" -Encoding ASCII
@'
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-standalone.ps1" -PackagePath "%~dp0."
pause
'@ | Set-Content -LiteralPath "$root\dist\standalone\Install-Standalone.cmd" -Encoding ASCII
@'
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-standalone.ps1" -PackagePath "%~dp0."
pause
'@ | Set-Content -LiteralPath "$root\dist\standalone\Restore-Previous.cmd" -Encoding ASCII
Write-Output $player
