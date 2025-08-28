@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    CONFIGURAZIONE TERMINALE APERTO
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
set NSSM_PATH=%~dp0nssm.exe
set STARTUP_SCRIPT=%~dp0start-local-opener.bat

echo Configurazione servizio: %SERVICE_NAME%
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
    echo echo.
    echo echo PER CHIUDERE IL SERVIZIO:
    echo echo 1. Chiudi questa finestra
    echo echo 2. Oppure usa: sc stop LocalOpener
    echo echo.
    echo echo ATTENZIONE: Chiudere questa finestra fermerà il servizio!
    echo echo.
    echo echo Avvio del servizio Local Opener...
    echo echo.
    echo start /wait "" "%%~dp0cruscotto-local-opener-setup.exe"
    echo echo.
    echo echo Servizio Local Opener terminato.
    echo echo Per riavviarlo: sc start LocalOpener
    echo echo.
    echo pause
    ) > "%STARTUP_SCRIPT%"
    echo ✅ Script di avvio personalizzato creato
) else (
    echo ✅ Script di avvio personalizzato già esistente
)

:: Configura il servizio per utilizzare lo script di avvio personalizzato
echo - Configurazione percorso eseguibile con script personalizzato...
"%NSSM_PATH%" set "%SERVICE_NAME%" Application "%STARTUP_SCRIPT%"
if %errorLevel% equ 0 (
    echo ✅ Percorso eseguibile aggiornato
) else (
    echo ❌ Errore aggiornamento percorso eseguibile
)

:: Configura il servizio per mantenere il terminale aperto
echo - Configurazione modalità interattiva (terminal sempre visibile)...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppType Interactive
if %errorLevel% equ 0 (
    echo ✅ Modalità interattiva configurata
) else (
    echo ❌ Errore configurazione modalità interattiva
)

echo - Configurazione variabili ambiente console...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "CONSOLE_MODE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "TERMINAL_VISIBLE=1"
"%NSSM_PATH%" set "%SERVICE_NAME%" AppEnvironmentExtra "AUTO_RESTART=1"
if %errorLevel% equ 0 (
    echo ✅ Variabili ambiente console configurate
) else (
    echo ❌ Errore configurazione variabili ambiente
)

echo - Configurazione persistenza terminale...
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodSkip 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodConsole 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodWindow 0
"%NSSM_PATH%" set "%SERVICE_NAME%" AppStopMethodThreads 0
if %errorLevel% equ 0 (
    echo ✅ Persistenza terminale configurata
) else (
    echo ❌ Errore configurazione persistenza
)

:: Aggiorna la descrizione del servizio
echo - Aggiornamento descrizione servizio...
"%NSSM_PATH%" set "%SERVICE_NAME%" Description "Servizio Local Opener per apertura documenti locali SGI Cruscotto - Terminal sempre visibile per funzionamento e monitoraggio"
if %errorLevel% equ 0 (
    echo ✅ Descrizione aggiornata
) else (
    echo ❌ Errore aggiornamento descrizione
)

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
    echo.
    echo 🎯 CARATTERISTICHE ATTIVATE:
    echo - ✅ Terminale sempre aperto per funzionamento servizio
    echo - ✅ Modalità interattiva per debug e monitoraggio
    echo - ✅ Persistenza del terminale anche in caso di errori
    echo - ✅ Script di avvio personalizzato per affidabilità
    echo - ✅ Avvio automatico all'avvio di Windows
    echo.
    echo 📋 INFORMAZIONI IMPORTANTI:
    echo - Il terminale del servizio rimarrà sempre aperto
    echo - Non chiudere il terminale per mantenere il servizio attivo
    echo - Il servizio funziona in background ma mantiene la console visibile
    echo - Lo script di avvio personalizzato garantisce la persistenza
    echo.
    echo 🔧 VERIFICA CONFIGURAZIONE:
    echo Per verificare lo stato del servizio:
    echo   sc query "%SERVICE_NAME%"
    echo.
    echo Per verificare la configurazione NSSM:
    echo   "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
    echo 🚀 PROSSIMI PASSI:
    echo 1. Verifica che il terminale del servizio sia visibile
    echo 2. Testa il funzionamento aprendo un documento locale
    echo 3. Riavvia il computer per verificare l'avvio automatico
    echo 4. Verifica che il terminale si riapra automaticamente
    echo.
    echo 📁 FILE UTILIZZATI:
    echo - Script di avvio: %STARTUP_SCRIPT%
    echo - Configurazione NSSM: Servizio Windows
    echo - Log del servizio: C:\Logs\LocalOpener\
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
