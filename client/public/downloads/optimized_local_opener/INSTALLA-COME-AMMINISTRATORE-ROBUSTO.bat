@echo off
chcp 65001 >nul
cls
echo.
echo ===============================================================================
echo            CRUSCOTTO LOCAL OPENER - INSTALLAZIONE AUTOMATICA SICURA
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
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.

REM Verifica presenza file essenziali
echo Verifica prerequisiti...
if not exist "%~dp0nssm.exe" (
    echo.
    echo ❌ ERRORE: File nssm.exe non trovato!
    echo    Percorso: %~dp0nssm.exe
    goto :error
)

if not exist "%~dp0index.js" (
    echo.
    echo ❌ ERRORE: File index.js non trovato!
    echo    Percorso: %~dp0index.js
    goto :error
)

if not exist "%~dp0installa-servizio-admin.ps1" (
    echo.
    echo ❌ ERRORE: File installa-servizio-admin.ps1 non trovato!
    echo    Percorso: %~dp0installa-servizio-admin.ps1
    goto :error
)

echo ✅ Tutti i file necessari sono presenti
echo.

pause

echo.
echo Avvio installazione con privilegi amministratore...
echo Directory corrente: %~dp0
echo.

REM Cambia nella directory dello script per sicurezza
cd /d "%~dp0"

REM Esegui PowerShell con path assoluto
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%~dp0'; & '%~dp0installa-servizio-admin.ps1'"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ⚠️ Si è verificato un errore durante l'installazione.
    goto :fallback
)

echo.
echo ✅ Installazione completata! Controlla i messaggi sopra per il risultato.
echo.
pause
exit /b 0

:error
echo.
echo 📂 File presenti nella cartella:
echo.
dir /b "%~dp0"
echo.
echo 💡 SOLUZIONE:
echo    1. Verifica di aver estratto TUTTI i file dalla cartella optimized_local_opener
echo    2. Controlla che il file ZIP sia stato estratto completamente
echo    3. Esegui questo script dalla cartella dove sono presenti tutti i file
echo.
goto :fallback

:fallback
echo 🔧 ALTERNATIVA - INSTALLAZIONE MANUALE:
if exist "%~dp0cruscotto-local-opener-setup.exe" (
    echo    Trovi il file "cruscotto-local-opener-setup.exe" nella stessa cartella
    echo    Eseguilo per installazione manuale guidata
    echo.
    set /p choice="Vuoi avviare l'installazione manuale ora? (s/N): "
    if /i "%choice%"=="s" (
        echo Avvio installazione manuale...
        start "" "%~dp0cruscotto-local-opener-setup.exe"
    )
) else (
    echo    File di installazione manuale non trovato.
    echo    Contatta il supporto tecnico per assistenza.
)
echo.
pause
exit /b 1
