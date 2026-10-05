@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%node_modules\deno\deno.exe" (
  "%SCRIPT_DIR%node_modules\deno\deno.exe" %*
  exit /b %ERRORLEVEL%
)
if exist "%SCRIPT_DIR%node_modules\.bin\deno.cmd" (
  "%SCRIPT_DIR%node_modules\.bin\deno.cmd" %*
  exit /b %ERRORLEVEL%
)
echo Deno is not installed. Run npm install in the project root. 1>&2
exit /b 1
