$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$extension=Join-Path $root 'dist\browser-0.5.0\Extension'
if(!(Test-Path -LiteralPath "$extension\config.json")){throw 'Eslesmis tarayici eklentisi bulunamadi.'}
$pairingHash=(Get-FileHash -LiteralPath "$extension\config.json").Hash
$backup=Join-Path $root ('dist\capture-0.6.1\backup-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$changes=@()
foreach($name in 'frames.js','manifest.json'){
 $target=Join-Path $extension $name
 Copy-Item -LiteralPath $target -Destination (Join-Path $backup $name)
 $changes+=@([pscustomobject]@{Target=$target;Source=(Join-Path $root "browser-extension\$name");Backup=(Join-Path $backup $name)})
}
try{
 foreach($change in $changes){Copy-Item -LiteralPath $change.Source -Destination $change.Target -Force;if((Get-FileHash -LiteralPath $change.Source).Hash -ne (Get-FileHash -LiteralPath $change.Target).Hash){throw 'Eklenti kopyasi dogrulanamadi.'}}
 if((Get-FileHash -LiteralPath "$extension\config.json").Hash -ne $pairingHash){throw 'Eslesme ayari degisti.'}
 $changes | ConvertTo-Json | Set-Content -LiteralPath "$backup\Changes.json" -Encoding UTF8
}catch{foreach($change in $changes){Copy-Item -LiteralPath $change.Backup -Destination $change.Target -Force};throw}
Write-Output 'Capture 0.6.1 installed. Reload the browser extension and start capture again. No game restart required.'
