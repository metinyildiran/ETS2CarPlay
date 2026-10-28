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
 foreach($relative in @('FH6Standalone.dll','FH6YouTubeNavigation.scs','Player\electron.exe','Player\resources\app\main.cjs','Player\resources\app\package.json')){
  if(!(Test-Path -LiteralPath (Join-Path $PackagePath $relative))){throw "Hazir kurulum paketi eksik: $PackagePath. README.md dosyasindaki derleme ve paketleme adimlarini tamamla."}
 }
 $packageInfo=Get-Content -LiteralPath (Join-Path $PackagePath 'Player\resources\app\package.json') -Raw | ConvertFrom-Json
 if($packageInfo.fh6Mode -ne 'browser' -or $packageInfo.version -notmatch '^\d+\.\d+\.\d+$'){throw 'Gecerli bir tarayici aktarim paketi gerekli.'}
 if(!(Test-Path -LiteralPath $ManifestPath)){
  if([string]::IsNullOrWhiteSpace($GamePath)){
   $defaultGame='D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2'
   $GamePath=Read-Host "ETS2 klasoru (varsayilan: $defaultGame)"
   if([string]::IsNullOrWhiteSpace($GamePath)){$GamePath=$defaultGame}
  }
  if([string]::IsNullOrWhiteSpace($DocumentsPath)){
   $defaultDocuments=Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Euro Truck Simulator 2'
   $DocumentsPath=Read-Host "ETS2 belgeler klasoru (varsayilan: $defaultDocuments)"
   if([string]::IsNullOrWhiteSpace($DocumentsPath)){$DocumentsPath=$defaultDocuments}
  }
  $GamePath=$GamePath.Trim().Trim('"');$DocumentsPath=$DocumentsPath.Trim().Trim('"')
  & (Join-Path $PSScriptRoot 'install-standalone.ps1') -GamePath $GamePath -DocumentsPath $DocumentsPath -PackagePath $PackagePath -ManifestPath $ManifestPath
 }
 & (Join-Path $PSScriptRoot 'update-ingame.ps1') -PackagePath $PackagePath -ManifestPath $ManifestPath -RepairMissing
 Write-Host ''
 Write-Host 'CarPlay kurulumu tamamlandi.' -ForegroundColor Green
 Write-Host 'Tarayici uzantisi klasoru:' (Join-Path $PackagePath 'Extension')
 Write-Host 'Tarayicida video acip ETS2 Video Aktarimi uzantisindan Kabine aktar sec.'
 Write-Host 'Video bulunamazsa Alan sec ve aktar kullan. Kontroller tarayicidadir.'
 Write-Host 'Atolye kopyasi etkinse yerel FH6YouTube.scs kopyasini devre disi birak.'
 exit 0
}catch{
 Write-Host "Kurulum tamamlanamadi: $($_.Exception.Message)" -ForegroundColor Red
 exit 1
}
