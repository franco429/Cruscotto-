@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    INSTALLAZIONE LOCAL OPENER SERVICE
echo    CON TERMINALE SEMPRE VISIBILE
echo    E APERTURA AUTOMATICA ALL'AVVIO
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
set EXE_PATH=%~dp0cruscotto-local-opener-setup.exe
set NSSM_PATH=%~dp0nssm.exe
set LOG_DIR=C:\Logs\LocalOpener
set STARTUP_SCRIPT=%~dp0start-local-opener.bat
set TASK_NAME=LocalOpenerTerminal
set USERNAME=%USERNAME%

echo Configurazione servizio:
echo - Nome servizio: %SERVICE_NAME%
echo - Percorso eseguibile: %EXE_PATH%
echo - Directory log: %LOG_DIR%
echo - Script di avvio: %STARTUP_SCRIPT%
echo - Task Scheduler: %TASK_NAME%
echo - Utente: %USERNAME%
echo.

:: Verifica esistenza file necessari
if not exist "%EXE_PATH%" (
    echo ERRORE: File cruscotto-local-opener-setup.exe non trovato!
    echo Assicurati che sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

if not exist "%NSSM_PATH%" (
    echo ERRORE: File nssm.exe non trovato!
    echo Assicurati che sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

:: Crea directory log
if not exist "%LOG_DIR%" (
    echo Creazione directory log: %LOG_DIR%
    mkdir "%LOG_DIR%" >nul 2>&1
)

:: Verifica se il servizio esiste già
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Il servizio %SERVICE_NAME% esiste già.
    echo.
    set /p choice="Vuoi rimuoverlo e reinstallarlo? (S/N): "
    if /i "!choice!"=="S" (
        echo Rimozione servizio esistente...
        sc stop "%SERVICE_NAME%" >nul 2>&1
        sc delete "%SERVICE_NAME%" >nul 2>&1
        timeout /t 2 >nul
    ) else (
        echo Installazione annullata.
        pause
        exit /b 0
    )
)

:: Rimuovi task scheduler esistente se presente
echo - Rimozione task scheduler esistente...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

echo.
echo Installazione servizio %SERVICE_NAME%...

:: Crea script di avvio personalizzato per mantenere il terminale aperto
echo Creazione script di avvio personalizzato...
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
echo echo -  Avvio automatico all'avvio di Windows
echo echo -  Terminale sempre visibile per monitoraggio
echo echo -  Riavvio automatico in caso di crash
echo echo -  Log salvati in: %LOG_DIR%
echo echo -  Task Scheduler per apertura automatica
echo echo.
echo echo PER CHIUDERE IL SERVIZIO:
echo echo 1. Chiudi questa finestra
echo echo 2. Oppure usa: sc stop LocalOpener
echo echo.
echo echo ATTENZIONE: Chiudere questa finestra fermerà il servizio!
echo echo.
echo echo Avvio del servizio Local Opener...
echo echo.
echo.
echo :: Loop infinito per mantenere il terminale aperto
echo :loop
echo echo [%date% %time%] Local Opener Service attivo...
echo echo.
echo echo Avvio applicazione principale...
echo start /wait "" "%EXE_PATH%"
echo echo.
echo echo Applicazione terminata, riavvio in 5 secondi...
echo timeout /t 5 /nobreak ^>nul
echo echo.
echo echo Riavvio automatico...
echo goto :loop
) > "%STARTUP_SCRIPT%"

:: Installa il servizio usando nssm con lo script di avvio personalizzato
echo - Installazione servizio...
"%NSSM_PATH%" install "%SERVICE_NAME%" "%STARTUP_SCRIPT%"
if %errorLevel% neq 0 (
    echo ERRORE: Impossibile installare il servizio!
    pause
    exit /b 1
)

:: Configura il servizio per avvio automatico
echo - Configurazione avvio automatico...
"%NSSM_PATH%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
if %errorLevel% neq 0 (
    echo AVVISO: Impossibile impostare l'avvio automatico!
)

