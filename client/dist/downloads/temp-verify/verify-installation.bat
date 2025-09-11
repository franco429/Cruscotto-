@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    VERIFICA RAPIDA INSTALLAZIONE
echo    LOCAL OPENER SERVICE
echo ========================================
echo.

:: Imposta variabili
set "SERVICE_NAME=LocalOpener"
set "TASK_NAME=LocalOpenerTerminal"
set "EXE_PATH=%~dp0cruscotto-local-opener-setup.exe"

echo 🔍 VERIFICA COMPONENTI PRINCIPALI
echo ========================================

:: 1. Verifica file eseguibile
echo 1. File eseguibile principale...
if exist "%EXE_PATH%" (
    echo     cruscotto-local-opener-setup.exe trovato
    echo     Percorso: %EXE_PATH%
) else (
    echo     cruscotto-local-opener-setup.exe NON TROVATO!
    echo     Percorso cercato: %EXE_PATH%
)

:: 2. Verifica file nssm.exe
if exist "%~dp0nssm.exe" (
    echo     nssm.exe trovato
) else (
    echo     nssm.exe NON TROVATO!
)

:: 3. Verifica script di avvio
if exist "%~dp0start-local-opener.bat" (
    echo     start-local-opener.bat trovato
) else (
    echo     start-local-opener.bat NON TROVATO!
)

:: 4. Verifica script task scheduler
if exist "%~dp0auto-open-terminal.bat" (
    echo     auto-open-terminal.bat trovato
) else (
    echo     auto-open-terminal.bat NON TROVATO!
)

echo.
echo 🔍 VERIFICA SERVIZIO WINDOWS
echo ========================================

:: Verifica se il servizio esiste
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio %SERVICE_NAME% installato
    
    :: Verifica stato del servizio
    sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
    if %errorLevel% equ 0 (
        echo    🟢 Stato: ATTIVO
    ) else (
        echo    🔴 Stato: FERMO
        echo    💡 Per avviarlo: sc start %SERVICE_NAME%
    )
    
    :: Verifica configurazione NSSM
    echo.
    echo 📋 Configurazione NSSM:
    "%~dp0nssm.exe" dump "%SERVICE_NAME%" 2>nul | findstr /i "Application AppType"
    
) else (
    echo  Servizio %SERVICE_NAME% NON installato
    echo    💡 Esegui install-local-opener.bat come amministratore
)

echo.
echo 🔍 VERIFICA TASK SCHEDULER
echo ========================================

:: Verifica task scheduler
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Task scheduler %TASK_NAME% configurato
    
    :: Mostra dettagli del task
    echo 📋 Dettagli task:
    schtasks /query /tn "%TASK_NAME%" /fo list | findstr /i "TaskName Next Run Time"
    
) else (
    echo  Task scheduler %TASK_NAME% NON configurato
    echo    💡 Esegui install-local-opener.bat come amministratore
)

echo.
echo 🔍 VERIFICA LOG E CONFIGURAZIONE
echo ========================================

:: Verifica directory log
if exist "C:\Logs\LocalOpener" (
    echo  Directory log trovata: C:\Logs\LocalOpener
    
    :: Conta file di log
    dir "C:\Logs\LocalOpener\*.log" /b 2>nul | find /c /v "" >nul 2>&1
    if %errorLevel% equ 0 (
        set /a log_count=0
        for /f %%i in ('dir "C:\Logs\LocalOpener\*.log" /b 2^>nul ^| find /c /v ""') do set log_count=%%i
        echo    📊 File di log trovati: %log_count%
    ) else (
        echo    📊 File di log trovati: 0
    )
) else (
    echo  Directory log NON trovata: C:\Logs\LocalOpener
)

echo.
echo 🔍 VERIFICA FUNZIONAMENTO
echo ========================================

:: Test apertura file
echo Test apertura file locale...
echo    💡 Apri la web app Pannello Di Controllo SGI
echo    💡 Vai su Impostazioni → Apertura File Locali
echo    💡 Clicca "Rileva Percorsi Automaticamente"
echo    💡 Clicca "Aggiungi Tutti" per Google Drive

echo.
echo 🔍 COMANDI UTILI
echo ========================================
echo Per avviare il servizio: sc start %SERVICE_NAME%
echo Per fermare il servizio: sc stop %SERVICE_NAME%
echo Per riavviare: sc stop %SERVICE_NAME% && sc start %SERVICE_NAME%
echo Per verificare stato: sc query %SERVICE_NAME%
echo Per verificare task: schtasks /query /tn %TASK_NAME%
echo Per testare apertura: start "" "%EXE_PATH%"

echo.
echo ========================================
echo    VERIFICA COMPLETATA
echo ========================================
echo.
echo Se ci sono problemi:
echo 1. Esegui install-local-opener.bat come amministratore
echo 2. Riavvia il computer
echo 3. Verifica che il terminale si apra automaticamente
echo.
pause
