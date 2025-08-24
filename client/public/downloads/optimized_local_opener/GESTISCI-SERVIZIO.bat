@echo off
chcp 65001 >nul
title Local Opener - Gestione Servizio
echo ===============================================================================
echo           LOCAL OPENER - GESTIONE SERVIZIO WINDOWS
echo ===============================================================================
echo.
echo Questo script ti permette di gestire il servizio Local Opener
echo installato nel sistema Windows.
echo.

:menu
cls
echo ===============================================================================
echo           LOCAL OPENER - GESTIONE SERVIZIO WINDOWS
echo ===============================================================================
echo.
echo Seleziona un'operazione:
echo.
echo 1. Verifica stato servizio
echo 2. Avvia servizio
echo 3. Ferma servizio
echo 4. Riavvia servizio
echo 5. Configura avvio automatico
echo 6. Test connessione HTTP
echo 7. Diagnostica completa
echo 8. Esci
echo.
set /p choice="Inserisci la tua scelta (1-8): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto autostart
if "%choice%"=="6" goto test
if "%choice%"=="7" goto diagnose
if "%choice%"=="8" goto exit
goto menu

:status
cls
echo ===============================================================================
echo VERIFICA STATO SERVIZIO
echo ===============================================================================
echo.

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Servizio CruscottoLocalOpener non trovato!
    echo.
    echo Il servizio non è installato nel sistema.
    echo Per installarlo, esegui: INSTALLA-SERVIZIO-AMMINISTRATORE.bat
    echo.
    pause
    goto menu
)

REM Mostra stato dettagliato del servizio
echo [INFO] Stato servizio CruscottoLocalOpener:
echo.
sc query "CruscottoLocalOpener"

echo.
echo ===============================================================================
echo VERIFICA PROCESSI
echo ===============================================================================
echo.

REM Verifica processi attivi
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Processi Local Opener attivi:
    tasklist /FI "IMAGENAME eq local-opener.exe"
) else (
    echo [ATTENZIONE] Nessun processo Local Opener attivo
)

echo.
echo ===============================================================================
echo VERIFICA PORTA DI RETE
echo ===============================================================================
echo.

REM Verifica porta 17654
netstat -an | find ":17654" >nul
if %errorLevel% == 0 (
    echo [OK] Porta 17654 in ascolto:
    netstat -an | find ":17654"
) else (
    echo [ATTENZIONE] Porta 17654 non in ascolto
)

echo.
pause
goto menu

:start
cls
echo ===============================================================================
echo AVVIO SERVIZIO
echo ===============================================================================
echo.

echo [INFO] Avvio servizio CruscottoLocalOpener...

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Servizio non trovato! Installalo prima.
    pause
    goto menu
)

REM Avvia il servizio
sc start "CruscottoLocalOpener"
if %errorLevel% == 0 (
    echo [OK] Servizio avviato con successo
    echo [INFO] Attendo avvio completo...
    timeout /t 5 >NUL
    
    REM Verifica stato
    sc query "CruscottoLocalOpener" | find "RUNNING" >NUL
    if %errorLevel% == 0 (
        echo [OK] Servizio attivo e in esecuzione
    ) else (
        echo [ATTENZIONE] Servizio avviato ma potrebbe non essere ancora completamente attivo
    )
) else (
    echo [ERRORE] Impossibile avviare il servizio
    echo [INFO] Controlla i log in: C:\ProgramData\.local-opener\
)

echo.
pause
goto menu

:stop
cls
echo ===============================================================================
echo FERMATA SERVIZIO
echo ===============================================================================
echo.

echo [INFO] Fermata servizio CruscottoLocalOpener...

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Servizio non trovato!
    pause
    goto menu
)

REM Ferma il servizio
sc stop "CruscottoLocalOpener"
if %errorLevel% == 0 (
    echo [OK] Servizio fermato con successo
) else (
    echo [ERRORE] Impossibile fermare il servizio
)

echo.
pause
goto menu

:restart
cls
echo ===============================================================================
echo RIAVVIO SERVIZIO
echo ===============================================================================
echo.

echo [INFO] Riavvio servizio CruscottoLocalOpener...

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Servizio non trovato! Installalo prima.
    pause
    goto menu
)

REM Ferma il servizio
echo [INFO] Fermata servizio...
sc stop "CruscottoLocalOpener" >nul 2>&1
timeout /t 3 >NUL

