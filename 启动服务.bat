@echo off
title snfont manager - start
echo ============================================
echo   snfont icon manager - local server
echo ============================================
echo.
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js not found. Please install: https://nodejs.org/
  pause
  exit /b 1
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 2333 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
  echo [INFO] Server already running.
) else (
  echo [INFO] Starting local server...
  powershell -NoProfile -Command "Start-Process -FilePath node -ArgumentList 'server.mjs','2333' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
  ping -n 2 127.0.0.1 >nul
)

echo.
echo [INFO] Opening browser...
start "" "http://localhost:2333"

echo.
echo ============================================
echo   Server started: http://localhost:2333
echo   Closing this window does NOT stop server.
echo   To stop, run "close-server.bat"
echo ============================================
echo.
pause
