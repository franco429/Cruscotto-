@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    TEST MODALITA' TERMINALE
echo    LOCAL OPENER SERVICE
echo    VERIFICA COMPLETA FUNZIONAMENTO
echo ========================================
echo.

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set TASK_NAME=LocalOpenerTerminal
set NSSM_PATH=%~dp0nssm.exe

echo Test completo del servizio Local Opener...
echo.

:: 1. VERIFICA STATO SERVIZIO
echo ========================================
echo    1. VERIFICA STATO SERVIZIO
echo ========================================
echo.

sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio %SERVICE_NAME% trovato
    echo.
    echo Stato attuale del servizio:
    sc query "%SERVICE_NAME%"
    echo.
) else (
    echo ❌ Servizio %SERVICE_NAME% non trovato
    echo Esegui prima install-local-opener.bat
    echo.
    goto :end
)

:: 2. VERIFICA CONFIGURAZIONE NSSM
echo ========================================
echo    2. VERIFICA CONFIGURAZIONE NSSM
echo ========================================
echo.

if exist "%NSSM_PATH%" (
    echo ✅ NSSM trovato, verifica configurazione...
    echo.
    echo Configurazione attuale del servizio:
    "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
) else (
    echo ❌ NSSM non trovato
    echo.
)

:: 3. VERIFICA TASK SCHEDULER
echo ========================================
echo    3. VERIFICA TASK SCHEDULER
echo ========================================
echo.

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Task scheduler %TASK_NAME% trovato
    echo.
    echo Configurazione task scheduler:
    schtasks /query /tn "%TASK_NAME%" /fo table
    echo.
) else (
    echo ❌ Task scheduler %TASK_NAME% non trovato
    echo Esegui configure-terminal-mode.bat per configurarlo
    echo.
)

:: 4. VERIFICA SCRIPT DI AVVIO
echo ========================================
echo    4. VERIFICA SCRIPT DI AVVIO
echo ========================================
echo.

set STARTUP_SCRIPT=%~dp0start-local-opener.bat
if exist "%STARTUP_SCRIPT%" (
    echo ✅ Script di avvio trovato: %STARTUP_SCRIPT%
    echo.
    echo Contenuto script di avvio:
    echo ----------------------------------------
    type "%STARTUP_SCRIPT%"
    echo ----------------------------------------
    echo.
) else (
    echo ❌ Script di avvio non trovato
    echo.
)

:: 5. VERIFICA SCRIPT TASK SCHEDULER
echo ========================================
echo    5. VERIFICA SCRIPT TASK SCHEDULER
echo ========================================
echo.

set TASK_SCRIPT=%~dp0auto-open-terminal.bat
if exist "%TASK_SCRIPT%" (
    echo ✅ Script task scheduler trovato: %TASK_SCRIPT%
    echo.
    echo Contenuto script task scheduler:
    echo ----------------------------------------
    type "%TASK_SCRIPT%"
    echo ----------------------------------------
    echo.
) else (
    echo ❌ Script task scheduler non trovato
    echo.
)

:: 6. VERIFICA DIRECTORY LOG
echo ========================================
echo    6. VERIFICA DIRECTORY LOG
echo ========================================
echo.

set LOG_DIR=C:\Logs\LocalOpener
if exist "%LOG_DIR%" (
    echo ✅ Directory log trovata: %LOG_DIR%
    echo.
    echo Contenuto directory log:
    dir "%LOG_DIR%" /b
    echo.
) else (
    echo ❌ Directory log non trovata
    echo.
)

:: 7. TEST FUNZIONAMENTO SERVIZIO
echo ========================================
echo    7. TEST FUNZIONAMENTO SERVIZIO
echo ========================================
echo.

echo Test riavvio servizio...
echo.

:: Ferma temporaneamente il servizio
echo - Arresto temporaneo del servizio...
sc stop "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio fermato
) else (
    echo ❌ Errore arresto servizio
)

:: Attendi
timeout /t 3 /nobreak >nul

:: Riavvia il servizio
echo - Riavvio del servizio...
sc start "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio riavviato
) else (
    echo ❌ Errore riavvio servizio
)

:: Attendi che si avvii
timeout /t 5 /nobreak >nul

:: Verifica stato finale
echo - Verifica stato finale...
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio in esecuzione
) else (
    echo ❌ Servizio non in esecuzione
)

echo.

:: 8. VERIFICA APERTURA AUTOMATICA
echo ========================================
echo    8. VERIFICA APERTURA AUTOMATICA
echo ========================================
echo.

echo Per testare l'apertura automatica del terminale:
echo.
echo 1. Verifica che il servizio sia in esecuzione:
echo    sc query "%SERVICE_NAME%"
echo.
echo 2. Verifica che il task scheduler sia configurato:
echo    schtasks /query /tn "%TASK_NAME%"
echo.
echo 3. Riavvia il computer per testare l'avvio automatico
echo.
echo 4. Dopo il riavvio, verifica che:
echo    - Il servizio si avvii automaticamente
echo    - Il terminale si apra automaticamente
echo    - Il task scheduler esegua lo script
echo.

:: 9. COMANDI UTILI
echo ========================================
echo    9. COMANDI UTILI
echo ========================================
echo.

echo Comandi per la gestione del servizio:
echo.
echo - Stato servizio: sc query "%SERVICE_NAME%"
echo - Avvia servizio: sc start "%SERVICE_NAME%"
echo - Ferma servizio: sc stop "%SERVICE_NAME%"
echo - Riavvia servizio: sc stop "%SERVICE_NAME%" && sc start "%SERVICE_NAME%"
echo.
echo Comandi per la gestione del task scheduler:
echo.
echo - Stato task: schtasks /query /tn "%TASK_NAME%"
echo - Esegui task: schtasks /run /tn "%TASK_NAME%"
echo - Rimuovi task: schtasks /delete /tn "%TASK_NAME%" /f
echo.
echo Comandi per la configurazione NSSM:
echo.
echo - Configurazione: "%NSSM_PATH%" dump "%SERVICE_NAME%"
echo - Riavvia servizio: "%NSSM_PATH%" restart "%SERVICE_NAME%"
echo.

:end
echo ========================================
echo    TEST COMPLETATO
echo ========================================
echo.

echo Se tutti i test sono passati:
echo ✅ Il servizio Local Opener è configurato correttamente
echo ✅ Il terminale dovrebbe aprirsi automaticamente all'avvio
echo ✅ Il task scheduler è configurato per l'apertura automatica
echo.
echo Se ci sono problemi:
echo 1. Esegui configure-terminal-mode.bat per riconfigurare
echo 2. Verifica i log in C:\Logs\LocalOpener\
echo 3. Controlla che l'antivirus non blocchi l'esecuzione
echo 4. Riavvia il computer per testare l'avvio automatico
echo.

echo Premere un tasto per chiudere...
pause >nul
