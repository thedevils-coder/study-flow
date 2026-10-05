# Prepend the project-local Deno binary directory to PATH for this session.
# Does not modify the user or machine PATH.
$Root = Split-Path -Parent $PSScriptRoot
$BinDir = Join-Path $Root '.tools\bin'
if (Test-Path -LiteralPath (Join-Path $BinDir 'deno.exe')) {
  $env:Path = $BinDir + ';' + $env:Path
}
