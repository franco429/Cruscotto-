@echo off
chcp 65001 >nul
cls
echo.
echo ===============================================================================
echo            CRUSCOTTO LOCAL OPENER - INSTALLAZIONE AUTOMATICA
echo ===============================================================================
echo.
echo IMPORTANTE: Questo script richiederà automaticamente i privilegi
echo             di Amministratore necessari per installare il servizio Windows.
echo.
echo Cosa fa questo script:
echo  ✓ Verifica presenza di tutti i file necessari
echo  ✓ Installa Local Opener come servizio Windows permanente
echo  ✓ Configura avvio automatico ad ogni accensione del PC
echo  ✓ Rileva automaticamente tutti i percorsi Google Drive
echo  ✓ Configura resilienza e restart automatico
echo.

REM Verifica rapida file essenziali
if not exist "%~dp0nssm.exe" goto :missing_files
if not exist "%~dp0index.js" goto :missing_files
if not exist "%~dp0installa-servizio-admin.ps1" goto :missing_files

echo ✅ File necessari verificati
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.
pause

echo.
echo Avvio installazione con privilegi amministratore...
echo Directory: %~dp0
echo.

REM Cambia nella directory dello script e esegui PowerShell
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%~dp0'; & '%~dp0installa-servizio-admin.ps1'"

echo.
echo Processo completato. Controlla i messaggi sopra per il risultato.
echo.
pause
exit /b 0

:missing_files
echo ❌ ERRORE: File essenziali mancanti!
echo.
echo File necessari:
if not exist "%~dp0nssm.exe" echo   ❌ nssm.exe
if not exist "%~dp0index.js" echo   ❌ index.js  
if not exist "%~dp0installa-servizio-admin.ps1" echo   ❌ installa-servizio-admin.ps1
echo.
echo 💡 SOLUZIONE:
echo    1. Estrai TUTTI i file dalla cartella optimized_local_opener
echo    2. Esegui questo script dalla cartella corretta
echo    3. Se persiste, usa cruscotto-local-opener-setup.exe per installazione manuale
echo.
if exist "%~dp0cruscotto-local-opener-setup.exe" (
    echo 🔧 ALTERNATIVA: Installazione manuale disponibile
    echo    Esegui "cruscotto-local-opener-setup.exe" per installazione guidata
)
echo.
pause
exit /b 1