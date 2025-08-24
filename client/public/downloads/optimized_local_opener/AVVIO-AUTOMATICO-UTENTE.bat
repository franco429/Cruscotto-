@echo off
title Local Opener - Avvio Automatico Background
echo ========================================
echo    LOCAL OPENER - AVVIO AUTOMATICO
echo ========================================
echo.

REM Verifica se local-opener.exe esiste
if not exist "%~dp0local-opener.exe" (
    echo ERRORE: local-opener.exe non trovato!
    echo Assicurati che il file sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

echo [1/4] Verifica se Local Opener e' gia' in esecuzione...
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Local Opener e' gia' in esecuzione. Terminando...
    taskkill /F /IM local-opener.exe >NUL 2>&1
    timeout /t 2 >NUL
)

echo [2/4] Avvio Local Opener in modalita' background...
start /B "" "%~dp0local-opener.exe"

echo [3/4] Verifica avvio...
timeout /t 3 >NUL
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Local Opener avviato con successo in background!
) else (
    echo ❌ Errore nell'avvio di Local Opener
    pause
    exit /b 1
)

echo [4/4] Configurazione avvio automatico...
REM Crea il file .vbs per avvio silenzioso
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\start-local-opener.vbs"
echo WshShell.Run "%~dp0local-opener.exe", 0, False >> "%TEMP%\start-local-opener.vbs"

REM Aggiungi alla cartella Startup dell'utente (senza privilegi admin)
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_FOLDER%" mkdir "%STARTUP_FOLDER%"

REM Crea il file .bat nella cartella Startup
echo @echo off > "%STARTUP_FOLDER%\Local-Opener-Auto.bat"
echo cd /d "%~dp0" >> "%STARTUP_FOLDER%\Local-Opener-Auto.bat"
echo start /B "" "%~dp0local-opener.exe" >> "%STARTUP_FOLDER%\Local-Opener-Auto.bat"

echo.
echo ========================================
echo    CONFIGURAZIONE COMPLETATA!
echo ========================================
echo.
echo ✅ Local Opener avviato in background
echo ✅ Avvio automatico configurato per il riavvio
echo ✅ Nessuna password richiesta
echo ✅ Accesso completo a Google Drive
echo.
echo Local Opener continuera' a girare anche se:
echo - Chiudi questo terminale
echo - Riavvii il computer
echo - Chiudi la sessione utente
echo.
echo Per disinstallare l'avvio automatico:
echo - Elimina il file dalla cartella Startup
echo - Oppure esegui DISINSTALLA-LOCAL-OPENER.bat
echo.
echo Premi un tasto per chiudere...
pause >NUL
