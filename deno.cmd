@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "DENO_EXE=%ROOT%.tools\bin\deno.exe"

if not exist "%DENO_EXE%" (
  node "%ROOT%scripts\install-deno.cjs"
  if errorlevel 1 exit /b 1
)

if exist "%DENO_EXE%" (
  "%DENO_EXE%" %*
  exit /b %ERRORLEVEL%
)

echo Deno is not installed. Run npm install in the project root. 1>&2
exit /b 1
