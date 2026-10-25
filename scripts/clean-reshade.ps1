$ErrorActionPreference='Stop'
$bin=[IO.Path]::GetFullPath('D:\SteamLibrary\steamapps\common\Euro Truck Simulator 2\bin\win_x64')
$backup=Join-Path (Split-Path $PSScriptRoot -Parent) ('build\reshade-cleanup-'+[Guid]::NewGuid().ToString('N'))
foreach($process in @(Get-Process -Name eurotrucks2 -ErrorAction SilentlyContinue)) {
  if($process.Modules | Where-Object {$_.FileVersionInfo.ProductName -eq 'ReShade'}) { throw 'ReShade is loaded; close the game before cleanup.' }
}
$names=@('ReShade.ini','ReShade.ini.renodx-dlss5-pre-v4-migration-20261014-161839.bak','ReShade.log','ReShadePreset.ini','reshade-shaders')
$targets=@()
foreach($name in $names){
  $path=[IO.Path]::GetFullPath((Join-Path $bin $name))
  if(!(Test-Path -LiteralPath $path)){continue}
  $resolved=(Resolve-Path -LiteralPath $path).Path
  if($resolved -ne $path -or [IO.Path]::GetDirectoryName($resolved) -ne $bin){throw 'Cleanup path outside expected game folder'}
  $item=Get-Item -LiteralPath $resolved -Force
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refusing reparse point'}
  if($item.PSIsContainer -and (Get-ChildItem -LiteralPath $resolved -Recurse -Force | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint})){throw 'Refusing nested reparse point'}
  $targets += $item
}
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach($item in $targets){Copy-Item -LiteralPath $item.FullName -Destination $backup -Recurse}
foreach($item in $targets){Remove-Item -LiteralPath $item.FullName -Recurse -Force}
Write-Output "Removed ReShade leftovers from game folder. Recovery copy: $backup"
