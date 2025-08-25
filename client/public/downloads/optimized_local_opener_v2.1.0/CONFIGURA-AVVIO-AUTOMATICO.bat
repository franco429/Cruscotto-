@echo off
:: CONFIGURA-AVVIO-AUTOMATICO.bat
:: Script per configurare l'avvio automatico al riavvio di Windows
:: Risolve il problema del servizio che non parte automaticamente

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - CONFIGURAZIONE
echo   Avvio Automatico al Riavvio Windows
echo   Versione 2.1 - Fix Completo
echo ========================================
echo.

:: Imposta titolo finestra
title "Cruscotto Local Opener - Configurazione Avvio Automatico"

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Privilegi amministratore richiesti per questa operazione
    echo Richiesta elevazione privilegi...
    powershell.exe -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ✓ Privilegi amministratore verificati
echo.

:: Ottieni il percorso dello script corrente
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Cerca local-opener.exe
set "OPENER_PATH="
if exist "%SCRIPT_DIR%\local-opener.exe" (
    set "OPENER_PATH=%SCRIPT_DIR%\local-opener.exe"
    echo ✓ Trovato local-opener.exe nella directory corrente
) else if exist "%ProgramFiles%\CruscottoLocalOpener\local-opener.exe" (
    set "OPENER_PATH=%ProgramFiles%\CruscottoLocalOpener\local-opener.exe"
    echo ✓ Trovato local-opener.exe in Program Files
) else (
    echo ❌ local-opener.exe non trovato
    echo Assicurati di eseguire questo script dalla directory di installazione
    pause
    exit /b 1
)

echo Percorso Local Opener: %OPENER_PATH%
echo.

:: 1. CONFIGURA TASK SCHEDULER PER AVVIO AL BOOT
echo [1/4] Configurazione Task Scheduler per avvio al boot...
schtasks /delete /tn "CruscottoLocalOpenerBoot" /f >nul 2>&1

schtasks /create /tn "CruscottoLocalOpenerBoot" /tr "\"%OPENER_PATH%\"" /sc onstart /ru "SYSTEM" /rl highest /f
if %errorlevel% == 0 (
    echo ✓ Task scheduler per avvio al boot configurato
) else (
    echo ⚠ Errore configurazione task scheduler boot
)

:: 2. CONFIGURA TASK SCHEDULER PER AVVIO AL LOGIN
echo [2/4] Configurazione Task Scheduler per avvio al login...
schtasks /delete /tn "CruscottoLocalOpenerLogin" /f >nul 2>&1

schtasks /create /tn "CruscottoLocalOpenerLogin" /tr "\"%OPENER_PATH%\"" /sc onlogon /ru "%USERNAME%" /rl highest /f
if %errorlevel% == 0 (
    echo ✓ Task scheduler per avvio al login configurato
) else (
    echo ⚠ Errore configurazione task scheduler login
)

:: 3. CONFIGURA REGISTRO WINDOWS (BACKUP)
echo [3/4] Configurazione registro Windows...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener" /t REG_SZ /d "\"%OPENER_PATH%\"" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Backup registro Windows configurato
) else (
    echo ⚠ Errore configurazione registro Windows
)

:: 4. CONFIGURA SERVIZIO WINDOWS (se installato)
echo [4/4] Configurazione servizio Windows...
sc query CruscottoLocalOpener >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Servizio CruscottoLocalOpener trovato
    sc config CruscottoLocalOpener start= delayed-auto >nul 2>&1
    if %errorlevel% == 0 (
        echo ✓ Servizio configurato per avvio automatico ritardato
    ) else (
        echo ⚠ Errore configurazione servizio
    )
) else (
    echo ⚠ Servizio CruscottoLocalOpener non installato
    echo Il servizio verrà avviato tramite task scheduler
)

echo.
echo ========================================
echo   CONFIGURAZIONE COMPLETATA
echo ========================================
echo.
echo ✓ Task Scheduler per avvio al boot configurato
echo ✓ Task Scheduler per avvio al login configurato  
echo ✓ Backup registro Windows configurato
echo ✓ Servizio Windows configurato (se presente)
echo.
echo Il Local Opener si avvierà automaticamente:
echo - Al riavvio del computer (tramite task scheduler)
echo - Al login dell'utente (tramite task scheduler)
echo - Come backup tramite registro Windows
echo.
echo Per verificare la configurazione:
echo 1. Riavvia il computer
echo 2. Verifica che il servizio sia attivo
echo 3. Controlla http://127.0.0.1:17654/health
echo.
echo Premi un tasto per chiudere...
pause >nul
