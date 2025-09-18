@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   SETUP TASK SCHEDULER LOCAL OPENER
echo   AVVIO AUTOMATICO AL LOGON (SENZA NSSM)
echo ========================================

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    pause
    exit /b 1
)

:: Variabili
set EXE_NAME=cruscotto-local-opener-setup.exe
set EXE_PATH=%~dp0%EXE_NAME%
set TASK_NAME=LocalOpenerAuto
set LOG_DIR=C:\Logs\LocalOpener
set WRAPPER_PATH=%~dp0local-opener-wrapper.bat

:: Verifica exe
if not exist "%EXE_PATH%" (
    echo ERRORE: %EXE_NAME% non trovato in %~dp0
    echo FIX: Copia %EXE_NAME% dalla sottocartella local-opener-complete-package qui.
    pause
    exit /b 1
)

:: Crea directory log
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Crea wrapper script line by line per evitare problemi di escape
echo Creazione wrapper script...
if exist "%WRAPPER_PATH%" del "%WRAPPER_PATH%"

echo @echo off >> "%WRAPPER_PATH%"
echo title Local Opener - Running >> "%WRAPPER_PATH%"
echo setlocal enabledelayedexpansion >> "%WRAPPER_PATH%"
echo. >> "%WRAPPER_PATH%"
echo :loop >> "%WRAPPER_PATH%"
echo echo [%date% %time%] Starting Local Opener... >> "%WRAPPER_PATH%"
echo "%EXE_PATH%" ^>^> "%LOG_DIR%\LocalOpener.log" 2^>^> "%LOG_DIR%\LocalOpener-error.log" >> "%WRAPPER_PATH%"
echo if %%errorlevel%% neq 0 ( >> "%WRAPPER_PATH%"
echo     echo [%date% %time%] Error occurred, restarting in 5 seconds... >> "%WRAPPER_PATH%"
echo     timeout /t 5 /nobreak ^>nul >> "%WRAPPER_PATH%"
echo ) >> "%WRAPPER_PATH%"
echo goto :loop >> "%WRAPPER_PATH%"

:: Rimuovi task esistente
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: Crea task scheduler
echo Creazione task scheduler...
schtasks /create /tn "%TASK_NAME%" /tr "%WRAPPER_PATH%" /sc onlogon /ru "%USERNAME%" /rl highest /f /delay 0000:30
if %errorlevel% neq 0 (
    echo  Errore nella creazione del task!
    pause
    exit /b 1
)

:: Avvia il task manualmente per test
echo Avvio task per verifica...
schtasks /run /tn "%TASK_NAME%"

:: Configura firewall se necessario
netsh advfirewall firewall show rule name="Local Opener Service" >nul 2>&1
if %errorlevel% neq 0 (
    echo Configurazione regola firewall...
    netsh advfirewall firewall add rule name="Local Opener Service" dir=in action=allow protocol=TCP localport=17654
)

echo.
echo ========================================
echo    INSTALLAZIONE COMPLETATA!
echo ========================================
echo.
echo - Task: %TASK_NAME%
echo - Wrapper: %WRAPPER_PATH%
echo - Log: %LOG_DIR%
echo.
echo Prossimi passi:
echo 1. Esegui verify-local-opener-complete.bat per verificare
echo 2. Installa Google Drive Desktop se non presente
echo 3. Riavvia il PC per testare avvio automatico
echo.
pause
