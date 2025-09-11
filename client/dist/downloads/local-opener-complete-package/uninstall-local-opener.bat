@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    DISINSTALLAZIONE LOCAL OPENER SERVICE
echo    RIMOZIONE COMPLETA SERVIZIO E TASK
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    echo.
    echo Per eseguire come amministratore:
    echo 1. Tasto destro su questo file
    echo 2. "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set TASK_NAME=LocalOpenerTerminal
set LOG_DIR=C:\Logs\LocalOpener
set STARTUP_SCRIPT=%~dp0start-local-opener.bat
set TASK_SCRIPT=%~dp0auto-open-terminal.bat

echo Configurazione disinstallazione:
echo - Nome servizio: %SERVICE_NAME%
echo - Nome task scheduler: %TASK_NAME%
echo - Directory log: %LOG_DIR%
echo - Script di avvio: %STARTUP_SCRIPT%
echo - Script task scheduler: %TASK_SCRIPT%
echo.

:: Verifica se il servizio esiste
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo Il servizio %SERVICE_NAME% non esiste.
    goto :remove_task
)

echo.
echo ========================================
echo    RIMOZIONE SERVIZIO WINDOWS
echo ========================================
echo.

:: Ferma il servizio
echo - Arresto del servizio %SERVICE_NAME%...
sc stop "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Servizio fermato con successo
) else (
    echo   Servizio già fermo o non avviato
)

:: Attendi che il servizio si fermi completamente
echo - Attesa completamento arresto servizio...
timeout /t 5 /nobreak >nul

:: Rimuovi il servizio
echo - Rimozione servizio %SERVICE_NAME%...
sc delete "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Servizio rimosso con successo
) else (
    echo  Errore rimozione servizio
    echo Tentativo di rimozione forzata...
    sc delete "%SERVICE_NAME%" /force >nul 2>&1
    if %errorLevel% equ 0 (
        echo Servizio rimosso con rimozione forzata
    ) else (
        echo  Impossibile rimuovere il servizio
        echo Potrebbe essere necessario riavviare il computer
    )
)

:remove_task
echo.
echo ========================================
echo    RIMOZIONE TASK SCHEDULER
echo ========================================
echo.

:: Verifica se il task scheduler esiste
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo Il task scheduler %TASK_NAME% non esiste.
    goto :cleanup_files
)

:: Rimuovi il task scheduler
echo - Rimozione task scheduler %TASK_NAME%...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo Task scheduler rimosso con successo
) else (
    echo  Errore rimozione task scheduler
    echo Tentativo di rimozione forzata...
    schtasks /delete /tn "%TASK_NAME%" /f /force >nul 2>&1
    if %errorLevel% equ 0 (
        echo Task scheduler rimosso con rimozione forzata
    ) else (
        echo  Impossibile rimuovere il task scheduler
        echo Potrebbe essere necessario riavviare il computer
    )
)

:cleanup_files
echo.
echo ========================================
echo    PULIZIA FILE E DIRECTORY
echo ========================================
echo.

:: Rimuovi script di avvio se esistono
if exist "%STARTUP_SCRIPT%" (
    echo - Rimozione script di avvio...
    del "%STARTUP_SCRIPT%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo Script di avvio rimosso
    ) else (
        echo  Errore rimozione script di avvio
    )
)

:: Rimuovi script task scheduler se esistono
if exist "%TASK_SCRIPT%" (
    echo - Rimozione script task scheduler...
    del "%TASK_SCRIPT%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo Script task scheduler rimosso
    ) else (
        echo  Errore rimozione script task scheduler
    )
)

:: Rimuovi directory log se vuota
if exist "%LOG_DIR%" (
    echo - Verifica directory log...
    dir "%LOG_DIR%" /b >nul 2>&1
    if %errorLevel% equ 0 (
        echo - Directory log contiene file, verifica manuale necessaria
        echo   Percorso: %LOG_DIR%
    ) else (
        echo - Directory log vuota, rimozione...
        rmdir "%LOG_DIR%" >nul 2>&1
        if %errorLevel% equ 0 (
            echo Directory log rimossa
        ) else (
            echo  Errore rimozione directory log
        )
    )
)

echo.
echo ========================================
echo    DISINSTALLAZIONE COMPLETATA!
echo ========================================
echo.

echo Servizio Local Opener rimosso
echo Task Scheduler rimosso
echo File temporanei puliti
echo.

echo 📋 INFORMAZIONI IMPORTANTI:
echo - Il servizio Local Opener è stato completamente rimosso
echo - Il task scheduler per apertura automatica è stato rimosso
echo - I file temporanei sono stati puliti
echo - I log potrebbero essere ancora presenti in: %LOG_DIR%
echo.

echo 🔧 VERIFICA RIMOZIONE:
echo Per verificare che tutto sia stato rimosso:
echo.
echo 1. Verifica servizio:
echo    sc query "%SERVICE_NAME%"
echo.
echo 2. Verifica task scheduler:
echo    schtasks /query /tn "%TASK_NAME%"
echo.
echo 3. Verifica file:
echo    - Script di avvio: %STARTUP_SCRIPT%
echo    - Script task scheduler: %TASK_SCRIPT%
echo.

echo 🚀 PROSSIMI PASSI:
echo 1. Riavvia il computer per completare la pulizia
echo 2. Verifica che non ci siano più riferimenti al servizio
echo 3. Se necessario, reinstallare con install-local-opener.bat
echo.

echo Premere un tasto per chiudere...
pause >nul