REM Avvia il servizio
echo [INFO] Avvio servizio...
sc start "CruscottoLocalOpener"
if %errorLevel% == 0 (
    echo [OK] Servizio riavviato con successo
    echo [INFO] Attendo avvio completo...
    timeout /t 5 >NUL
    
    REM Verifica stato
    sc query "CruscottoLocalOpener" | find "RUNNING" >NUL
    if %errorLevel% == 0 (
        echo [OK] Servizio attivo e in esecuzione
    ) else (
        echo [ATTENZIONE] Servizio riavviato ma potrebbe non essere ancora completamente attivo
    )
) else (
    echo [ERRORE] Impossibile riavviare il servizio
)

echo.
pause
goto menu

:autostart
cls
echo ===============================================================================
echo CONFIGURAZIONE AVVIO AUTOMATICO
echo ===============================================================================
echo.

echo [INFO] Configurazione avvio automatico servizio...

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Servizio non trovato! Installalo prima.
    pause
    goto menu
)

REM Verifica configurazione attuale
echo [INFO] Configurazione attuale:
sc qc "CruscottoLocalOpener" | find "START_TYPE"

echo.
echo [INFO] Impostazione avvio automatico...
sc config "CruscottoLocalOpener" start= auto

if %errorLevel% == 0 (
    echo [OK] Avvio automatico configurato
    echo.
    echo [INFO] Nuova configurazione:
    sc qc "CruscottoLocalOpener" | find "START_TYPE"
) else (
    echo [ERRORE] Impossibile configurare avvio automatico
    echo [INFO] Potrebbe essere necessario eseguire come amministratore
)

echo.
pause
goto menu

:test
cls
echo ===============================================================================
echo TEST CONNESSIONE HTTP
echo ===============================================================================
echo.

echo [INFO] Test connessione al servizio Local Opener...

REM Verifica se il servizio è attivo
sc query "CruscottoLocalOpener" | find "RUNNING" >NUL
if %errorLevel% neq 0 (
    echo [ATTENZIONE] Servizio non attivo. Avvialo prima.
    echo.
    echo Per avviarlo, torna al menu principale e seleziona "Avvia servizio"
    pause
    goto menu
)

echo [INFO] Servizio attivo, test connessione HTTP...
timeout /t 2 >NUL

REM Test connessione HTTP
where curl >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Test endpoint principale: http://127.0.0.1:17654
    curl -s -o nul -w "HTTP Status: %%{http_code}" http://127.0.0.1:17654 2>nul
    if %errorLevel% == 0 (
        echo [OK] Servizio risponde correttamente
    ) else (
        echo [ERRORE] Servizio non risponde HTTP
    )
    
    echo.
    echo [INFO] Test endpoint health: http://127.0.0.1:17654/health
    curl -s -o nul -w "HTTP Status: %%{http_code}" http://127.0.0.1:17654/health 2>nul
    if %errorLevel% == 0 (
        echo [OK] Endpoint health risponde correttamente
    ) else (
        echo [ERRORE] Endpoint health non risponde
    )
) else (
    echo [INFO] curl non disponibile, salto test HTTP
    echo [INFO] Apri manualmente http://127.0.0.1:17654 nel browser
)

echo.
echo [INFO] URL servizio: http://127.0.0.1:17654
echo [INFO] Endpoint health: http://127.0.0.1:17654/health

echo.
pause
goto menu

:diagnose
cls
echo ===============================================================================
echo DIAGNOSTICA COMPLETA
echo ===============================================================================
echo.

echo [INFO] Avvio diagnostica completa del servizio...
echo.

REM Esegui script PowerShell di diagnostica
if exist "%~dp0diagnostica-servizio.ps1" (
    echo [INFO] Esecuzione script diagnostica PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostica-servizio.ps1"
) else (
    echo [ERRORE] Script diagnostica non trovato
    echo [INFO] Esegui manualmente: diagnostica-servizio.bat
)

echo.
pause
goto menu

:exit
cls
echo ===============================================================================
echo GESTIONE SERVIZIO COMPLETATA
echo ===============================================================================
echo.
echo Grazie per aver utilizzato Local Opener Service Manager!
echo.
echo Per assistenza:
echo - Controlla i log in: C:\ProgramData\.local-opener\
echo - Esegui diagnostica-servizio.bat per analisi dettagliata
echo - Riavvia il PC per testare l'avvio automatico
echo.
echo URL servizio: http://127.0.0.1:17654
echo.
echo Premi un tasto per uscire...
pause >NUL
exit
