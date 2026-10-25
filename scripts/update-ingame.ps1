param(
 [string]$PackagePath=(Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\ingame-0.4.2'),
 [string]$ManifestPath=(Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone\Installation.json')
)
$ErrorActionPreference='Stop'
if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu kapat. Acik oyuna guncelleme yapilmadi.'}
$oldPlayer=Join-Path (Split-Path $ManifestPath -Parent) 'Player\electron.exe'
if(Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $oldPlayer}){throw 'Eski FH6 oynaticisini da kapat.'}
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
foreach($action in $manifest.Actions){
 $current=if(Test-Path -LiteralPath $action.Target){(Get-FileHash -LiteralPath $action.Target).Hash}else{$null}
 if($current -ne $action.After){throw "Kurulumdan sonra degisen dosyaya dokunulmadi: $($action.Target)"}
}
$bin=Join-Path $manifest.GamePath 'bin\win_x64'
$installedConfig=Join-Path $bin 'plugins\FH6Player.ini'
if(Test-Path -LiteralPath $installedConfig){
 $installedPlayer=(Get-Content -LiteralPath $installedConfig | Where-Object {$_ -like 'Executable=*'}).Substring(11)
 if(Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $installedPlayer}){throw 'FH6 oynaticisi henuz kapanmadi. Oyundan ciktiktan sonra biraz bekle.'}
}
$dllAction=$manifest.Actions | Where-Object {$_.Target -eq (Join-Path $bin 'plugins\FH6Standalone.dll')}
$modAction=$manifest.Actions | Where-Object {$_.Target -like '*\mod\FH6YouTube.scs'}
if(!$dllAction -or !$modAction){throw 'Onceki FH6 kurulum kaydi eksik.'}
$player=Join-Path $PackagePath 'Player\electron.exe'
foreach($path in @("$PackagePath\FH6Standalone.dll","$PackagePath\FH6YouTubeNavigation.scs",$player,"$PackagePath\Player\resources\app\main.cjs")){if(!(Test-Path -LiteralPath $path)){throw "Eksik paket: $path"}}
$packageInfo=Get-Content -LiteralPath "$PackagePath\Player\resources\app\package.json" -Raw | ConvertFrom-Json
if($packageInfo.version -notmatch '^\d+\.\d+\.\d+$'){throw 'Gecersiz paket surumu.'}
$packageVersion=$packageInfo.version+$(if($packageInfo.fh6Mode -eq 'browser'){'-browser-experimental'}else{'-experimental'})
$backup=Join-Path (Split-Path $ManifestPath -Parent) ('Backups\update-04-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item -LiteralPath $ManifestPath -Destination "$backup\Installation.json"
$config=Join-Path $bin 'plugins\FH6Player.ini'
$configSource=Join-Path $backup 'FH6Player.ini.new'
[IO.File]::WriteAllText($configSource,"[Player]`r`nExecutable=$player`r`n",[Text.Encoding]::Unicode)
$configAction=$manifest.Actions | Where-Object {$_.Target -eq $config}
if(!$configAction){
 if(Test-Path -LiteralPath $config){throw 'Kayitsiz FH6Player.ini bulundu; uzerine yazilmadi.'}
 $configAction=[pscustomobject]@{Target=$config;Source=$configSource;Backup=$null;Before=$null;After=$null}
 $manifest.Actions=@($manifest.Actions)+@($configAction)
}
$changes=@(
 [pscustomobject]@{Action=$dllAction;Source="$PackagePath\FH6Standalone.dll";Backup="$backup\FH6Standalone.dll"},
 [pscustomobject]@{Action=$modAction;Source="$PackagePath\FH6YouTubeNavigation.scs";Backup="$backup\FH6YouTube.scs"},
 [pscustomobject]@{Action=$configAction;Source=$configSource;Backup=$null}
)
foreach($change in $changes){if(Test-Path -LiteralPath $change.Action.Target){if(!$change.Backup){$change.Backup="$backup\FH6Player.ini"};Copy-Item -LiteralPath $change.Action.Target -Destination $change.Backup}}
$completed=@()
try{
 foreach($change in $changes){
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Guncelleme sirasinda oyun acildi.'}
  $current=if(Test-Path -LiteralPath $change.Action.Target){(Get-FileHash -LiteralPath $change.Action.Target).Hash}else{$null}
  if($current -ne $change.Action.After){throw 'Hedef dosya guncelleme sirasinda degisti.'}
  $completed+=$change
  [IO.File]::Copy($change.Source,$change.Action.Target,$true)
  $hash=(Get-FileHash -LiteralPath $change.Source).Hash
  if((Get-FileHash -LiteralPath $change.Action.Target).Hash -ne $hash){throw 'Dosya dogrulamasi basarisiz.'}
  $change.Action.Source=$change.Source;$change.Action.After=$hash
 }
 $manifest.Version=$packageVersion
 $manifest.PSObject.Properties.Remove('NativeSuspended')
 $manifest|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $ManifestPath -Encoding UTF8
}catch{
 [array]::Reverse($completed)
 foreach($change in $completed){if($change.Backup){[IO.File]::Copy($change.Backup,$change.Action.Target,$true)}elseif(Test-Path -LiteralPath $change.Action.Target){Remove-Item -LiteralPath $change.Action.Target}}
 [IO.File]::Copy("$backup\Installation.json",$ManifestPath,$true)
 throw
}
Write-Output "$packageVersion kuruldu."
