@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    CONFIGURAZIONE TERMINALE APERTO
echo    LOCAL OPENER SERVICE
echo    CON TASK SCHEDULER AUTOMATICO
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
set STARTUP_SCRIPT=%~dp0start-local-opener.bat
set TASK_NAME=LocalOpenerTerminal
set TASK_SCRIPT=%~dp0auto-open-terminal.bat
set USERNAME=%USERNAME%

echo Configurazione servizio: %SERVICE_NAME%
echo Configurazione task scheduler: %TASK_NAME%
echo.

:: Verifica esistenza file necessari
if not exist "%NSSM_PATH%" (
    echo ERRORE: File nssm.exe non trovato!
    echo Assicurati che sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

:: Verifica se il servizio esiste
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Il servizio %SERVICE_NAME% non esiste!
    echo Esegui prima install-local-opener.bat per installare il servizio.
    pause
    exit /b 1
)

echo Configurazione modalità terminale aperto per il servizio %SERVICE_NAME%...
echo Configurazione task scheduler per apertura automatica...
echo.

:: Ferma temporaneamente il servizio per la riconfigurazione
echo - Arresto temporaneo del servizio...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 3 >nul

:: Crea script di avvio personalizzato se non esiste
if not exist "%STARTUP_SCRIPT%" (
    echo - Creazione script di avvio personalizzato...
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
    echo echo -  Log salvati in C:\Logs\LocalOpener
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
    echo echo [%%date%% %%time%%] Local Opener Service attivo...
    echo echo.
    echo echo Avvio applicazione principale...
    echo start /wait "" "%%~dp0cruscotto-local-opener-setup.exe"
    echo echo.
    echo echo Applicazione terminata, riavvio in 5 secondi...
    echo timeout /t 5 /nobreak ^>nul
    echo echo.
    echo echo Riavvio automatico...
    echo goto :loop
    ) > "%STARTUP_SCRIPT%"
    echo  Script di avvio personalizzato creato
) else (
    echo  Script di avvio personalizzato già esistente
)

:: Crea script per il task scheduler se non esiste
if not exist "%TASK_SCRIPT%" (
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
    echo  Script per task scheduler creato
) else (
    echo  Script per task scheduler già esistente
)

:: Configura il servizio per utilizzare lo script di avvio personalizzato
echo - Configurazione percorso eseguibile con script personalizzato...
"%NSSM_PATH%" set "%SERVICE_NAME%" Application "%STARTUP_SCRIPT%"
if %errorLevel% equ 0 (
    echo  Percorso eseguibile aggiornato
) else (
    echo  Errore aggiornamento percorso eseguibile
)

:: Configura il servizio per mantenere il terminale aperto
echo - Configurazione modalità interattiva (terminal sempre visibile)...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppType Interactive
if %errorLevel% equ 0 (
    echo  Modalità interattiva configurata
) else (
    echo  Errore configurazione modalità interattiva
)

echo - Configurazione variabili ambiente console...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "CONSOLE_MODE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "TERMINAL_VISIBLE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "AUTO_RESTART=1"
if %errorLevel% equ 0 (
    echo  Variabili ambiente console configurate
) else (
    echo  Errore configurazione variabili ambiente
)

echo - Configurazione persistenza terminale...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodConsole 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodWindow 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodThreads 0
if %errorLevel% equ 0 (
    echo  Persistenza terminale configurata
) else (
    echo  Errore configurazione persistenza
)

:: Aggiorna la descrizione del servizio
echo - Aggiornamento descrizione servizio...
"%NSSM_PATH%" set "%SERVICE_NAME%" Description "Servizio Local Opener per apertura documenti locali Pannello Di Controllo SGI - Terminal sempre visibile per funzionamento e monitoraggio"
if %errorLevel% equ 0 (
    echo  Descrizione aggiornata
) else (
    echo  Errore aggiornamento descrizione
)

:: CONFIGURAZIONE TASK SCHEDULER PER APERTURA AUTOMATICA
echo.
echo ========================================
echo    CONFIGURAZIONE TASK SCHEDULER
echo    PER APERTURA AUTOMATICA TERMINALE
echo ========================================
echo.

:: Rimuovi task scheduler esistente se presente
echo - Rimozione task scheduler esistente...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

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

:: Riavvia il servizio
echo - Riavvio del servizio...
sc start "%SERVICE_NAME%"
if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo    CONFIGURAZIONE COMPLETATA!
    echo ========================================
    echo.
    echo Il servizio Local Opener è stato riconfigurato con successo.
    echo Il task scheduler per apertura automatica è stato configurato.
    echo.
    echo 🎯 CARATTERISTICHE ATTIVATE:
    echo -  Terminale sempre aperto per funzionamento servizio
    echo -  Modalità interattiva per debug e monitoraggio
    echo -  Persistenza del terminale anche in caso di errori
    echo -  Script di avvio personalizzato per affidabilità
    echo -  Avvio automatico all'avvio di Windows
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
    echo 🔧 VERIFICA CONFIGURAZIONE:
    echo Per verificare lo stato del servizio:
    echo   sc query "%SERVICE_NAME%"
    echo.
    echo Per verificare la configurazione NSSM:
    echo   "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
    echo Per verificare il task scheduler:
    echo   schtasks /query /tn "%TASK_NAME%"
    echo.
    echo 🚀 PROSSIMI PASSI:
    echo 1. Verifica che il terminale del servizio sia visibile
    echo 2. Testa il funzionamento aprendo un documento locale
    echo 3. Riavvia il computer per verificare l'avvio automatico
    echo 4. Verifica che il terminale si riapra automaticamente
    echo 5. Verifica che il task scheduler sia configurato correttamente
    echo.
    echo  FILE UTILIZZATI:
    echo - Script di avvio: %STARTUP_SCRIPT%
    echo - Script task scheduler: %TASK_SCRIPT%
    echo - Configurazione NSSM: Servizio Windows
    echo - Task Scheduler: %TASK_NAME%
    echo - Log del servizio: C:\Logs\LocalOpener\
    echo.
    echo 🔍 VERIFICA COMPLETA:
    echo 1. Il terminale del servizio dovrebbe essere visibile
    echo 2. Il servizio dovrebbe essere in esecuzione
    echo 3. Il task scheduler dovrebbe essere configurato
    echo 4. All'avvio di Windows il terminale dovrebbe aprirsi automaticamente
    echo 5. Il servizio dovrebbe mantenere il terminale sempre aperto
    echo.
) else (
    echo.
    echo ERRORE: Impossibile riavviare il servizio!
    echo.
    echo Per verificare i problemi:
    echo 1. Controlla i log in C:\Logs\LocalOpener\
    echo 2. Verifica che l'antivirus non blocchi l'esecuzione
    echo 3. Prova ad avviare manualmente il servizio
    echo 4. Verifica la configurazione NSSM: "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
)

echo Premere un tasto per chiudere...
pause >nul
