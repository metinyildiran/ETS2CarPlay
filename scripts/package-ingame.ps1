param([string]$OutputDirectory='')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$out=if($OutputDirectory){[IO.Path]::GetFullPath($OutputDirectory)}else{Join-Path $root 'dist\ingame-0.4.2'}
New-Item -ItemType Directory -Path "$out\Player\resources\app","$out\scripts" -Force | Out-Null
& node "$root\scripts\build-navigation-mod.js"
if($LASTEXITCODE){throw 'Navigation mod build failed'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$file=Join-Path $out 'FH6YouTubeNavigation.scs'
if(Test-Path -LiteralPath $file){Remove-Item -LiteralPath $file}
$modRoot=[IO.Path]::GetFullPath("$root\build\navigation-mod")
$archive=[IO.Compression.ZipFile]::Open($file,[IO.Compression.ZipArchiveMode]::Create)
try{Get-ChildItem -LiteralPath $modRoot -Recurse -File | ForEach-Object {[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$_.FullName.Substring($modRoot.Length+1).Replace('\','/'),[IO.Compression.CompressionLevel]::Optimal)|Out-Null}}finally{$archive.Dispose()}
Copy-Item -LiteralPath "$root\dist\standalone\FH6Standalone.dll" -Destination $out -Force
Copy-Item "$root\desktop\node_modules\electron\dist\*" "$out\Player" -Recurse -Force
Get-ChildItem -LiteralPath "$root\desktop" -File | Where-Object {$_.Extension -in '.cjs','.js','.html','.css','.json'} | Copy-Item -Destination "$out\Player\resources\app" -Force
Copy-Item -LiteralPath "$root\vendor\minhook\LICENSE.txt" -Destination "$out\MinHook-LICENSE.txt" -Force
Copy-Item -LiteralPath "$root\vendor\imgui\LICENSE.txt" -Destination "$out\ImGui-LICENSE.txt" -Force
Copy-Item -LiteralPath "$root\vendor\scs-sdk\sdk_license.txt" -Destination "$out\SCS-SDK-LICENSE.txt" -Force
Copy-Item -LiteralPath "$root\INGAME.md" -Destination "$out\README.md" -Force
Copy-Item -LiteralPath "$root\scripts\update-ingame.ps1" -Destination "$out\scripts" -Force
Copy-Item -LiteralPath "$root\scripts\player-config.ps1" -Destination "$out\scripts" -Force
Write-Output "In-game package: $out"