:: Configurazione CRUCIALE: Modalità interattiva per mantenere il terminale visibile
echo - Configurazione modalità interattiva (terminal sempre visibile)...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppType Interactive
if %errorLevel% neq 0 (
    echo AVVISO: Impossibile impostare la modalità interattiva!
)

:: Configura i log
echo - Configurazione log...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStdout "%LOG_DIR%\LocalOpener.log"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStderr "%LOG_DIR%\LocalOpener-error.log"

:: Configura descrizione
echo - Configurazione descrizione...
"%NSSM_PATH%" set "%SERVICE_NAME%" Description "Servizio Local Opener per apertura documenti locali Pannello Di Controllo SGI - Terminal sempre visibile per funzionamento e monitoraggio"

:: Configura riavvio automatico in caso di crash
echo - Configurazione riavvio automatico...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppRestartDelay 10000
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodConsole 1500
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodWindow 1500
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodThreads 1500

:: Configurazione aggiuntiva per garantire la persistenza del terminale
echo - Configurazione persistenza terminale...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodConsole 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodWindow 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodThreads 0

:: Configurazione per garantire che il servizio si avvii sempre
echo - Configurazione affidabilità servizio...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodConsole 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodWindow 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodThreads 0

:: Configurazione per mantenere il terminale aperto anche in caso di errori
echo - Configurazione resilienza terminale...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "CONSOLE_MODE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "TERMINAL_VISIBLE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "AUTO_RESTART=1"

:: CREAZIONE TASK SCHEDULER PER APERTURA AUTOMATICA DEL TERMINALE
echo.
echo ========================================
echo    CREAZIONE TASK SCHEDULER
echo    PER APERTURA AUTOMATICA TERMINALE
echo ========================================
echo.

:: Crea script per il task scheduler
set TASK_SCRIPT=%~dp0auto-open-terminal.bat
echo - Creazione script per task scheduler...
(
echo @echo off
echo :: Script per apertura automatica terminale Local Opener
echo :: Eseguito automaticamente all'avvio di Windows
echo.
echo setlocal enabledelayedexpansion
echo.
echo :: Attendi che il sistema sia completamente avviato
echo timeout /t 30 /nobreak ^>nul
echo.
echo :: Verifica se il servizio è attivo
echo :check_service
echo sc query "LocalOpener" | find "RUNNING" ^>nul 2^>^&1
echo if %%errorLevel%% neq 0 ^(
echo     echo Servizio LocalOpener non attivo, attendo...
echo     timeout /t 10 /nobreak ^>nul
echo     goto :check_service
echo ^)
echo.
echo :: Apri il terminale del servizio se non è già visibile
echo echo Apertura automatica terminale Local Opener...
echo echo.
echo echo Se il terminale non si apre automaticamente:
echo echo 1. Premi Win+R
echo echo 2. Digita: sc start LocalOpener
echo echo 3. Premi Invio
echo echo.
echo.
echo :: Forza l'apertura del terminale del servizio
echo sc start "LocalOpener" ^>nul 2^>^&1
echo.
echo :: Attendi e verifica che il terminale sia visibile
echo timeout /t 5 /nobreak ^>nul
echo.
echo echo Terminale Local Opener configurato per apertura automatica.
echo echo.
echo echo Per verificare lo stato:
echo echo - Servizio: sc query LocalOpener
echo echo - Task Scheduler: schtasks /query /tn LocalOpenerTerminal
echo echo.
echo pause
) > "%TASK_SCRIPT%"

:: Crea il task scheduler per eseguire lo script all'avvio
echo - Creazione task scheduler per apertura automatica...
schtasks /create /tn "%TASK_NAME%" /tr "%TASK_SCRIPT%" /sc onlogon /ru "%USERNAME%" /rl highest /f
if %errorLevel% equ 0 (
    echo  Task scheduler creato con successo
    echo   - Nome: %TASK_NAME%
    echo   - Trigger: All'avvio di Windows
    echo   - Script: %TASK_SCRIPT%
) else (
    echo  Errore creazione task scheduler
    echo Tentativo alternativo con configurazione semplificata...
    schtasks /create /tn "%TASK_NAME%" /tr "%TASK_SCRIPT%" /sc onstart /ru "%USERNAME%" /f
    if %errorLevel% equ 0 (
        echo  Task scheduler creato con configurazione alternativa
    ) else (
        echo  Impossibile creare il task scheduler
        echo Il servizio funzionerà ma il terminale potrebbe non aprirsi automaticamente
    )
)

