param([string]$InGamePackage='',[string]$ExpectedVersion='0.4.2-experimental')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(!$InGamePackage){$InGamePackage=Join-Path $root 'dist\ingame-0.4.2'}
$fixture=Join-Path $root ('build\migration-check-'+[Guid]::NewGuid().ToString('N'))
$game=Join-Path $fixture 'Game'
$docs=Join-Path $fixture 'Documents'
$pkg=Join-Path $fixture 'Package'
$bin=Join-Path $game 'bin\win_x64'
New-Item -ItemType Directory -Path $bin,"$docs\mod","$pkg\Player\resources\app" -Force | Out-Null
Set-Content -LiteralPath "$bin\eurotrucks2.exe" -Value 'fixture'
Set-Content -LiteralPath "$bin\FH6CarPlay.addon64" -Value 'previous addon'
Set-Content -LiteralPath "$docs\mod\FH6YouTube.scs" -Value 'previous mod'
Set-Content -LiteralPath "$pkg\Player\electron.exe" -Value 'fixture'
Set-Content -LiteralPath "$pkg\Player\resources\app\main.cjs" -Value 'fixture'
Copy-Item -LiteralPath "$root\dist\standalone\FH6Standalone.dll","$root\dist\standalone\FH6YouTubeNavigation.scs" -Destination $pkg
$original=@{}
foreach($path in @("$bin\FH6CarPlay.addon64","$docs\mod\FH6YouTube.scs")) { $original[$path]=(Get-FileHash -LiteralPath $path).Hash }
# An unrelated graphics DLL must prevent any mutation.
Set-Content -LiteralPath "$bin\dxgi.dll" -Value 'unrelated graphics extension'
$blocked=$false
try { & "$PSScriptRoot\install-standalone.ps1" -GamePath $game -DocumentsPath $docs -PackagePath $pkg } catch { $blocked=$true }
if(!$blocked -or (Test-Path "$pkg\Installation.json")){throw 'Foreign graphics DLL protection failed'}
foreach($path in $original.Keys){if((Get-FileHash -LiteralPath $path).Hash -ne $original[$path]){throw 'Preflight modified a file'}}
Remove-Item -LiteralPath "$bin\dxgi.dll"
& "$PSScriptRoot\install-standalone.ps1" -GamePath $game -DocumentsPath $docs -PackagePath $pkg
if(!(Test-Path "$bin\plugins\FH6Standalone.dll") -or (Test-Path "$bin\FH6CarPlay.addon64")){throw 'Migration did not replace plugins'}
if((Get-FileHash "$docs\mod\FH6YouTube.scs").Hash -ne (Get-FileHash "$pkg\FH6YouTubeNavigation.scs").Hash){throw 'Mod hash mismatch'}
& "$PSScriptRoot\update-ingame.ps1" -PackagePath $InGamePackage -ManifestPath "$pkg\Installation.json"
if(!(Test-Path "$bin\plugins\FH6Player.ini")){throw 'In-game helper configuration missing'}
if((Get-Content "$pkg\Installation.json" -Raw|ConvertFrom-Json).Version -ne $ExpectedVersion){throw 'Updated rollback manifest missing'}
& "$PSScriptRoot\restore-standalone.ps1" -PackagePath $pkg
foreach($path in $original.Keys){if((Get-FileHash -LiteralPath $path).Hash -ne $original[$path]){throw 'Rollback hash mismatch'}}
if(Test-Path "$bin\plugins\FH6Standalone.dll"){throw 'Rollback left new plugin installed'}
if(Test-Path "$bin\plugins\FH6Player.ini"){throw 'Rollback left helper configuration installed'}
Write-Output 'PASS: unrelated DLL refused; migration succeeded; previous files restored byte-for-byte.'
