. (Join-Path $PSScriptRoot 'find-ets2.ps1')
. (Join-Path $PSScriptRoot 'player-config.ps1')

function Install-CarPlayManaged([string]$GamePath,[string]$DocumentsPath,[string]$Source) {
 if(!$GamePath){$GamePath=Select-CarPlayGamePath @(Find-CarPlayGamePaths)}
 if(!$DocumentsPath){$DocumentsPath=Find-CarPlayDocumentsPath}
 if(!$DocumentsPath -or !(Test-Path -LiteralPath $DocumentsPath -PathType Container)){throw 'ETS2 belgeler klasoru bulunamadi.'}
 $GamePath=[IO.Path]::GetFullPath($GamePath.Trim('"'))
 $DocumentsPath=[IO.Path]::GetFullPath($DocumentsPath.Trim('"'))
 $Source=[IO.Path]::GetFullPath($Source).TrimEnd('\')
 $bin=Join-Path $GamePath 'bin\win_x64'
 if(!(Test-Path -LiteralPath (Join-Path $bin 'eurotrucks2.exe'))){throw 'ETS2 oyun yolu bulunamadi.'}
 $mod=Join-Path $DocumentsPath 'mod'
 $target=Join-Path $mod 'ETS2CarPlay'
 foreach($folder in @($mod,$target)){
  if((Test-Path -LiteralPath $folder) -and ((Get-Item -LiteralPath $folder).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Kurulum hedefi bir baglanti; dosyalara dokunulmadi.'}
 }
 $state=Join-Path $target '.installation'
 if(Test-Path -LiteralPath $target){
  try{$owner=Get-Content -LiteralPath (Join-Path $state 'Managed.json') -Raw | ConvertFrom-Json}catch{throw 'ETS2CarPlay klasoru bu kurucuya ait degil; uzerine yazilmadi.'}
  if($owner.Product -ne 'ETS2CarPlay' -or $owner.GamePath -ne $GamePath -or $owner.DocumentsPath -ne $DocumentsPath){throw 'Kalici kurulum kaydi bu oyunla eslesmiyor.'}
 }
 $info=Get-Content -LiteralPath (Join-Path $Source 'Player\resources\app\package.json') -Raw | ConvertFrom-Json
 if($info.fh6Mode -ne 'browser'){throw 'Tarayici aktarim paketi gerekli.'}
 foreach($relative in @('FH6Standalone.dll','Player\electron.exe','Player\resources\app\main.cjs','Extension\manifest.json')){
  if(!(Test-Path -LiteralPath (Join-Path $Source $relative))){throw "Paket eksik: $relative"}
 }
 if(!$info.fh6WorkshopOnly -and !(Test-Path -LiteralPath (Join-Path $Source 'FH6YouTubeNavigation.scs'))){throw 'Yerel ekran paketi eksik.'}
 $previous=Get-CarPlayExistingPlayerConfig (Join-Path $bin 'plugins\FH6Player.ini')
 if(Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object {$_.Path -and $_.Path.StartsWith($target+'\',[StringComparison]::OrdinalIgnoreCase)}){throw 'CarPlay yardimcisini kapatip tekrar dene.'}
 New-Item -ItemType Directory -Path $mod -Force | Out-Null
 $id=[Guid]::NewGuid().ToString('N')
 $stage=Join-Path $mod ('.ETS2CarPlay-stage-'+$id)
 $backup=Join-Path $mod ('.ETS2CarPlay-backup-'+$id)
 $failed=Join-Path $mod ('.ETS2CarPlay-failed-'+$id)
 foreach($path in @($stage,$backup,$failed)){
  if([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($path)) -ne [IO.Path]::GetFullPath($mod) -or (Test-Path -LiteralPath $path)){throw 'Gecici kurulum yolu gecersiz.'}
 }
 New-Item -ItemType Directory -Path $stage | Out-Null
 # Stage only runtime payload, not download-side logs/backups/installation records.
 $entries=@('Player','Extension','FH6Standalone.dll','ImGui-LICENSE.txt','MinHook-LICENSE.txt','SCS-SDK-LICENSE.txt')
 if(!$info.fh6WorkshopOnly){$entries+='FH6YouTubeNavigation.scs'}
 foreach($entry in $entries){
  $from=Join-Path $Source $entry
  if(!(Test-Path -LiteralPath $from)){continue}
  $items=@(Get-Item -LiteralPath $from)
  if((Get-Item -LiteralPath $from).PSIsContainer){$items+=@(Get-ChildItem -LiteralPath $from -Recurse -Force)}
  foreach($item in $items){
   if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Paket baglanti dosyasi iceriyor; kurulum durdu.'}
   if($item.PSIsContainer){continue}
   $relative=$item.FullName.Substring($Source.Length+1)
   if($relative -match '(?i)(\.jsonl$|\.log$|[/\\](config\.json|browser-config\.json)$)'){continue}
   $to=Join-Path $stage $relative
   New-Item -ItemType Directory -Path (Split-Path $to -Parent) -Force | Out-Null
   [IO.File]::Copy($item.FullName,$to,$false)
   if((Get-FileHash -LiteralPath $to).Hash -ne (Get-FileHash -LiteralPath $item.FullName).Hash){throw 'Kopyalanan dosya dogrulanamadi.'}
  }
 }
 $stageState=Join-Path $stage '.installation'
 if(Test-Path -LiteralPath $state){
  if(Get-ChildItem -LiteralPath $state -Recurse -Force | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}){throw 'Kurulum kaydi baglanti iceriyor.'}
  Copy-Item -LiteralPath $state -Destination $stageState -Recurse
 }else{New-Item -ItemType Directory -Path $stageState | Out-Null}
 # Preserve the installed private key across updates and download-folder changes.
 $pairRoots=@($target)
 if($previous){$pairRoots+=Split-Path (Split-Path $previous.Executable -Parent) -Parent}
 $pairRoots+=$Source
 foreach($pairRoot in $pairRoots){
  $a=Join-Path $pairRoot 'Extension\config.json';$b=Join-Path $pairRoot 'Player\resources\app\browser-config.json'
  if(!(Test-Path -LiteralPath $a) -and !(Test-Path -LiteralPath $b)){continue}
  if(!(Test-Path -LiteralPath $a) -or !(Test-Path -LiteralPath $b)){throw 'Mevcut eslesme ayarlari eksik; degistirilmedi.'}
  $x=Get-Content -LiteralPath $a -Raw | ConvertFrom-Json;$y=Get-Content -LiteralPath $b -Raw | ConvertFrom-Json
  if($x.token -cnotmatch '^[a-f0-9]{64}$' -or $x.token -cne $y.token -or $x.port -ne 32127 -or $x.port -ne $y.port){throw 'Mevcut eslesme ayarlari uyusmuyor; degistirilmedi.'}
  Copy-Item -LiteralPath $a -Destination (Join-Path $stage 'Extension\config.json')
  Copy-Item -LiteralPath $b -Destination (Join-Path $stage 'Player\resources\app\browser-config.json')
  break
 }
 @{Product='ETS2CarPlay';GamePath=$GamePath;DocumentsPath=$DocumentsPath}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $stageState 'Managed.json') -Encoding UTF8
 # Save game-side originals for rollback, including a base install that committed.
 $rollback=Join-Path $stageState ('Transactions\'+$id)
 New-Item -ItemType Directory -Path $rollback -Force | Out-Null
 $gameFiles=@('plugins\FH6Standalone.dll','plugins\FH6Player.ini','dxgi.dll','d3d11.dll','FH6CarPlay.addon64') | ForEach-Object {Join-Path $bin $_}
 if(!$info.fh6WorkshopOnly){$gameFiles+=Join-Path $mod 'FH6YouTube.scs'}
 $originals=@();$i=0
 foreach($file in $gameFiles){
  $saved=Join-Path $rollback ([string]$i);$i++
  $exists=Test-Path -LiteralPath $file
  if($exists){Copy-Item -LiteralPath $file -Destination $saved}
  $originals+=[pscustomobject]@{Path=$file;Existed=$exists;Saved=[IO.Path]::GetFileName($saved)}
 }
 $swapped=$false;$hadTarget=Test-Path -LiteralPath $target
 try{
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Kurulum sirasinda oyun acildi.'}
  if($hadTarget){Move-Item -LiteralPath $target -Destination $backup}
  Move-Item -LiteralPath $stage -Destination $target;$swapped=$true
  & (Join-Path $PSScriptRoot 'install-package.ps1') -GamePath $GamePath -DocumentsPath $DocumentsPath -PackagePath $target -ManifestPath (Join-Path $state 'Installation.json')
  if($LASTEXITCODE -ne 0){throw 'Kalici kurulum tamamlanamadi; onceki dosyalar geri yukleniyor.'}
 }catch{
  $failure=$_
  if($swapped){
   $savedRollback=Join-Path $state ('Transactions\'+$id)
   foreach($file in $originals){
    if($file.Existed){Copy-Item -LiteralPath (Join-Path $savedRollback $file.Saved) -Destination $file.Path -Force}
    elseif(Test-Path -LiteralPath $file.Path){Remove-Item -LiteralPath $file.Path}
   }
   Move-Item -LiteralPath $target -Destination $failed
  }
  if(Test-Path -LiteralPath $backup){Move-Item -LiteralPath $backup -Destination $target}
  throw $failure
 }
 Write-Host 'Kalici kurulum:' $target
 Write-Host 'Tarayicida paketlenmemis uzanti olarak BU klasoru yukle:' (Join-Path $target 'Extension')
 Write-Host 'Eski indirme klasorunden yuklu uzanti varsa kaldirip bu kalici klasoru sec.'
 Write-Host 'Kurulum tamamlandi; indirilen ZIP ve cikardigin klasor artik silinebilir.' -ForegroundColor Green
}
