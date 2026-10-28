function Get-CarPlaySteamRoots {
 $paths=@()
 foreach($key in @('HKCU:\Software\Valve\Steam','HKLM:\SOFTWARE\WOW6432Node\Valve\Steam','HKLM:\SOFTWARE\Valve\Steam')){
  try{$item=Get-ItemProperty -LiteralPath $key -ErrorAction Stop;foreach($name in @('SteamPath','InstallPath')){if($item.$name){$paths+=$item.$name}}}catch{}
 }
 foreach($base in @(${env:ProgramFiles(x86)},$env:ProgramFiles)){if($base){$paths+=Join-Path $base 'Steam'}}
 return @($paths | Where-Object {Test-Path -LiteralPath $_ -PathType Container} | Sort-Object -Unique)
}

function Find-CarPlayGamePaths([string[]]$SteamRoots=(Get-CarPlaySteamRoots)) {
 $libraries=@($SteamRoots)
 foreach($steam in $SteamRoots){
  $file=Join-Path $steam 'steamapps\libraryfolders.vdf'
  if(Test-Path -LiteralPath $file){
   $vdf=Get-Content -LiteralPath $file -Raw
   foreach($match in [regex]::Matches($vdf,'"(?:path|\d+)"\s+"((?:\\.|[^"\\])+)"')){
    $candidate=$match.Groups[1].Value.Replace('\\','\')
    if([IO.Path]::IsPathRooted($candidate)){$libraries+=$candidate}
   }
  }
 }
 $games=@()
 foreach($library in @($libraries | Sort-Object -Unique)){
  $manifest=Join-Path $library 'steamapps\appmanifest_227300.acf'
  if(!(Test-Path -LiteralPath $manifest)){continue}
  $acf=Get-Content -LiteralPath $manifest -Raw
  $dir=[regex]::Match($acf,'"installdir"\s+"([^"\\/]+)"')
  if(!$dir.Success -or $dir.Groups[1].Value -in @('.','..')){continue}
  $game=Join-Path (Join-Path $library 'steamapps\common') $dir.Groups[1].Value
  if(Test-Path -LiteralPath (Join-Path $game 'bin\win_x64\eurotrucks2.exe') -PathType Leaf){$games+=[IO.Path]::GetFullPath($game)}
 }
 return @($games | Sort-Object -Unique)
}

function Find-CarPlayDocumentsPath([string]$KnownDocuments=[Environment]::GetFolderPath('MyDocuments')) {
 # Windows resolves redirected/OneDrive Documents here; do not guess a drive.
 if($KnownDocuments){
  $candidate=Join-Path $KnownDocuments 'Euro Truck Simulator 2'
  if(Test-Path -LiteralPath $candidate -PathType Container){return [IO.Path]::GetFullPath($candidate)}
 }
 return $null
}

function Select-CarPlayGamePath([string[]]$Candidates) {
 if($Candidates.Count -eq 1){return $Candidates[0]}
 if($Candidates.Count -gt 1){
  Write-Host 'Birden fazla ETS2 kurulumu bulundu:'
  for($i=0;$i -lt $Candidates.Count;$i++){Write-Host ("{0}. {1}" -f ($i+1),$Candidates[$i])}
  $choice=Read-Host 'Kurulacak oyunun numarasi'
  $number=0
  if(![int]::TryParse($choice,[ref]$number) -or $number -lt 1 -or $number -gt $Candidates.Count){throw 'Gecerli bir kurulum secilmedi.'}
  return $Candidates[$number-1]
 }
 throw 'ETS2 Steam kutuphanelerinde bulunamadi. Oyunu Steam uzerinden kurup bir kez acin veya kurucuyu -GamePath ile calistirin.'
}
