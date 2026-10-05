$Root = $PSScriptRoot
$Candidates = @(
  (Join-Path $Root 'node_modules\deno\deno.exe'),
  (Join-Path $Root 'node_modules\@deno\win32-x64\deno.exe'),
  (Join-Path $Root 'node_modules\@deno\win32-arm64\deno.exe')
)

foreach ($Exe in $Candidates) {
  if (Test-Path -LiteralPath $Exe) {
    & $Exe @args
    exit $LASTEXITCODE
  }
}

$BinCjs = Join-Path $Root 'node_modules\deno\bin.cjs'
if (Test-Path -LiteralPath $BinCjs) {
  & node $BinCjs @args
  exit $LASTEXITCODE
}

Write-Error 'Deno is not installed. Run npm install in the project root.'
exit 1
