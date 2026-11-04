# Downloads a private copy of Node.js (with npm, its add-on installer) into this folder.
# Used only if Node.js isn't installed. No admin rights needed. Checked against the official checksum.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ver = 'v22.11.0'
$name = "node-$ver-win-x64"
$sha256 = '905373a059aecaf7f48c1ce10ffbd5334457ca00f678747f19db5ea7d256c236'   # from nodejs.org/dist/v22.11.0/SHASUMS256.txt
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = Join-Path $env:TEMP "$name.zip"
try {
  Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/$name.zip" -OutFile $zip -UseBasicParsing
  $actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $sha256) { throw "The download didn't match the official checksum, so it wasn't used." }
  $tmp = Join-Path $here 'node-unpack'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $dest = Join-Path $here 'node'
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Move-Item (Join-Path $tmp $name) $dest
  Remove-Item $tmp -Recurse -Force
  Write-Host "Node.js is ready."
} catch {
  Write-Host ("Couldn't set up Node.js: " + $_.Exception.Message)
} finally {
  if (Test-Path $zip) { Remove-Item $zip -Force }
}
