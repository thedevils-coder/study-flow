$Root = $PSScriptRoot
$Exe = Join-Path $Root '.tools\bin\deno.exe'
$Installer = Join-Path $Root 'scripts\install-deno.cjs'

if (-not (Test-Path -LiteralPath $Exe)) {
  & node $Installer
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (Test-Path -LiteralPath $Exe) {
  & $Exe @args
  exit $LASTEXITCODE
}

Write-Error 'Deno is not installed. Run npm install in the project root.'
exit 1
