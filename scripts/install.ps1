param(
  [string]$GamePath = 'D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2',
  [string]$DocumentsPath = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Euro Truck Simulator 2')
)
$ErrorActionPreference = 'Stop'
if (Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue) { throw 'Önce ETS2 oyununu kapat. Çalışan oturuma kurulum yapılmaz.' }
$root = Split-Path $PSScriptRoot -Parent
$bin = Join-Path $GamePath 'bin\win_x64'
if (!(Test-Path -LiteralPath (Join-Path $bin 'eurotrucks2.exe'))) { throw 'ETS2 oyun yolu geçersiz.' }
if (!(Test-Path -LiteralPath (Join-Path $bin 'dxgi.dll')) -and !(Test-Path -LiteralPath (Join-Path $bin 'd3d11.dll'))) {
  throw 'Önce resmi ReShade full add-on support sürümünü ETS2 / DirectX 11 için kur. Bu betik ReShade kurmaz.'
}
# An existing graphics DLL is only a prerequisite hint. Confirm full add-on support in ReShade UI.
if (!(Test-Path -LiteralPath $DocumentsPath)) { throw 'ETS2 belgeler klasörü bulunamadı.' }
$mod = Join-Path $DocumentsPath 'mod'
$pairs = @(
  @{ Source = (Join-Path $root 'dist\FH6CarPlay.addon64'); Target = (Join-Path $bin 'FH6CarPlay.addon64') },
  @{ Source = (Join-Path $root 'dist\FH6YouTube.scs'); Target = (Join-Path $mod 'FH6YouTube.scs') }
)
foreach ($pair in $pairs) {
  if (!(Test-Path -LiteralPath $pair.Source)) { throw ('Paket eksik: ' + $pair.Source) }
  if (Test-Path -LiteralPath $pair.Target) { throw ('Mevcut dosyanın üzerine yazılmadı: ' + $pair.Target) }
}
New-Item -ItemType Directory -Path $mod -Force | Out-Null
$created = @()
try {
  foreach ($pair in $pairs) {
    [System.IO.File]::Copy($pair.Source, $pair.Target, $false)
    $created += $pair.Target
  }
} catch {
  foreach ($path in $created) { Remove-Item -LiteralPath $path }
  throw
}
Write-Output 'Dosyalar kuruldu. ETS2 Mod Yöneticisinde FH6 YouTube modunu etkinleştir.'
