@echo off
title snfont manager - stop
echo ============================================
echo   snfont icon manager - stop local server
echo ============================================
echo.
echo [INFO] Stopping port 2333...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 2333 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
echo.
echo Done. You may close this window.
pause
