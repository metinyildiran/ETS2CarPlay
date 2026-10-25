param(
 [Parameter(Mandatory=$true)][ValidateSet('On','Off')][string]$Mode,
 [string]$ManifestPath
)
$ErrorActionPreference='Stop'
# Windows PowerShell 5.1 may evaluate parameter defaults before PSScriptRoot
# is populated. Resolve the default after parameter binding for both launchers.
if([string]::IsNullOrWhiteSpace($ManifestPath)){
 $ManifestPath=Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\standalone\Installation.json'
}
if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Once ETS2 oyununu tamamen kapat. Yuklu SDK oyun yeniden baslatilana kadar kapanmaz.'}
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$target=Join-Path $manifest.GamePath 'bin\win_x64\plugins\FH6Standalone.dll'
$actions=@($manifest.Actions | Where-Object {$_.Target -eq $target})
if($actions.Count -ne 1){throw 'CarPlay DLL kurulum kaydi bulunamadi.'}
$action=$actions[0]
$actual=if(Test-Path -LiteralPath $target){(Get-FileHash -LiteralPath $target).Hash}else{$null}
if($actual -ne $action.After){throw 'DLL kurulumdan sonra degismis. Degistirilmedi.'}
$backupRoot=Join-Path (Split-Path $ManifestPath -Parent) 'ConvoyBackups'
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$backup=Join-Path $backupRoot ([Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item -LiteralPath $ManifestPath -Destination "$backup\Installation.json"
if($Mode -eq 'Off'){
 if(!$actual){Write-Output 'CarPlay SDK zaten kapali.';return}
 $saved=Join-Path $backup 'FH6Standalone.dll'
 Copy-Item -LiteralPath $target -Destination $saved
 if((Get-FileHash -LiteralPath $saved).Hash -ne $actual){throw 'Yedek dogrulanamadi.'}
 try{
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Oyun acildi; islem iptal edildi.'}
  if((Get-FileHash -LiteralPath $target).Hash -ne $actual){throw 'DLL islem sirasinda degisti.'}
  Remove-Item -LiteralPath $target
  $action.After=$null
  $manifest | Add-Member -NotePropertyName NativeSuspended -NotePropertyValue ([pscustomobject]@{Path=$saved;Hash=$actual}) -Force
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
 }catch{
  if(!(Test-Path -LiteralPath $target)){Copy-Item -LiteralPath $saved -Destination $target}
  Copy-Item -LiteralPath "$backup\Installation.json" -Destination $ManifestPath -Force
  throw
 }
 Write-Output 'CarPlay SDK kapatildi ve yedeklendi. Oyunu yeniden acip konvoyu yeniden olustur.'
}else{
 if($actual){Write-Output 'CarPlay SDK zaten acik.';return}
 $saved=$manifest.NativeSuspended.Path;$expected=$manifest.NativeSuspended.Hash
 if(!$saved -or !(Test-Path -LiteralPath $saved) -or (Get-FileHash -LiteralPath $saved).Hash -ne $expected){throw 'Dogrulanmis CarPlay yedegi bulunamadi.'}
 $created=$false
 try{
  if(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue){throw 'Oyun acildi; islem iptal edildi.'}
  [IO.File]::Copy($saved,$target,$false);$created=$true
  if((Get-FileHash -LiteralPath $target).Hash -ne $expected){throw 'Geri yukleme dogrulanamadi.'}
  $action.After=$expected
  $manifest.PSObject.Properties.Remove('NativeSuspended')
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
 }catch{
  if($created){Remove-Item -LiteralPath $target}
  Copy-Item -LiteralPath "$backup\Installation.json" -Destination $ManifestPath -Force
  throw
 }
 Write-Output 'CarPlay SDK yeniden acildi. Oyun icindeki ekran modunu da etkinlestir.'
}
