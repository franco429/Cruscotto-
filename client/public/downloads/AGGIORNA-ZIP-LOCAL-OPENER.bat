@echo off
chcp 65001 >nul
title Aggiornamento ZIP Local Opener
echo ===============================================================================
echo           AGGIORNAMENTO ZIP LOCAL OPENER
echo ===============================================================================
echo.
echo Questo script aggiorna il file ZIP di Local Opener
echo includendo tutti i nuovi file per il servizio Windows nativo.
echo.

REM Verifica se Node.js è installato
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Node.js non è installato!
    echo.
    echo Per installare Node.js:
    echo 1. Vai su https://nodejs.org/
    echo 2. Scarica la versione LTS
    echo 3. Installa e riavvia il terminale
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js trovato: 
node --version

REM Verifica se la directory optimized_local_opener esiste
if not exist "%~dp0optimized_local_opener" (
    echo [ERRORE] Directory optimized_local_opener non trovata!
    echo Assicurati di essere nella cartella downloads.
    pause
    exit /b 1
)

echo [OK] Directory optimized_local_opener trovata

REM Verifica se il file di aggiornamento esiste
if not exist "%~dp0update-optimized-local-opener.js" (
    echo [ERRORE] Script di aggiornamento non trovato!
    echo Assicurati che update-optimized-local-opener.js sia presente.
    pause
    exit /b 1
)

echo [OK] Script di aggiornamento trovato

REM Backup del ZIP esistente se presente
if exist "%~dp0optimized_local_opener.zip" (
    echo [INFO] Backup del ZIP esistente...
    ren "%~dp0optimized_local_opener.zip" "optimized_local_opener_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.zip"
    echo [OK] Backup creato
)

echo.
echo ===============================================================================
echo AGGIORNAMENTO IN CORSO...
echo ===============================================================================
echo.

REM Esegui lo script di aggiornamento
echo [INFO] Esecuzione script di aggiornamento...
node "%~dp0update-optimized-local-opener.js"

if %errorLevel% == 0 (
    echo.
    echo ===============================================================================
    echo ✅ AGGIORNAMENTO COMPLETATO CON SUCCESSO!
    echo ===============================================================================
    echo.
    echo Il nuovo ZIP include:
    echo ✅ Tutti gli script per il servizio Windows nativo
    echo ✅ Documentazione completa
    echo ✅ File eseguibili e di configurazione
    echo ✅ Script di diagnostica e gestione
    echo.
    echo 📦 File ZIP aggiornato: optimized_local_opener.zip
    echo.
    echo 🎯 Ora quando gli utenti scaricano Local Opener
    echo    troveranno la soluzione completa per il servizio Windows!
    echo.
) else (
    echo.
    echo ===============================================================================
    echo ❌ ERRORE DURANTE L'AGGIORNAMENTO
    echo ===============================================================================
    echo.
    echo Controlla i messaggi di errore sopra.
    echo.
    if exist "%~dp0optimized_local_opener_backup_*.zip" (
        echo [INFO] Ripristino backup...
        for %%f in (optimized_local_opener_backup_*.zip) do (
            ren "%%f" "optimized_local_opener.zip"
            echo [OK] Backup ripristinato
            goto :end
        )
    )
)

:end
echo.
echo Premi un tasto per chiudere...
pause >NUL
