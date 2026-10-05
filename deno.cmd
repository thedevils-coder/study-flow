@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"

if exist "%ROOT%node_modules\deno\deno.exe" (
  "%ROOT%node_modules\deno\deno.exe" %*
  exit /b %ERRORLEVEL%
)
if exist "%ROOT%node_modules\@deno\win32-x64\deno.exe" (
  "%ROOT%node_modules\@deno\win32-x64\deno.exe" %*
  exit /b %ERRORLEVEL%
)
if exist "%ROOT%node_modules\@deno\win32-arm64\deno.exe" (
  "%ROOT%node_modules\@deno\win32-arm64\deno.exe" %*
  exit /b %ERRORLEVEL%
)
if exist "%ROOT%node_modules\deno\bin.cjs" (
  node "%ROOT%node_modules\deno\bin.cjs" %*
  exit /b %ERRORLEVEL%
)

echo Deno is not installed. Run npm install in the project root. 1>&2
exit /b 1
