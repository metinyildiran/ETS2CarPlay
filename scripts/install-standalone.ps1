param(
  [string]$GamePath = 'D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2',
  [string]$DocumentsPath = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Euro Truck Simulator 2'),
  [string]$PackagePath,
  [string]$ManifestPath,
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
if([string]::IsNullOrWhiteSpace($PackagePath)){$PackagePath=Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone'}
if([string]::IsNullOrWhiteSpace($ManifestPath)){$ManifestPath=Join-Path $PackagePath 'Installation.json'}
if (Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue) { throw 'ETS2 acik. Once oyunu kapat; hicbir dosya degistirilmedi.' }
$PackagePath = [IO.Path]::GetFullPath($PackagePath)
$bin = Join-Path $GamePath 'bin\win_x64'
$mod = Join-Path $DocumentsPath 'mod'
if (!(Test-Path -LiteralPath "$bin\eurotrucks2.exe")) { throw 'ETS2 oyun yolu bulunamadi.' }
if (!(Test-Path -LiteralPath $DocumentsPath)) { throw 'ETS2 belgeler klasoru bulunamadi.' }
$packageInfo=Get-Content -LiteralPath (Join-Path $PackagePath 'Player\resources\app\package.json') -Raw | ConvertFrom-Json
$required=@('FH6Standalone.dll','Player\electron.exe','Player\resources\app\main.cjs')
if(!$packageInfo.fh6WorkshopOnly){$required+='FH6YouTubeNavigation.scs'}
foreach ($file in $required) {
  if (!(Test-Path -LiteralPath (Join-Path $PackagePath $file))) { throw "Paket eksik: $file" }
}
if (Test-Path -LiteralPath $manifestPath) { throw 'Bu paket zaten kuruldu. Yeniden kurmak icin Install.cmd dosyasini calistir.' }
$actions = @()
foreach ($file in @('dxgi.dll','d3d11.dll')) {
  $path = Join-Path $bin $file
  if (Test-Path -LiteralPath $path) {
    $info = (Get-Item -LiteralPath $path).VersionInfo
    if ($info.ProductName -ne 'ReShade') { throw "Taninmayan grafik eklentisine dokunulmadi: $path" }
    $actions += [pscustomobject]@{ Target=$path; Source=$null; Backup=$null; Before=$null; After=$null }
  }
}
$oldAddon = Join-Path $bin 'FH6CarPlay.addon64'
if (Test-Path -LiteralPath $oldAddon) { $actions += [pscustomobject]@{Target=$oldAddon;Source=$null;Backup=$null;Before=$null;After=$null} }
$actions += [pscustomobject]@{Target=(Join-Path $bin 'plugins\FH6Standalone.dll');Source=(Join-Path $PackagePath 'FH6Standalone.dll');Backup=$null;Before=$null;After=$null}
if(!$packageInfo.fh6WorkshopOnly){$actions += [pscustomobject]@{Target=(Join-Path $mod 'FH6YouTube.scs');Source=(Join-Path $PackagePath 'FH6YouTubeNavigation.scs');Backup=$null;Before=$null;After=$null}}
foreach ($action in $actions) {
  if (Test-Path -LiteralPath $action.Target) { $action.Before=(Get-FileHash -LiteralPath $action.Target -Algorithm SHA256).Hash }
  if ($action.Source) { $action.After=(Get-FileHash -LiteralPath $action.Source -Algorithm SHA256).Hash }
}
if ($CheckOnly) { $actions | Select-Object Target,Source,Before,After | ConvertTo-Json; return }
$backup = Join-Path $PackagePath ('Backups\'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
# Back up everything before touching the game. Each target has its own immutable copy.
for ($i=0; $i -lt $actions.Count; $i++) {
  $action=$actions[$i]
  if ($action.Before) {
    $action.Backup=Join-Path $backup ("$i-"+[IO.Path]::GetFileName($action.Target))
    [IO.File]::Copy($action.Target,$action.Backup,$false)
    if ((Get-FileHash -LiteralPath $action.Backup).Hash -ne $action.Before) { throw 'Yedek dogrulamasi basarisiz.' }
  }
}
$manifest=[pscustomobject]@{Version='0.3.0-experimental';InstalledAt=[DateTime]::UtcNow.ToString('o');GamePath=$GamePath;Actions=$actions}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backup 'Installation.json') -Encoding UTF8
$completed=@()
try {
  foreach ($action in $actions) {
    if (Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue) { throw 'ETS2 kurulum sirasinda acildi.' }
    $current=if(Test-Path -LiteralPath $action.Target){(Get-FileHash -LiteralPath $action.Target).Hash}else{$null}
    if ($current -ne $action.Before) { throw "Dosya kurulum sirasinda degisti: $($action.Target)" }
    $completed += $action
    if ($action.Source) {
      New-Item -ItemType Directory -Path (Split-Path $action.Target -Parent) -Force | Out-Null
      [IO.File]::Copy($action.Source,$action.Target,$true)
      if ((Get-FileHash -LiteralPath $action.Target).Hash -ne $action.After) { throw 'Kurulum dogrulamasi basarisiz.' }
    } else { Remove-Item -LiteralPath $action.Target }
  }
  New-Item -ItemType Directory -Path (Split-Path ([IO.Path]::GetFullPath($manifestPath)) -Parent) -Force | Out-Null
  $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
} catch {
  [array]::Reverse($completed)
  foreach ($action in $completed) {
    if ($action.Backup) { [IO.File]::Copy($action.Backup,$action.Target,$true) }
    elseif (Test-Path -LiteralPath $action.Target) { Remove-Item -LiteralPath $action.Target }
  }
  throw
}
Write-Output 'Temel kurulum tamamlandi.'
