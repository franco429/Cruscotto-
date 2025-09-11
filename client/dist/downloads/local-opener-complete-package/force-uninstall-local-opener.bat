@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    RIMOZIONE FORZATA LOCAL OPENER
echo    SERVIZIO E CONFIGURAZIONI
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    echo.
    echo Per eseguire come amministratore:
    echo 1. Tasto destro su questo file
    echo 2. "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set NSSM_PATH=%~dp0nssm.exe
set LOG_DIR=C:\Logs\LocalOpener
set STARTUP_SCRIPT=%~dp0start-local-opener.bat

echo RIMOZIONE FORZATA del servizio %SERVICE_NAME%
echo ATTENZIONE: Questa operazione rimuoverà completamente il servizio!
echo.

:: Conferma rimozione
set /p choice="Sei sicuro di voler rimuovere FORZATAMENTE il servizio? (S/N): "
if /i "!choice!" neq "S" (
    echo Rimozione annullata.
    pause
    exit /b 0
)

echo.
echo Inizio rimozione forzata...
echo.

:: 1. Ferma forzatamente il servizio
echo - Arresto forzato del servizio...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 3 >nul

:: 2. Rimuovi il servizio
echo - Rimozione servizio da Windows...
sc delete "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio rimosso da Windows
) else (
    echo  Errore rimozione servizio Windows
)

:: 3. Rimuovi configurazioni NSSM se esiste
if exist "%NSSM_PATH%" (
    echo - Rimozione configurazioni NSSM...
    "%NSSM_PATH%" remove "%SERVICE_NAME%" confirm >nul 2>&1
    echo  Configurazioni NSSM rimosse
)

:: 4. Rimuovi directory log
if exist "%LOG_DIR%" (
    echo - Rimozione directory log...
    rmdir /s /q "%LOG_DIR%" >nul 2>&1
    echo  Directory log rimossa
)

:: 5. Rimuovi script di avvio personalizzato
if exist "%STARTUP_SCRIPT%" (
    echo - Rimozione script di avvio personalizzato...
    del "%STARTUP_SCRIPT%" >nul 2>&1
    echo  Script di avvio rimosso
)

:: 6. Rimuovi da avvio automatico Windows
echo - Rimozione da avvio automatico Windows...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "LocalOpener" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "LocalOpener" /f >nul 2>&1
echo  Avvio automatico rimosso

:: 7. Rimuovi processi rimasti
echo - Rimozione processi rimasti...
taskkill /f /im "cruscotto-local-opener-setup.exe" >nul 2>&1
taskkill /f /im "LocalOpener.exe" >nul 2>&1
echo  Processi rimossi

:: 8. Pulizia registro
echo - Pulizia registro Windows...
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\%SERVICE_NAME%" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\NSSM" /f >nul 2>&1
echo  Registro pulito

echo.
echo ========================================
echo    RIMOZIONE FORZATA COMPLETATA!
echo ========================================
echo.
echo  Il servizio Local Opener è stato rimosso completamente.
echo.
echo 🗑️ OPERAZIONI ESEGUITE:
echo - Servizio Windows rimosso
echo - Configurazioni NSSM rimosse
echo - Directory log rimossa
echo - Script di avvio rimossi
echo - Avvio automatico rimosso
echo - Processi terminati
echo - Registro pulito
echo.
echo 🔄 PER REINSTALLARE:
echo 1. Esegui install-local-opener.bat
echo 2. Riavvia il computer
echo 3. Verifica il funzionamento
echo.
echo Premere un tasto per chiudere...
pause >nul
