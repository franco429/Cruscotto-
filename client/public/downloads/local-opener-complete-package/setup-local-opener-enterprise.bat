@echo off
setlocal enabledelayedexpansion

:: ========================================
::    SETUP LOCAL OPENER ENTERPRISE
::    PER DEPLOYMENT SCALABILE 200+ AZIENDE
:: ========================================

echo ========================================
echo    LOCAL OPENER ENTERPRISE SETUP
echo    Deployment Scalabile Multi-Utente
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Esegui come amministratore!
    pause
    exit /b 1
)

:: Variabili configurabili
set TASK_NAME_PREFIX=LocalOpener
set EXE_PATH=%~dp0cruscotto-local-opener-setup.exe
set LOG_BASE_DIR=C:\ProgramData\LocalOpener\Logs
set CONFIG_DIR=C:\ProgramData\LocalOpener\Config

:: Verifica esistenza exe
if not exist "%EXE_PATH%" (
    echo ERRORE: cruscotto-local-opener-setup.exe non trovato!
    pause
    exit /b 1
)

:: Crea directory condivise
echo Creazione directory condivise...
if not exist "%LOG_BASE_DIR%" mkdir "%LOG_BASE_DIR%"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"
if not exist "C:\ProgramData\LocalOpener" mkdir "C:\ProgramData\LocalOpener"

:: Copia exe nella directory di sistema per accesso multi-utente
echo Copia file eseguibile...
copy "%EXE_PATH%" "C:\ProgramData\LocalOpener\cruscotto-local-opener-setup.exe" /Y >nul
if %errorLevel% neq 0 (
    echo ❌ ERRORE: Impossibile copiare l'exe in ProgramData
    pause
    exit /b 1
)

:: Imposta permessi per tutti gli utenti
echo Configurazione permessi...
icacls "%LOG_BASE_DIR%" /grant Users:(OI)(CI)M /T >nul 2>&1
icacls "%CONFIG_DIR%" /grant Users:(OI)(CI)M /T >nul 2>&1
icacls "C:\ProgramData\LocalOpener\cruscotto-local-opener-setup.exe" /grant Users:(RX) >nul 2>&1

:: Menu opzioni deployment
echo.
echo Seleziona modalità deployment:
echo 1. Installazione per TUTTI gli utenti (raccomandato per aziende)
echo 2. Installazione per utente CORRENTE (%USERNAME%)
echo 3. Installazione per utente SPECIFICO
echo 4. Genera script PowerShell per deployment remoto
echo.
set /p choice="Scelta (1-4): "

if "%choice%"=="1" goto :install_all_users
if "%choice%"=="2" goto :install_current_user
if "%choice%"=="3" goto :install_specific_user
if "%choice%"=="4" goto :generate_ps_script
goto :menu_error

:install_all_users
echo.
echo Installazione per TUTTI GLI UTENTI...
set TASK_NAME=%TASK_NAME_PREFIX%_AllUsers

:: Crea task che gira per tutti gli utenti
:: Prima verifica che il file XML esista
if exist "%~dp0local-opener-allusers.xml" (
    schtasks /create /tn "%TASK_NAME%" /xml "%~dp0local-opener-allusers.xml" /f >nul 2>&1
    if %errorLevel% neq 0 (
        echo Creazione task con XML fallita, uso metodo alternativo...
        goto :alternative_method
    )
) else (
    echo File XML non trovato, uso metodo alternativo...
    :alternative_method
    :: Metodo alternativo: crea task con script wrapper per evitare problemi di escape
    :: Crea script wrapper per tutti gli utenti
    echo @echo off > "C:\ProgramData\LocalOpener\local-opener-wrapper.bat"
    echo timeout /t 45 /nobreak ^>nul >> "C:\ProgramData\LocalOpener\local-opener-wrapper.bat"
    echo mkdir "%LOG_BASE_DIR%\%%USERNAME%%" 2^>nul >> "C:\ProgramData\LocalOpener\local-opener-wrapper.bat"
    echo "C:\ProgramData\LocalOpener\cruscotto-local-opener-setup.exe" ^> "%LOG_BASE_DIR%\%%USERNAME%%\LocalOpener.log" 2^> "%LOG_BASE_DIR%\%%USERNAME%%\LocalOpener-error.log" >> "C:\ProgramData\LocalOpener\local-opener-wrapper.bat"
    
    schtasks /create /tn "%TASK_NAME%" ^
        /tr "C:\ProgramData\LocalOpener\local-opener-wrapper.bat" ^
        /sc onlogon ^
        /ru "BUILTIN\Users" ^
        /rl highest ^
        /f
)

