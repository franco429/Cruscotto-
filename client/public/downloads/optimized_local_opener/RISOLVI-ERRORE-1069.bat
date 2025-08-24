@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo              RISOLUZIONE DEFINITIVA ERRORE 1069 LOCAL OPENER
echo ===============================================================================
echo.
echo Questo script risolve DEFINITIVAMENTE l'errore 1069 (errore di accesso)
echo installando il servizio con LocalSystem anziché con l'utente corrente.
echo.
echo IMPORTANTE: Esegui questo script come AMMINISTRATORE!
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Pulizia completa
echo ===============================================================================
echo.

REM Ferma e rimuove servizio esistente
sc stop CruscottoLocalOpener >nul 2>&1
timeout /t 3 /nobreak >nul
sc delete CruscottoLocalOpener >nul 2>&1
taskkill /f /im local-opener.exe >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq local-opener" >nul 2>&1

echo [OK] Servizio esistente rimosso

echo.
echo ===============================================================================
echo PASSO 2: Installazione con LocalSystem
echo ===============================================================================
echo.

REM Ottieni directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

REM Verifica che local-opener.exe esista
if not exist "%CURRENT_DIR%\local-opener.exe" (
    echo [ERRORE] File local-opener.exe non trovato!
    echo Assicurati di eseguire questo script dalla directory corretta.
    pause
    exit /b 1
)

REM Esegui installazione con LocalSystem
echo [INFO] Esecuzione script di installazione LocalSystem...
echo.

call "%CURRENT_DIR%\installa-servizio-localsystem.bat"

echo.
echo ===============================================================================
echo PASSO 3: Configurazione Google Drive
echo ===============================================================================
echo.

echo [INFO] Configurazione percorsi Google Drive...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CURRENT_DIR%\config-google-drive-localsystem.ps1"

echo.
echo ===============================================================================
echo VERIFICA FINALE
echo ===============================================================================
echo.

REM Verifica servizio
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio attivo e funzionante!
    echo.
    echo SUCCESSO! L'errore 1069 è stato risolto!
    echo.
    echo Il servizio Local Opener è ora attivo con account LocalSystem.
    echo Questo account non richiede password e ha accesso completo al sistema.
    echo.
    echo PROSSIMI PASSI:
    echo 1. Apri http://127.0.0.1:17654 nel browser
    echo 2. Verifica che mostri i percorsi Google Drive
    echo 3. Testa l'apertura di un documento dal Cruscotto
) else (
    echo [ERRORE] Il servizio non è attivo!
    echo.
    echo Prova queste soluzioni:
    echo 1. Riavvia il PC e ripeti l'installazione
    echo 2. Disabilita temporaneamente l'antivirus
    echo 3. Controlla i log in C:\ProgramData\.local-opener\
)

echo.
echo ===============================================================================
pause
