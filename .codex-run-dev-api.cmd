@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
cd /d "%ROOT%"

call :find_node
if not defined NODE_EXE (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 22 LTS or newer and keep Add to PATH enabled.
  pause
  exit /b 1
)

echo [INFO] Node: %NODE_EXE%
echo [INFO] Starting dev API...
"%NODE_EXE%" "%ROOT%.codex-dev-api.mjs"

echo.
echo [ERROR] Dev API stopped.
pause
exit /b 1

:find_node
if exist "%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe" (
  set "NODE_EXE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe"
  exit /b 0
)
for /f "delims=" %%I in ('where node 2^>nul') do (
  echo %%I | findstr /I /C:"WindowsApps" >nul
  if errorlevel 1 (
    if not defined NODE_EXE set "NODE_EXE=%%I"
  )
)
exit /b 0
