$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
& node (Join-Path $PSScriptRoot 'build-mod.js')
if ($LASTEXITCODE -ne 0) { throw 'Mod üretilemedi.' }
New-Item -ItemType Directory -Path (Join-Path $root 'dist') -Force | Out-Null
# Create ZIP entries with forward slashes, as used by SCS virtual paths.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$output = Join-Path $root 'dist\FH6YouTube.scs'
$base = (Resolve-Path (Join-Path $root 'build\mod')).Path
$file = [System.IO.File]::Open($output, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($file, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($item in Get-ChildItem -LiteralPath $base -Recurse -File) {
    $name = $item.FullName.Substring($base.Length + 1).Replace('\','/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $item.FullName, $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $zip.Dispose(); $file.Dispose() }
Get-FileHash -Algorithm SHA256 (Join-Path $root 'dist\FH6CarPlay.addon64'),$output | Format-Table -AutoSize
$bundlePath = Join-Path $root 'dist\FH6CarPlay-0.2.1.zip'
$bundleFile = [System.IO.File]::Open($bundlePath, [System.IO.FileMode]::Create)
$bundle = New-Object System.IO.Compression.ZipArchive($bundleFile, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $entries = @('README.md','Install.cmd','Update.cmd','Start-Player.cmd','package.json','scripts\install.ps1','scripts\update-addon.ps1','dist\FH6CarPlay.addon64','dist\FH6YouTube.scs','vendor\reshade\LICENSE.md')
  foreach ($dir in @('src','ui')) {
    foreach ($item in Get-ChildItem -LiteralPath (Join-Path $root $dir) -File) { $entries += ($dir + '\' + $item.Name) }
  }
  foreach ($entry in $entries) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($bundle, (Join-Path $root $entry), $entry.Replace('\','/'), [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $bundle.Dispose(); $bundleFile.Dispose() }
Write-Output $bundlePath
