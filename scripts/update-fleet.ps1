param(
 [switch]$Install,
 [string]$ManifestPath=(Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone\Installation.json')
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$stage=Join-Path $root 'dist\fleet-0.6.0'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
& node "$root\scripts\build-navigation-mod.js"
if($LASTEXITCODE){throw 'Dashboard build failed'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$source=Join-Path $stage 'FH6YouTubeNavigation.scs'
if(Test-Path -LiteralPath $source){Remove-Item -LiteralPath $source}
$modRoot=[IO.Path]::GetFullPath("$root\build\navigation-mod")
$zip=[IO.Compression.ZipFile]::Open($source,[IO.Compression.ZipArchiveMode]::Create)
try{Get-ChildItem -LiteralPath $modRoot -Recurse -File | ForEach-Object {[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$_.FullName.Substring($modRoot.Length+1).Replace('\','/'),[IO.Compression.CompressionLevel]::Optimal)|Out-Null}}finally{$zip.Dispose()}
$zip=[IO.Compression.ZipFile]::OpenRead($source)
try{
 $inventory=Get-Content -LiteralPath "$root\research\fleet-inventory.json" -Raw | ConvertFrom-Json
 foreach($screen in $inventory.screens){
  $entry=$zip.GetEntry($screen.path.TrimStart('/'))
  if(!$entry){throw 'Missing dashboard variant'}
  $reader=[IO.StreamReader]::new($entry.Open());try{$text=$reader.ReadToEnd()}finally{$reader.Dispose()}
  if($text.Contains('fh6.video.overlay') -or !$text.Contains('ui::text : _nameless._.fh6_video')){throw 'Dashboard instance fix missing'}
 }
}finally{$zip.Dispose()}
$dll=Join-Path $stage 'FH6Standalone.dll'
Copy-Item -LiteralPath "$root\dist\standalone\FH6Standalone.dll" -Destination $dll -Force
Copy-Item -LiteralPath "$root\research\fleet-inventory.json" -Destination "$stage\fleet-inventory.json" -Force
if(!$Install){Write-Output "Verified fleet package: $stage";return}
if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu kapat. Acik oyuna dokunulmadi.'}
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
foreach($a in $manifest.Actions){$hash=if(Test-Path -LiteralPath $a.Target){(Get-FileHash -LiteralPath $a.Target).Hash}else{$null};if($hash -ne $a.After){throw "Kurulum dosyasi degismis: $($a.Target)"}}
$action=$manifest.Actions | Where-Object {$_.Target -like '*\mod\FH6YouTube.scs'}
if(@($action).Count -ne 1){throw 'Tek FH6 mod kurulumu bulunamadi.'}
$dllAction=$manifest.Actions | Where-Object {$_.Target -like '*\plugins\FH6Standalone.dll'}
if(@($dllAction).Count -ne 1){throw 'Tek native eklenti bulunamadi.'}
$backup=Join-Path $stage ('backup-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $ManifestPath -Destination "$backup\Installation.json"
$targets=@([pscustomobject]@{Target=$action.Target;Source=$source},[pscustomobject]@{Target=$dllAction.Target;Source=$dll})
# Keep both playback modes on the same fleet patch without touching the player,
# extension, pairing secret, configuration, saves or mod activation order.
foreach($relative in 'dist\ingame-0.4.2','dist\browser-0.5.0'){
 foreach($name in 'FH6YouTubeNavigation.scs','FH6Standalone.dll'){
  $p=Join-Path $root "$relative\$name"
  if(Test-Path -LiteralPath $p){$targets+=@([pscustomobject]@{Target=$p;Source=$(if($name.EndsWith('.dll')){$dll}else{$source})})}
 }
}
$changes=@();$index=0
foreach($target in $targets){$copy=Join-Path $backup ("file-$index.bak");Copy-Item -LiteralPath $target.Target -Destination $copy;$changes+=@([pscustomobject]@{Target=$target.Target;Source=$target.Source;Backup=$copy;Before=(Get-FileHash -LiteralPath $target.Target).Hash});$index++}
$completed=@()
try{
 foreach($change in $changes){
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Oyun guncelleme sirasinda acildi.'}
  if((Get-FileHash -LiteralPath $change.Target).Hash -ne $change.Before){throw 'Hedef dosya guncelleme sirasinda degisti.'}
  $completed+=@($change);[IO.File]::Copy($change.Source,$change.Target,$true)
  if((Get-FileHash -LiteralPath $change.Target).Hash -ne (Get-FileHash -LiteralPath $change.Source).Hash){throw 'Dosya kopyasi dogrulanamadi.'}
 }
 $action.Source=$source;$action.After=(Get-FileHash -LiteralPath $source).Hash
 $dllAction.Source=$dll;$dllAction.After=(Get-FileHash -LiteralPath $dll).Hash
 $manifest.PSObject.Properties.Remove('NativeSuspended')
 $manifest | Add-Member -NotePropertyName DashboardRevision -NotePropertyValue '0.6.3' -Force
 $manifest | Add-Member -NotePropertyName NativeRevision -NotePropertyValue '0.6.0' -Force
 $changes | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$backup\Changes.json" -Encoding UTF8
 $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
}catch{
 [array]::Reverse($completed);foreach($change in $completed){[IO.File]::Copy($change.Backup,$change.Target,$true)}
 [IO.File]::Copy("$backup\Installation.json",$ManifestPath,$true);throw
}
Write-Output '0.6.0 fleet screens and native reload fix installed; player and browser extension unchanged.'