echo ✅ Task creato per tutti gli utenti
goto :configure_advanced

:install_current_user
echo.
echo Installazione per utente corrente (%USERNAME%)...
set USER_TO_INSTALL=%USERNAME%
goto :do_user_install

:install_specific_user
echo.
set /p USER_TO_INSTALL="Inserisci nome utente: "
goto :do_user_install

:do_user_install
set TASK_NAME=%TASK_NAME_PREFIX%_%USER_TO_INSTALL%
set USER_LOG_DIR=%LOG_BASE_DIR%\%USER_TO_INSTALL%

:: Crea directory log utente
if not exist "%USER_LOG_DIR%" mkdir "%USER_LOG_DIR%"

:: Crea task per utente specifico usando wrapper script
:: Crea script wrapper per l'utente specifico
echo @echo off > "%TEMP%\local-opener-wrapper-%USER_TO_INSTALL%.bat"
echo timeout /t 45 /nobreak ^>nul >> "%TEMP%\local-opener-wrapper-%USER_TO_INSTALL%.bat"
echo "C:\ProgramData\LocalOpener\cruscotto-local-opener-setup.exe" ^> "%USER_LOG_DIR%\LocalOpener.log" 2^> "%USER_LOG_DIR%\LocalOpener-error.log" >> "%TEMP%\local-opener-wrapper-%USER_TO_INSTALL%.bat"

schtasks /create /tn "%TASK_NAME%" ^
    /tr "%TEMP%\local-opener-wrapper-%USER_TO_INSTALL%.bat" ^
    /sc onlogon ^
    /ru "%USER_TO_INSTALL%" ^
    /rl highest ^
    /f

echo ✅ Task creato per utente %USER_TO_INSTALL%
goto :configure_advanced

:generate_ps_script
echo.
echo Generazione script PowerShell per deployment remoto...

