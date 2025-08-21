@echo off
chcp 65001 >nul
echo.
echo CRUSCOTTO LOCAL OPENER - DIAGNOSTICA SERVIZIO
echo ===============================================
echo.
echo Questo script esegue una diagnostica completa del servizio
echo Local Opener per identificare eventuali problemi.
echo.
pause

echo.
echo Avvio diagnostica...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostica-servizio.ps1"

echo.
echo Diagnostica completata.
echo.
pause
