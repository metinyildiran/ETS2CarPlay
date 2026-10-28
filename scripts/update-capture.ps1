$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
& node (Join-Path $root 'scripts/update-browser-package.cjs')
if($LASTEXITCODE){throw 'Tarayici paketi guncellenemedi.'}