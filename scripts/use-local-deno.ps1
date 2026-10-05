# Prepend the npm-installed Deno executable directory to PATH for this session.
# Used by Cursor's Windows PowerShell profile. Does not modify the user/machine PATH.
$Root = Split-Path -Parent $PSScriptRoot
$DenoDir = Join-Path $Root 'node_modules\deno'
$BinDir = Join-Path $Root 'node_modules\.bin'
$Prepend = @()

if (Test-Path -LiteralPath (Join-Path $DenoDir 'deno.exe')) {
  $Prepend += $DenoDir
} elseif (Test-Path -LiteralPath (Join-Path $DenoDir 'deno')) {
  $Prepend += $DenoDir
}

if (Test-Path -LiteralPath $BinDir) {
  $Prepend += $BinDir
}

if ($Prepend.Count -gt 0) {
  $env:Path = ($Prepend + $env:Path) -join ';'
}
