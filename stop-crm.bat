@echo off
setlocal EnableExtensions

echo.
echo ================================
echo   Cosmetics CRM stop launcher
echo ================================
echo.

set "FOUND="

for %%P in (4000 5173) do (
  call :stop_port %%P
)

if not defined FOUND (
  echo [INFO] No CRM processes were found on ports 4000 or 5173.
)

echo.
echo Done.
pause
exit /b 0

:stop_port
set "PORT=%~1"
set "PIDS="

for /f "tokens=5" %%I in ('netstat -ano -p tcp ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  call set "PIDS=%%PIDS%% %%I"
)

if "%PIDS%"=="" (
  echo [INFO] Port %PORT% is not listening.
  exit /b 0
)

for %%I in (%PIDS%) do (
  echo [INFO] Stopping process %%I on port %PORT%...
  taskkill /PID %%I /T /F >nul 2>nul
  if errorlevel 1 (
    echo [WARN] Could not stop process %%I. Try closing its window manually.
  ) else (
    set "FOUND=1"
    echo [OK] Stopped process %%I.
  )
)

exit /b 0
