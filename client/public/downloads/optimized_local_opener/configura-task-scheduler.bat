@echo off
setlocal enabledelayedexpansion
title Configurazione Task Scheduler per Local Opener

echo ==========================================
echo    CONFIGURAZIONE TASK SCHEDULER
echo    (Avvio automatico avanzato)
echo ==========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Questo script deve essere eseguito come amministratore!
    echo.
    echo Chiudi questa finestra e:
    echo 1. Fai clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Verifica se local-opener.exe esiste
if not exist "%~dp0local-opener.exe" (
    echo [ERRORE] local-opener.exe non trovato!
    pause
    exit /b 1
)

:: Menu opzioni
echo Scegli un'opzione:
echo.
echo 1) Crea task per avvio automatico all'accesso
echo 2) Crea task per avvio automatico del sistema
echo 3) Rimuovi task esistente
echo 4) Verifica stato task
echo 5) Esci
echo.

set /p scelta="Inserisci la tua scelta (1-5): "

if "%scelta%"=="1" goto :crea_login
if "%scelta%"=="2" goto :crea_startup
if "%scelta%"=="3" goto :rimuovi
if "%scelta%"=="4" goto :verifica
if "%scelta%"=="5" exit /b 0

echo Scelta non valida!
pause
exit /b 1

:crea_login
echo.
echo Creazione task per avvio all'accesso utente...

:: Crea XML per il task
set "xmlFile=%temp%\local_opener_task.xml"
(
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
echo   ^<RegistrationInfo^>
echo     ^<Date^>%date%^</Date^>
echo     ^<Author^>%USERNAME%^</Author^>
echo     ^<Description^>Avvia Local Opener all'accesso per accesso file da browser con supporto Google Drive^</Description^>
echo   ^</RegistrationInfo^>
echo   ^<Triggers^>
echo     ^<LogonTrigger^>
echo       ^<Enabled^>true^</Enabled^>
echo       ^<UserId^>%USERDOMAIN%\%USERNAME%^</UserId^>
echo       ^<Delay^>PT30S^</Delay^>
echo     ^</LogonTrigger^>
echo   ^</Triggers^>
echo   ^<Principals^>
echo     ^<Principal id="Author"^>
echo       ^<UserId^>%USERDOMAIN%\%USERNAME%^</UserId^>
echo       ^<LogonType^>InteractiveToken^</LogonType^>
echo       ^<RunLevel^>HighestAvailable^</RunLevel^>
echo     ^</Principal^>
echo   ^</Principals^>
echo   ^<Settings^>
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
echo     ^<AllowHardTerminate^>false^</AllowHardTerminate^>
echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^>
echo     ^<RunOnlyIfNetworkAvailable^>false^</RunOnlyIfNetworkAvailable^>
echo     ^<IdleSettings^>
echo       ^<StopOnIdleEnd^>false^</StopOnIdleEnd^>
echo       ^<RestartOnIdle^>false^</RestartOnIdle^>
echo     ^</IdleSettings^>
echo     ^<AllowStartOnDemand^>true^</AllowStartOnDemand^>
echo     ^<Enabled^>true^</Enabled^>
echo     ^<Hidden^>false^</Hidden^>
echo     ^<RunOnlyIfIdle^>false^</RunOnlyIfIdle^>
echo     ^<WakeToRun^>false^</WakeToRun^>
echo     ^<ExecutionTimeLimit^>PT0S^</ExecutionTimeLimit^>
echo     ^<Priority^>7^</Priority^>
echo     ^<RestartOnFailure^>
echo       ^<Interval^>PT1M^</Interval^>
echo       ^<Count^>3^</Count^>
echo     ^</RestartOnFailure^>
echo   ^</Settings^>
echo   ^<Actions Context="Author"^>
echo     ^<Exec^>
echo       ^<Command^>%~dp0local-opener.exe^</Command^>
echo       ^<WorkingDirectory^>%~dp0^</WorkingDirectory^>
echo     ^</Exec^>
echo   ^</Actions^>
echo ^</Task^>
) > "%xmlFile%"

:: Importa il task
schtasks /create /tn "LocalOpener_UserLogin" /xml "%xmlFile%" /f
del "%xmlFile%"

echo.
echo [OK] Task creato con successo!
echo     - Si avviera' 30 secondi dopo l'accesso
echo     - Avra' accesso completo a Google Drive
echo     - Si riavviera' automaticamente se si blocca
echo.
echo Vuoi avviare Local Opener ora? (S/N)
set /p avvia=""
if /i "%avvia%"=="S" (
    schtasks /run /tn "LocalOpener_UserLogin"
    echo [OK] Local Opener avviato!
)
pause
exit /b 0

:crea_startup
echo.
echo Creazione task per avvio all'avvio del sistema...

:: Crea task per avvio sistema
schtasks /create /tn "LocalOpener_SystemStartup" /tr "\"%~dp0local-opener.exe\"" /sc onstart /delay 0001:00 /ru "%USERDOMAIN%\%USERNAME%" /rl highest /f

echo.
echo [OK] Task creato per avvio del sistema!
echo.
echo NOTA: Questa modalita' richiede che tu abbia effettuato l'accesso
echo       per vedere Google Drive. Per un avvio completamente automatico,
echo       usa l'opzione 1 (avvio all'accesso).
echo.
pause
exit /b 0

:rimuovi
echo.
echo Rimozione task esistenti...

:: Rimuovi tutti i possibili task
schtasks /delete /tn "LocalOpener_UserLogin" /f >nul 2>&1
schtasks /delete /tn "LocalOpener_SystemStartup" /f >nul 2>&1
schtasks /delete /tn "LocalOpener" /f >nul 2>&1

echo [OK] Task rimossi!
echo.
pause
exit /b 0

:verifica
echo.
echo Verifica stato task...
echo.

:: Verifica task login
schtasks /query /tn "LocalOpener_UserLogin" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Task 'LocalOpener_UserLogin' presente
    schtasks /query /tn "LocalOpener_UserLogin" /v /fo list | findstr "Status:"
    schtasks /query /tn "LocalOpener_UserLogin" /v /fo list | findstr "Last Run Time:"
    schtasks /query /tn "LocalOpener_UserLogin" /v /fo list | findstr "Next Run Time:"
) else (
    echo [X] Task 'LocalOpener_UserLogin' NON presente
)

echo.

:: Verifica task startup
schtasks /query /tn "LocalOpener_SystemStartup" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Task 'LocalOpener_SystemStartup' presente
    schtasks /query /tn "LocalOpener_SystemStartup" /v /fo list | findstr "Status:"
) else (
    echo [X] Task 'LocalOpener_SystemStartup' NON presente
)

echo.

:: Verifica se il processo è in esecuzione
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if %errorlevel%==0 (
    echo [OK] Local Opener attualmente in esecuzione
    
    :: Mostra PID e memoria usata
    for /f "tokens=2,5" %%a in ('tasklist /FI "IMAGENAME eq local-opener.exe" /FO TABLE ^| findstr local-opener.exe') do (
        echo     PID: %%a
        echo     Memoria: %%b
    )
) else (
    echo [X] Local Opener NON in esecuzione
)

echo.
pause
exit /b 0
