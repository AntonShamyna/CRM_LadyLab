@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ================================
echo   Cosmetics CRM installer
echo ================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo.
  echo Install Node.js 22 LTS or newer from:
  echo https://nodejs.org/en/download
  echo.
  echo During installation, keep "Add to PATH" enabled.
  echo Then close this window and run install-crm.bat again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo.
  echo npm is normally installed together with Node.js.
  echo Reinstall Node.js 22 LTS or newer and keep "Add to PATH" enabled.
  echo.
  pause
  exit /b 1
)

echo [INFO] Node version:
node -v
echo [INFO] npm version:
npm -v
echo.

if not exist "%ROOT%.env" (
  if exist "%ROOT%.env.example" (
    echo [INFO] Creating .env from .env.example...
    copy "%ROOT%.env.example" "%ROOT%.env" >nul
  )
)

echo [INFO] Installing project dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  echo Check your internet connection and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo [INFO] Building shared package...
call "%ROOT%node_modules\.bin\tsc.cmd" -p "%ROOT%packages\shared\tsconfig.json"
if errorlevel 1 (
  echo.
  echo [ERROR] Shared package build failed.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================
echo Installation complete.
echo.
echo Next step:
echo   Run start-crm.bat
echo.
echo Login:    admin
echo Password: admin12345
echo ================================
echo.
pause
exit /b 0
