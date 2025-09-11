@echo off
:: Versione ultra-veloce per avvio automatico Windows
:: Con apertura automatica del terminale
setlocal enabledelayedexpansion

:: Imposta variabili
set "EXE_PATH=%~dp0cruscotto-local-opener-setup.exe"
set "SERVICE_NAME=LocalOpener"
set "TASK_NAME=LocalOpenerTerminal"

:: Verifica rapida se il servizio è già attivo
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio LocalOpener già attivo
    echo.
    echo Per aprire il terminale manualmente:
    echo 1. Premi Win+R
    echo 2. Digita: sc start LocalOpener
    echo 3. Premi Invio
    echo.
    goto :end
)

:: Avvio diretto senza echo non necessari
echo Avvio servizio Local Opener...
echo.

:: Avvia il servizio
sc start "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio avviato con successo
) else (
    echo  Errore avvio servizio
    echo Tentativo avvio diretto eseguibile...
    start "" "%EXE_PATH%"
    goto :end
)

:: Attendi che il servizio si avvii
timeout /t 3 /nobreak >nul

:: Verifica che il servizio sia attivo
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio attivo e funzionante
    echo.
    echo Il terminale dovrebbe aprirsi automaticamente.
    echo Se non si apre, verifica il task scheduler:
    echo   schtasks /query /tn "%TASK_NAME%"
) else (
    echo  Servizio non attivo
    echo Avvio diretto dell'eseguibile...
    start "" "%EXE_PATH%"
)

:end
:: Fine rapida senza pause
exit /b 0
