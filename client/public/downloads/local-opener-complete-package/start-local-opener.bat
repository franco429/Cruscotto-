@echo off
title Local Opener Service - Avvio Rapido
setlocal enabledelayedexpansion

:: Ottimizzazioni per avvio rapido
set "EXE_PATH=%~dp0cruscotto-local-opener-setup.exe"
set "SERVICE_NAME=LocalOpener"

:: Verifica rapida se il servizio è già attivo
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio LocalOpener già attivo
    goto :end
)

:: Avvio diretto senza echo non necessari
echo Avvio servizio Local Opener...
start "" "%EXE_PATH%"

:end
:: Fine rapida senza pause
exit /b 0