:: Configura il task per esecuzione automatica anche per altri utenti
echo - Configurazione task per tutti gli utenti...
schtasks /change /tn "%TASK_NAME%" /ru "SYSTEM" /f >nul 2>&1

echo.
echo Configurazione completata!
echo.

:: Avvia il servizio
echo Avvio servizio...
sc start "%SERVICE_NAME%"
if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo    INSTALLAZIONE COMPLETATA!
    echo ========================================
    echo.
    echo Il servizio Local Opener è stato installato e avviato con successo.
    echo.
    echo 🎯 CARATTERISTICHE SPECIALI:
    echo -  Avvio automatico all'avvio di Windows
    echo -  Terminale sempre aperto per funzionamento servizio
    echo -  Riavvio automatico in caso di crash
    echo -  Log salvati in: %LOG_DIR%
    echo -  Modalità interattiva per debug e monitoraggio
    echo -  Script di avvio personalizzato per persistenza
    echo -  Task Scheduler per apertura automatica terminale
    echo -  Loop infinito per mantenere il terminale sempre attivo
    echo.
    echo 📋 INFORMAZIONI IMPORTANTI:
    echo - Il terminale del servizio rimarrà sempre aperto
    echo - Non chiudere il terminale per mantenere il servizio attivo
    echo - Il servizio funziona in background ma mantiene la console visibile
    echo - Lo script di avvio personalizzato garantisce la persistenza
    echo - Il Task Scheduler aprirà automaticamente il terminale all'avvio
    echo.
    echo 🔧 COMANDI UTILI:
    echo Per verificare lo stato del servizio:
    echo   sc query "%SERVICE_NAME%"
    echo.
    echo Per verificare il task scheduler:
    echo   schtasks /query /tn "%TASK_NAME%"
    echo.
    echo Per riavviare il servizio:
    echo   sc stop "%SERVICE_NAME%" && sc start "%SERVICE_NAME%"
    echo.
    echo Per disinstallare il servizio:
    echo   sc stop "%SERVICE_NAME%" && sc delete "%SERVICE_NAME%"
    echo.
    echo Per rimuovere il task scheduler:
    echo   schtasks /delete /tn "%TASK_NAME%" /f
    echo.
    echo 🚀 PROSSIMI PASSI:
    echo 1. Verifica che il terminale del servizio sia visibile
    echo 2. Riavvia il computer per testare l'avvio automatico
    echo 3. Verifica che il terminale si apra automaticamente
    echo 4. Apri la pagina Impostazioni → Apertura File Locali
    echo 5. Clicca "Rileva Percorsi Automaticamente"
    echo 6. Clicca "Aggiungi Tutti" per configurare Google Drive
    echo.
    echo  FILE CREATI:
    echo - Script di avvio: %STARTUP_SCRIPT%
    echo - Script task scheduler: %TASK_SCRIPT%
    echo - Log del servizio: %LOG_DIR%
    echo - Configurazione NSSM: Servizio Windows
    echo - Task Scheduler: %TASK_NAME%
    echo.
    echo 🔍 VERIFICA INSTALLAZIONE:
    echo 1. Il terminale del servizio dovrebbe essere visibile
    echo 2. Il servizio dovrebbe essere in esecuzione
    echo 3. Il task scheduler dovrebbe essere configurato
    echo 4. All'avvio di Windows il terminale dovrebbe aprirsi automaticamente
    echo.
) else (
    echo.
    echo ERRORE: Impossibile avviare il servizio!
    echo.
    echo Per verificare i problemi:
    echo 1. Controlla i log in: %LOG_DIR%
    echo 2. Verifica che l'antivirus non blocchi l'esecuzione
    echo 3. Esegui manualmente: %EXE_PATH%
    echo 4. Verifica la configurazione NSSM: "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
)

echo Premere un tasto per chiudere...
pause >nul
