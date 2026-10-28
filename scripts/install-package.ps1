param(
 [string]$GamePath,
 [string]$DocumentsPath,
 [string]$PackagePath,
 [string]$ManifestPath
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if([string]::IsNullOrWhiteSpace($PackagePath)){$PackagePath=Join-Path $root 'dist\browser-0.7.0'}
if([string]::IsNullOrWhiteSpace($ManifestPath)){$ManifestPath=Join-Path $root 'dist\standalone\Installation.json'}
try{
 if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu tamamen kapat. Acik oyuna degisiklik yapilmadi.'}
 foreach($relative in @('FH6Standalone.dll','Player\electron.exe','Player\resources\app\main.cjs','Player\resources\app\package.json')){
  if(!(Test-Path -LiteralPath (Join-Path $PackagePath $relative))){throw "Hazir kurulum paketi eksik: $PackagePath. README.md dosyasindaki derleme ve paketleme adimlarini tamamla."}
 }
 $packageInfo=Get-Content -LiteralPath (Join-Path $PackagePath 'Player\resources\app\package.json') -Raw | ConvertFrom-Json
 if($packageInfo.fh6Mode -ne 'browser' -or $packageInfo.version -notmatch '^\d+\.\d+\.\d+$'){throw 'Gecerli bir tarayici aktarim paketi gerekli.'}
 # Public archives contain no pairing keys. Create a private pair on first install.
 $extensionConfig=Join-Path $PackagePath 'Extension\config.json'
 $hostConfig=Join-Path $PackagePath 'Player\resources\app\browser-config.json'
 if((Test-Path -LiteralPath $extensionConfig) -or (Test-Path -LiteralPath $hostConfig)){
  if(!(Test-Path -LiteralPath $extensionConfig) -or !(Test-Path -LiteralPath $hostConfig)){throw 'Eslesme ayarlari eksik; paket dosyalarini kontrol et.'}
  $a=Get-Content -LiteralPath $extensionConfig -Raw | ConvertFrom-Json
  $b=Get-Content -LiteralPath $hostConfig -Raw | ConvertFrom-Json
  if($a.token -cnotmatch '^[a-f0-9]{64}$' -or $a.token -cne $b.token -or $a.port -ne 32127 -or $a.port -ne $b.port){throw 'Eslesme ayarlari uyusmuyor; mevcut anahtarlar degistirilmedi.'}
 }else{
  $bytes=New-Object byte[] 32
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
  $key=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
  $json=@{port=32127;token=$key}|ConvertTo-Json -Compress
  New-Item -ItemType Directory -Path (Split-Path $extensionConfig -Parent) -Force | Out-Null
  $created=@()
  try{
   foreach($file in @($extensionConfig,$hostConfig)){
    $stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
    $created+=$file
    try{$data=[Text.Encoding]::UTF8.GetBytes($json);$stream.Write($data,0,$data.Length)}finally{$stream.Dispose()}
   }
  }catch{foreach($file in $created){Remove-Item -LiteralPath $file};throw}
 }
 if(!(Test-Path -LiteralPath $ManifestPath)){
  . (Join-Path $PSScriptRoot 'find-ets2.ps1')
  if([string]::IsNullOrWhiteSpace($GamePath)){
   $GamePath=Select-CarPlayGamePath @(Find-CarPlayGamePaths)
  }
  if([string]::IsNullOrWhiteSpace($DocumentsPath)){
   $DocumentsPath=Find-CarPlayDocumentsPath
   if(!$DocumentsPath){throw 'ETS2 belgeler klasoru bulunamadi. Oyunu bir kez acip kapatin veya kurucuyu -DocumentsPath ile calistirin.'}
  }
  $GamePath=$GamePath.Trim().Trim('"');$DocumentsPath=$DocumentsPath.Trim().Trim('"')
  Write-Host 'ETS2 bulundu:' $GamePath
  Write-Host 'Oyun belgeleri bulundu:' $DocumentsPath
  . (Join-Path $PSScriptRoot 'player-config.ps1')
  # Validate before the base installer touches the DLL or dashboard mod.
  $null=Get-CarPlayExistingPlayerConfig (Join-Path $GamePath 'bin\win_x64\plugins\FH6Player.ini')
  & (Join-Path $PSScriptRoot 'install-standalone.ps1') -GamePath $GamePath -DocumentsPath $DocumentsPath -PackagePath $PackagePath -ManifestPath $ManifestPath
 }
 & (Join-Path $PSScriptRoot 'update-ingame.ps1') -PackagePath $PackagePath -ManifestPath $ManifestPath -RepairMissing
 Write-Host ''
 Write-Host 'CarPlay kurulumu tamamlandi.' -ForegroundColor Green
 Write-Host 'Tarayici uzantisi klasoru:' (Join-Path $PackagePath 'Extension')
 Write-Host 'Tarayicida video acip ETS2 Video Aktarimi uzantisindan Kabine aktar sec.'
 Write-Host 'Video bulunamazsa Alan sec ve aktar kullan. Kontroller tarayicidadir.'
 if($packageInfo.fh6WorkshopOnly){
  Write-Host 'Kabin ekranlari icin Steam Atolye ogesine abone ol ve Mod Yoneticisinde etkinlestir:'
  Write-Host 'https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497'
  Write-Host 'Eski yerel CarPlay ekran modu varsa Mod Yoneticisinde devre disi birak.'
 }else{Write-Host 'Atolye kopyasi etkinse yerel ekran modu kopyasini devre disi birak.'}
 exit 0
}catch{
 Write-Host "Kurulum tamamlanamadi: $($_.Exception.Message)" -ForegroundColor Red
 exit 1
}
