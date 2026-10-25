param([string]$PackagePath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone'))
$ErrorActionPreference='Stop'
if (Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue) { throw 'Once ETS2 oyununu kapat.' }
$manifestPath=Join-Path $PackagePath 'Installation.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
# Refuse to overwrite anything edited since installation.
foreach ($action in $manifest.Actions) {
  $current=if(Test-Path -LiteralPath $action.Target){(Get-FileHash -LiteralPath $action.Target).Hash}else{$null}
  if ($current -ne $action.After) { throw "Kurulumdan sonra degisen dosyaya dokunulmadi: $($action.Target)" }
  if ($action.Backup -and (Get-FileHash -LiteralPath $action.Backup).Hash -ne $action.Before) { throw 'Yedek dosya degismis.' }
}
foreach ($action in $manifest.Actions) {
  if ($action.Backup) { [IO.File]::Copy($action.Backup,$action.Target,$true) }
  elseif (Test-Path -LiteralPath $action.Target) { Remove-Item -LiteralPath $action.Target }
}
Move-Item -LiteralPath $manifestPath -Destination ($manifestPath+'.restored-'+[Guid]::NewGuid().ToString('N'))
Write-Output 'Onceki mod, eklenti ve ReShade geri yuklendi.'
