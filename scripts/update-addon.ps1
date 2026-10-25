param([string]$GamePath = 'D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2')
$ErrorActionPreference = 'Stop'
if (Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue) { throw 'Önce ETS2 oyununu kapat; sonra Update.cmd dosyasını yeniden çalıştır.' }
$root = Split-Path $PSScriptRoot -Parent
$bin = Join-Path $GamePath 'bin\win_x64'
$target = Join-Path $bin 'FH6CarPlay.addon64'
$source = Join-Path $root 'dist\FH6CarPlay.addon64'
if (!(Test-Path -LiteralPath (Join-Path $bin 'eurotrucks2.exe'))) { throw 'Oyun yolu geçersiz.' }
if (!(Test-Path -LiteralPath $source)) { throw 'Yeni eklenti paketi bulunamadı.' }
if (!(Test-Path -LiteralPath $target)) { throw 'Mevcut eklenti yok; ilk kurulum için Install.cmd kullan.' }
if ((Get-FileHash -LiteralPath $source).Hash -eq (Get-FileHash -LiteralPath $target).Hash) { Write-Output 'Eklenti zaten güncel.'; exit 0 }
$backup = $target + '.' + [Guid]::NewGuid().ToString('N') + '.bak'
[System.IO.File]::Copy($target, $backup, $false)
try {
  [System.IO.File]::Copy($source, $target, $true)
  if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw 'Kopya doğrulanamadı.' }
} catch {
  [System.IO.File]::Copy($backup, $target, $true)
  throw
}
Write-Output ('Eklenti 0.2.1 olarak güncellendi. Yedek: ' + $backup)
Write-Output 'Oyunu tekrar açıp FH6 kabinine geç. Mevcut mod ve oynatıcı aynı şekilde kullanılabilir.'
