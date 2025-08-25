@echo off
chcp 65001 >nul
title CRUSCOTTO LOCAL OPENER - Avvio Manuale Utente v2.0.0

echo.
echo ========================================
echo   CRUSCOTTO LOCAL OPENER v2.0.0
echo   Avvio Manuale Modalità Utente
echo ========================================
echo.

:: Verifica se Node.js è installato
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRORE: Node.js non trovato!
    echo.
    echo Per installare Node.js:
    echo 1. Vai su https://nodejs.org/
    echo 2. Scarica la versione LTS
    echo 3. Installa e riavvia questo script
    echo.
    pause
    exit /b 1
)

:: Verifica se il file auto-config.js esiste
if not exist "%~dp0auto-config.js" (
    echo ❌ ERRORE: File auto-config.js non trovato!
    echo Assicurati di eseguire questo script dalla cartella corretta.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js trovato: 
node --version
echo.

echo 🔍 Verifica configurazione Google Drive...
echo.

:: Esegui auto-config.js per rilevare Google Drive
node "%~dp0auto-config.js" --check-only

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  ATTENZIONE: Google Drive non rilevato automaticamente
    echo.
    echo Possibili cause:
    echo - Google Drive Desktop non è installato
    echo - Google Drive non è configurato
    echo - I percorsi sono personalizzati
    echo.
    echo Vuoi continuare comunque? (S/N)
    set /p choice=
    if /i "%choice%" neq "S" (
        echo Operazione annullata.
        pause
        exit /b 0
    )
)

echo.
echo 🚀 Avvio Local Opener in modalità utente...
echo.

:: Avvia il servizio local-opener.exe
if exist "%~dp0local-opener.exe" (
    echo ✅ Avvio local-opener.exe...
    start "" "%~dp0local-opener.exe"
    
    echo.
    echo ✅ Local Opener avviato con successo!
    echo.
    echo 📋 Informazioni:
    echo - Il servizio è ora attivo in background
    echo - Monitora automaticamente i file Google Drive
    echo - Si riavvia automaticamente in caso di errori
    echo.
    echo 🔧 Per fermare il servizio:
    echo - Chiudi questa finestra
    echo - Oppure usa Task Manager
    echo.
) else (
    echo ❌ ERRORE: local-opener.exe non trovato!
    echo Assicurati che tutti i file siano presenti.
    echo.
)

echo.
echo Premere un tasto per chiudere...
pause >nul
