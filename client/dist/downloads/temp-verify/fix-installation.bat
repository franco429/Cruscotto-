@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    RIPRISTINO RAPIDO INSTALLAZIONE
echo    LOCAL OPENER SERVICE
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
set TASK_NAME=LocalOpenerTerminal
set NSSM_PATH=%~dp0nssm.exe
set STARTUP_SCRIPT=%~dp0start-local-opener.bat

echo 🔧 RIPRISTINO INSTALLAZIONE LOCAL OPENER
echo ========================================
echo.

:: 1. Verifica file necessari
echo 1. Verifica file necessari...
if not exist "%NSSM_PATH%" (
    echo    ❌ nssm.exe non trovato!
    echo    💡 Assicurati che sia nella stessa cartella
    pause
    exit /b 1
)

if not exist "%STARTUP_SCRIPT%" (
    echo    ❌ start-local-opener.bat non trovato!
    echo    💡 Creazione file mancante...
    
    :: Crea il file mancante
    (
    echo @echo off
    echo title Local Opener Service - Terminale Visibile
    echo setlocal enabledelayedexpansion
    echo.
    echo echo ========================================
    echo echo    LOCAL OPENER SERVICE ATTIVO
    echo echo ========================================
    echo echo.
    echo echo Il servizio Local Opener è ora attivo e funzionante.
    echo echo.
    echo echo Caratteristiche:
    echo echo - ✅ Avvio automatico all'avvio di Windows
    echo echo - ✅ Terminale sempre visibile per monitoraggio
    echo echo - ✅ Riavvio automatico in caso di crash
    echo echo - ✅ Log salvati in C:\Logs\LocalOpener
    echo echo - ✅ Task Scheduler per apertura automatica
    echo echo.
    echo echo PER CHIUDERE IL SERVIZIO:
    echo echo 1. Chiudi questa finestra
    echo echo 2. Oppure usa: sc stop LocalOpener
    echo echo.
    echo echo ATTENZIONE: Chiudere questa finestra fermerà il servizio!
    echo echo.
    echo echo Avvio del servizio Local Opener...
    echo echo.
    echo echo.
    echo echo :: Loop infinito per mantenere il terminale aperto
    echo echo :loop
    echo echo [%%date%% %%time%%] Local Opener Service attivo...
    echo echo echo.
    echo echo echo Avvio applicazione principale...
    echo start /wait "" "%%~dp0cruscotto-local-opener-setup.exe"
    echo echo echo.
    echo echo echo Applicazione terminata, riavvio in 5 secondi...
    echo timeout /t 5 /nobreak ^>nul
    echo echo echo.
    echo echo echo Riavvio automatico...
    echo goto :loop
    ) > "%STARTUP_SCRIPT%"
    
    echo    ✅ File start-local-opener.bat creato
) else (
    echo    ✅ start-local-opener.bat trovato
)

:: 2. Ferma il servizio se è in esecuzione
echo.
echo 2. Arresto servizio se attivo...
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo    🛑 Arresto servizio %SERVICE_NAME%...
    sc stop "%SERVICE_NAME%" >nul 2>&1
    timeout /t 3 >nul
    echo    ✅ Servizio arrestato
) else (
    echo    ℹ️  Servizio non attivo
)

:: 3. Rimuovi servizio esistente se configurato male
echo.
echo 3. Verifica configurazione servizio...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo    🔍 Servizio esistente, verifica configurazione...
    
    :: Verifica se punta al file corretto
    "%NSSM_PATH%" dump "%SERVICE_NAME%" | find "start-local-opener.bat" >nul 2>&1
    if %errorLevel% neq 0 (
        echo    ⚠️  Configurazione errata, rimozione servizio...
        sc delete "%SERVICE_NAME%" >nul 2>&1
        timeout /t 2 >nul
        echo    ✅ Servizio rimosso per riconfigurazione
    ) else (
        echo    ✅ Configurazione servizio corretta
    )
) else (
    echo    ℹ️  Servizio non installato
)

:: 4. Rimuovi task scheduler esistente
echo.
echo 4. Rimozione task scheduler esistente...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
echo    ✅ Task scheduler rimosso

:: 5. Reinstalla il servizio correttamente
echo.
echo 5. Reinstallazione servizio...
echo    📁 Percorso script: %STARTUP_SCRIPT%
echo    📁 Percorso NSSM: %NSSM_PATH%

"%NSSM_PATH%" install "%SERVICE_NAME%" "%STARTUP_SCRIPT%"
if %errorLevel% neq 0 (
    echo    ❌ Errore installazione servizio!
    pause
    exit /b 1
)

:: 6. Configura il servizio
echo.
echo 6. Configurazione servizio...
"%NSSM_PATH%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
"%NSSM_PATH%" set "%SERVICE_NAME%" AppType Interactive
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStdout "C:\Logs\LocalOpener\LocalOpener.log"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStderr "C:\Logs\LocalOpener\LocalOpener-error.log"
"%NSSM_PATH%" set "%SERVICE_NAME%" Description "Servizio Local Opener per apertura documenti locali SGI Cruscotto - Terminal sempre visibile"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppRestartDelay 10000

echo    ✅ Configurazione servizio completata

:: 7. Crea directory log
echo.
echo 7. Creazione directory log...
if not exist "C:\Logs\LocalOpener" (
    mkdir "C:\Logs\LocalOpener" >nul 2>&1
    echo    ✅ Directory log creata: C:\Logs\LocalOpener
) else (
    echo    ✅ Directory log esistente: C:\Logs\LocalOpener
)

:: 8. Ricrea task scheduler
echo.
echo 8. Ricreazione task scheduler...
set TASK_SCRIPT=%~dp0auto-open-terminal.bat

if exist "%TASK_SCRIPT%" (
    schtasks /create /tn "%TASK_NAME%" /tr "%TASK_SCRIPT%" /sc onlogon /ru "%USERNAME%" /rl highest /f
    if %errorLevel% equ 0 (
        echo    ✅ Task scheduler ricreato
    ) else (
        echo    ⚠️  Errore creazione task scheduler
    )
) else (
    echo    ⚠️  Script task scheduler non trovato
)

:: 9. Avvia il servizio
echo.
echo 9. Avvio servizio...
sc start "%SERVICE_NAME%"
if %errorLevel% equ 0 (
    echo    ✅ Servizio avviato con successo
) else (
    echo    ❌ Errore avvio servizio
    echo    💡 Prova manualmente: sc start %SERVICE_NAME%
)

echo.
echo ========================================
echo    RIPRISTINO COMPLETATO!
echo ========================================
echo.
echo ✅ Il servizio Local Opener è stato ripristinato
echo ✅ Il terminale dovrebbe essere ora visibile
echo ✅ Il servizio si avvierà automaticamente con Windows
echo.
echo 🔍 VERIFICA:
echo - Esegui verify-installation.bat per controllo completo
echo - Verifica che il terminale sia visibile
echo - Riavvia il computer per testare l'avvio automatico
echo.
echo 💡 Se ci sono ancora problemi:
echo - Controlla i log in C:\Logs\LocalOpener
echo - Verifica che l'antivirus non blocchi l'esecuzione
echo - Esegui debug-local-opener.bat per diagnostica completa
echo.
pause