(
echo # Local Opener Enterprise Deployment Script
echo # Generato da setup-local-opener-enterprise.bat
echo.
echo $ErrorActionPreference = "Stop"
echo.
echo # Configurazione
echo $ExePath = "%EXE_PATH%"
echo $TaskPrefix = "%TASK_NAME_PREFIX%"
echo $LogBaseDir = "%LOG_BASE_DIR%"
echo $ConfigDir = "%CONFIG_DIR%"
echo.
echo # Funzione per installare su computer remoto
echo function Install-LocalOpener {
echo     param(
echo         [string]$ComputerName,
echo         [string]$Username = "all"
echo     )
echo.
echo     Write-Host "Installazione su $ComputerName per utente: $Username"
echo.
echo     # Copia file su computer remoto
echo     $RemotePath = "\\$ComputerName\C$\Temp\LocalOpener"
echo     New-Item -Path $RemotePath -ItemType Directory -Force
echo     Copy-Item -Path $ExePath -Destination $RemotePath -Force
echo.
echo     # Crea task remoto
echo     if ($Username -eq "all") {
echo         $TaskXML = @"
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
echo   ^<Triggers^>
echo     ^<LogonTrigger^>
echo       ^<Enabled^>true^</Enabled^>
echo       ^<Delay^>PT45S^</Delay^>
echo     ^</LogonTrigger^>
echo   ^</Triggers^>
echo   ^<Principals^>
echo     ^<Principal^>
echo       ^<GroupId^>S-1-5-32-545^</GroupId^>
echo       ^<RunLevel^>HighestAvailable^</RunLevel^>
echo     ^</Principal^>
echo   ^</Principals^>
echo   ^<Settings^>
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
echo     ^<RestartOnFailure^>
echo       ^<Interval^>PT1M^</Interval^>
echo       ^<Count^>3^</Count^>
echo     ^</RestartOnFailure^>
echo   ^</Settings^>
echo   ^<Actions^>
echo     ^<Exec^>
echo       ^<Command^>$RemotePath\cruscotto-local-opener-setup.exe^</Command^>
echo     ^</Exec^>
echo   ^</Actions^>
echo ^</Task^>
echo "@
echo         $TaskXML ^| Out-File -FilePath "$RemotePath\task.xml" -Encoding Unicode
echo         Invoke-Command -ComputerName $ComputerName -ScriptBlock {
echo             schtasks /create /tn "${using:TaskPrefix}_AllUsers" /xml "C:\Temp\LocalOpener\task.xml" /f
echo         }
echo     } else {
echo         Invoke-Command -ComputerName $ComputerName -ScriptBlock {
echo             schtasks /create /tn "${using:TaskPrefix}_${using:Username}" /tr "C:\Temp\LocalOpener\cruscotto-local-opener-setup.exe" /sc onlogon /ru $using:Username /rl highest /f
echo         }
echo     }
echo.
echo     Write-Host "✅ Installazione completata su $ComputerName"
echo }
echo.
echo # Esempio uso:
echo # Install-LocalOpener -ComputerName "PC001"
echo # Install-LocalOpener -ComputerName "PC002" -Username "mario.rossi"
echo.
echo # Per installare su lista di PC:
echo # $computers = Get-Content "computers.txt"
echo # foreach ($pc in $computers) { Install-LocalOpener -ComputerName $pc }
) > "%~dp0deploy-local-opener.ps1"

echo ✅ Script PowerShell generato: deploy-local-opener.ps1
echo.
echo Usalo con: PowerShell -ExecutionPolicy Bypass -File deploy-local-opener.ps1
goto :end

:configure_advanced
echo.
echo ========================================
echo    CONFIGURAZIONI AVANZATE
echo ========================================
echo.

:: Configurazione firewall
echo Configurazione Windows Firewall...
netsh advfirewall firewall add rule name="Local Opener Service" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Regola firewall creata (porta 17654)
) else (
    echo ⚠️ Impossibile creare regola firewall
)

:: Configurazione antivirus (Windows Defender)
echo.
echo Configurazione esclusioni antivirus...
powershell -Command "Add-MpPreference -ExclusionPath '%EXE_PATH%'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%LOG_BASE_DIR%'" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Esclusioni Windows Defender configurate
) else (
    echo ⚠️ Impossibile configurare esclusioni (richiede PowerShell admin)
)

:: Test connettività
echo.
echo Test servizio Local Opener...
timeout /t 5 /nobreak >nul
curl -s http://127.0.0.1:17654/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio Local Opener attivo e funzionante!
) else (
    echo ⚠️ Servizio non ancora attivo (normale al primo avvio)
)

:menu_error
echo.
echo Scelta non valida!
pause
exit /b 1

:end
echo.
echo ========================================
echo    INSTALLAZIONE COMPLETATA
echo ========================================
echo.
echo 📋 RIEPILOGO:
echo - Task Scheduler configurato
echo - Log in: %LOG_BASE_DIR%
echo - Config in: %CONFIG_DIR%
echo - Firewall configurato (porta 17654)
echo - Esclusioni antivirus aggiunte
echo.
echo 🚀 PROSSIMI PASSI:
echo 1. Riavvia il PC per testare l'avvio automatico
echo 2. Verifica i log in %LOG_BASE_DIR%
echo 3. Per deployment su 200+ PC, usa deploy-local-opener.ps1
echo.
echo 💡 SUGGERIMENTI PER SICUREZZA:
echo - Firma digitalmente cruscotto-local-opener-setup.exe
echo - Usa certificato EV per evitare warning
echo - Testa su gruppo pilota prima del rollout completo
echo - Monitora i log centralizzati per errori
echo.
pause
