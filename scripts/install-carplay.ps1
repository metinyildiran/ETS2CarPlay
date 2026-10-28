param([string]$GamePath,[string]$DocumentsPath,[string]$PackagePath,[string]$ManifestPath)
$ErrorActionPreference='Stop'
try {
 if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu tamamen kapat. Acik oyuna degisiklik yapilmadi.'}
 if([string]::IsNullOrWhiteSpace($PackagePath)){$PackagePath=Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\browser-0.7.0'}
 if($ManifestPath){
  & (Join-Path $PSScriptRoot 'install-package.ps1') -GamePath $GamePath -DocumentsPath $DocumentsPath -PackagePath $PackagePath -ManifestPath $ManifestPath
  exit $LASTEXITCODE
 }
 . (Join-Path $PSScriptRoot 'install-managed.ps1')
 Install-CarPlayManaged -GamePath $GamePath -DocumentsPath $DocumentsPath -Source $PackagePath
 exit 0
} catch {
 Write-Host "Kurulum tamamlanamadi: $($_.Exception.Message)" -ForegroundColor Red
 exit 1
}
