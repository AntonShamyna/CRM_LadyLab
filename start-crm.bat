@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ================================
echo   Cosmetics CRM local launcher
echo ================================
echo.

call :find_node
if not defined NODE_EXE (
  echo [ERROR] Node.js was not found.
  echo.
  echo Install Node.js 22 LTS or newer, or run this from Codex Desktop
  echo where the bundled Node runtime is available.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%.env" (
  if exist "%ROOT%.env.example" (
    echo [INFO] Creating .env from .env.example...
    copy "%ROOT%.env.example" "%ROOT%.env" >nul
  )
)

if not exist "%ROOT%node_modules\vite\bin\vite.js" (
  echo [ERROR] Dependencies are missing: node_modules\vite\bin\vite.js was not found.
  echo.
  echo Run npm install or pnpm install first, then start this file again.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%.codex-dev-api.mjs" (
  echo [ERROR] Local dev API file was not found: .codex-dev-api.mjs
  echo.
  pause
  exit /b 1
)

echo [INFO] Node: %NODE_EXE%
echo.

call :port_listening 4000
if errorlevel 1 (
  echo [INFO] Starting dev API on http://127.0.0.1:4000/api ...
  start "Cosmetics CRM Dev API" cmd /k ""%ROOT%.codex-run-dev-api.cmd""
) else (
  echo [INFO] API already listens on port 4000.
)

call :port_listening 5173
if errorlevel 1 (
  echo [INFO] Starting frontend on http://127.0.0.1:5173 ...
  start "Cosmetics CRM Web" cmd /k ""%ROOT%.codex-run-web.cmd""
) else (
  echo [INFO] Frontend already listens on port 5173.
)

echo.
echo ================================
echo CRM is starting.
echo.
echo Frontend: http://127.0.0.1:5173
echo API:      http://127.0.0.1:4000/api
echo.
echo Login:    admin
echo Password: admin12345
echo ================================
echo.

echo Waiting a few seconds before opening the site...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 4" >nul 2>nul
start http://127.0.0.1:5173

endlocal
exit /b 0

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

:port_listening
netstat -ano -p tcp | findstr /R /C:":%~1 .*LISTENING" >nul
exit /b %errorlevel%
