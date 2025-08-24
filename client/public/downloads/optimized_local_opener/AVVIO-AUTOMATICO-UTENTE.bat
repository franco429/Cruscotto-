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

echo [2/4] Creazione script VBS per avvio background...
REM Crea VBScript che avvia local-opener.exe in background
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\start-local-opener.vbs"
echo WshShell.Run "%~dp0local-opener.exe", 0, False >> "%TEMP%\start-local-opener.vbs"

echo [3/4] Avvio Local Opener in modalita' background VERA...
REM Esegui VBScript per avvio completamente in background
cscript //nologo "%TEMP%\start-local-opener.vbs"

echo [4/4] Verifica avvio...
timeout /t 3 >NUL
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Local Opener avviato con successo in background VERO!
) else (
    echo ❌ Errore nell'avvio di Local Opener
    pause
    exit /b 1
)

echo [5/5] Configurazione avvio automatico...
REM Crea VBScript permanente per avvio automatico
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_FOLDER%" mkdir "%STARTUP_FOLDER%"

REM Crea VBScript nella cartella Startup per avvio automatico
echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_FOLDER%\Local-Opener-Auto.vbs"
echo WshShell.Run "%~dp0local-opener.exe", 0, False >> "%STARTUP_FOLDER%\Local-Opener-Auto.vbs"

REM Pulisci file temporanei
del "%TEMP%\start-local-opener.vbs" >NUL 2>&1

echo.
echo ========================================
echo    CONFIGURAZIONE COMPLETATA!
echo ========================================
echo.
echo ✅ Local Opener avviato in background VERO
echo ✅ Processo completamente indipendente da CMD
echo ✅ Avvio automatico configurato per il riavvio
echo ✅ Nessuna password richiesta
echo ✅ Accesso completo a Google Drive
echo.
echo Local Opener continuera' a girare anche se:
echo - Chiudi questo terminale CMD
echo - Chiudi tutte le finestre
echo - Riavvii il computer
echo - Chiudi la sessione utente
echo.
echo 🔧 TECNICA UTILIZZATA:
echo - VBScript con WScript.Shell
echo - Modalita' 0 (nascosta)
echo - False (non aspetta la chiusura)
echo.
echo Per disinstallare l'avvio automatico:
echo - Elimina il file dalla cartella Startup
echo - Oppure esegui DISINSTALLA-LOCAL-OPENER.bat
echo.
echo Premi un tasto per chiudere...
pause >NUL
