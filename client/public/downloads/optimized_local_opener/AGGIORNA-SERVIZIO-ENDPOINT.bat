@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo          AGGIORNAMENTO SERVIZIO LOCAL OPENER - NUOVI ENDPOINT
echo ===============================================================================
echo.
echo Questo script aggiorna il servizio Local Opener con i nuovi endpoint
echo per la rilevazione automatica dei percorsi Google Drive.
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Verifica privilegi amministratore
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privilegi amministratore confermati
) else (
    echo [ERRORE] Eseguire come amministratore!
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 2: Arresto servizio
echo ===============================================================================
echo.

sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Arresto servizio in corso...
    net stop CruscottoLocalOpener
    timeout /t 3 /nobreak >nul
    echo [OK] Servizio arrestato
) else (
    echo [INFO] Servizio non attivo
)

echo.
echo ===============================================================================
echo PASSO 3: Backup file esistente
echo ===============================================================================
echo.

set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

if exist "%CURRENT_DIR%\index.js.backup" (
    echo [INFO] Backup esistente trovato
) else (
    if exist "%CURRENT_DIR%\index.js" (
        copy "%CURRENT_DIR%\index.js" "%CURRENT_DIR%\index.js.backup" >nul 2>&1
        echo [OK] Backup creato: index.js.backup
    )
)

echo.
echo ===============================================================================
echo PASSO 4: Verifica nuova versione
echo ===============================================================================
echo.

REM Verifica che il nuovo index.js contenga l'endpoint auto-detect-paths
findstr /C:"auto-detect-paths" "%CURRENT_DIR%\index.js" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Nuovo endpoint auto-detect-paths trovato nel file
) else (
    echo [ERRORE] Il file index.js non contiene il nuovo endpoint!
    echo Scarica la versione aggiornata di Local Opener
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 5: Riavvio servizio
echo ===============================================================================
echo.

echo [INFO] Avvio servizio con nuova versione...
net start CruscottoLocalOpener

if %errorLevel% == 0 (
    echo [OK] Servizio avviato correttamente
) else (
    echo [ERRORE] Impossibile avviare il servizio
    echo Esegui diagnostica-servizio.bat per maggiori dettagli
)

echo.
echo ===============================================================================
echo PASSO 6: Test nuovo endpoint
echo ===============================================================================
echo.

timeout /t 5 /nobreak >nul

echo [INFO] Test endpoint auto-detect-paths...
curl -X POST http://127.0.0.1:17654/auto-detect-paths -H "Content-Type: application/json" -d "{}" >nul 2>&1

if %errorLevel% == 0 (
    echo [OK] Nuovo endpoint funzionante!
) else (
    echo [ATTENZIONE] Test endpoint fallito
    echo Il servizio potrebbe richiedere più tempo per avviarsi
)

echo.
echo ===============================================================================
echo AGGIORNAMENTO COMPLETATO!
echo ===============================================================================
echo.
echo Il servizio Local Opener è stato aggiornato con i nuovi endpoint.
echo.
echo Ora puoi:
echo 1. Tornare alla pagina Impostazioni del Cruscotto
echo 2. Cliccare su "🔍 Rileva Automaticamente"
echo 3. I percorsi Google Drive verranno rilevati automaticamente
echo.
echo Se continui ad avere problemi:
echo - Riavvia il PC
echo - Esegui RISOLVI-ERRORE-1069.bat per reinstallare completamente
echo.

pause
