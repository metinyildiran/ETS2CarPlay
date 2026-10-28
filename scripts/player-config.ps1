function Get-CarPlayExistingPlayerConfig([string]$Path) {
 if(!(Test-Path -LiteralPath $Path)){return $null}
 $before=(Get-FileHash -LiteralPath $Path).Hash
 $lines=@(Get-Content -LiteralPath $Path | Where-Object {$_.Trim().Length -gt 0})
 if($lines.Count -ne 2 -or $lines[0].Trim() -cne '[Player]' -or $lines[1] -cnotmatch '^Executable=([A-Za-z]:\\.+\\electron\.exe)$'){
  throw 'Mevcut oynatici ayari taninamadi; dosya degistirilmedi.'
 }
 $executable=$Matches[1]
 $app=Join-Path (Split-Path $executable -Parent) 'resources\app'
 try{
  $package=Get-Content -LiteralPath (Join-Path $app 'package.json') -Raw | ConvertFrom-Json
  $main=Get-Content -LiteralPath (Join-Path $app 'main.cjs') -Raw
 }catch{throw 'Onceki CarPlay paketi bulunamadi; mevcut ayar degistirilmedi.'}
 if(!(Test-Path -LiteralPath $executable) -or $package.fh6Mode -ne 'browser' -or $package.fh6NativeRevision -notmatch '^\d+\.\d+\.\d+$' -or $main -notmatch 'browser-host\.cjs'){
  throw 'Mevcut oynatici CarPlay olarak dogrulanamadi; dosya degistirilmedi.'
 }
 if(Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $executable}){throw 'CarPlay yardimcisi henuz kapanmadi. Oyundan ciktiktan sonra biraz bekle.'}
 if((Get-FileHash -LiteralPath $Path).Hash -ne $before){throw 'Oynatici ayari kontrol sirasinda degisti.'}
 return [pscustomobject]@{Executable=$executable;Hash=$before}
}
