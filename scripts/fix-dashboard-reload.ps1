param(
 [switch]$Install,
 [string]$ManifestPath=(Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone\Installation.json')
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$stage=Join-Path $root 'dist\dashboard-fix-0.5.1'
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
 foreach($suffix in 'gps','mph_gps'){
  $entry=$zip.GetEntry("ui/dashboard/volvo_fh_2024_$suffix.sii")
  if(!$entry){throw 'Missing dashboard variant'}
  $reader=[IO.StreamReader]::new($entry.Open());try{$text=$reader.ReadToEnd()}finally{$reader.Dispose()}
  if($text.Contains('fh6.video.overlay') -or !$text.Contains('ui::text : _nameless._.fh6_video {') -or !$text.Contains('my_children[2]: _nameless._.fh6_video')){throw 'Dashboard instance fix missing'}
 }
}finally{$zip.Dispose()}
if(!$Install){Write-Output "Verified dashboard patch: $source";return}
if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu kapat. Acik oyuna dokunulmadi.'}
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
foreach($a in $manifest.Actions){$hash=if(Test-Path -LiteralPath $a.Target){(Get-FileHash -LiteralPath $a.Target).Hash}else{$null};if($hash -ne $a.After){throw "Kurulum dosyasi degismis: $($a.Target)"}}
$action=$manifest.Actions | Where-Object {$_.Target -like '*\mod\FH6YouTube.scs'}
if(@($action).Count -ne 1){throw 'Tek FH6 mod kurulumu bulunamadi.'}
$backup=Join-Path $stage ('backup-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $ManifestPath -Destination "$backup\Installation.json"
$targets=@($action.Target)
# Patch existing package copies too, so switching between browser and internal
# playback cannot restore the known crashing dashboard. Runtime files are untouched.
foreach($relative in 'dist\ingame-0.4.2\FH6YouTubeNavigation.scs','dist\browser-0.5.0\FH6YouTubeNavigation.scs'){
 $p=Join-Path $root $relative;if(Test-Path -LiteralPath $p){$targets+=@($p)}
}
$changes=@();$index=0
foreach($target in $targets){$copy=Join-Path $backup ("mod-$index.scs");Copy-Item -LiteralPath $target -Destination $copy;$changes+=@([pscustomobject]@{Target=$target;Backup=$copy;Before=(Get-FileHash -LiteralPath $target).Hash});$index++}
$completed=@()
try{
 foreach($change in $changes){
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Oyun guncelleme sirasinda acildi.'}
  if((Get-FileHash -LiteralPath $change.Target).Hash -ne $change.Before){throw 'Hedef dosya guncelleme sirasinda degisti.'}
  $completed+=@($change);[IO.File]::Copy($source,$change.Target,$true)
  if((Get-FileHash -LiteralPath $change.Target).Hash -ne (Get-FileHash -LiteralPath $source).Hash){throw 'Mod kopyasi dogrulanamadi.'}
 }
 $action.Source=$source;$action.After=(Get-FileHash -LiteralPath $source).Hash
 $manifest | Add-Member -NotePropertyName DashboardRevision -NotePropertyValue '0.5.1' -Force
 $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
}catch{
 [array]::Reverse($completed);foreach($change in $completed){[IO.File]::Copy($change.Backup,$change.Target,$true)}
 [IO.File]::Copy("$backup\Installation.json",$ManifestPath,$true);throw
}
Write-Output '0.5.1 dashboard fix installed; native plugin, player and browser extension unchanged.'
