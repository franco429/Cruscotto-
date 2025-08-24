@echo off
chcp 65001 >nul
title Local Opener - Disinstallazione Servizio
echo ===============================================================================
echo           LOCAL OPENER - DISINSTALLAZIONE SERVIZIO
echo ===============================================================================
echo.
echo Questo script rimuove il servizio Windows Local Opener
echo e pulisce tutti i file di configurazione.
echo.
echo ATTENZIONE: Richiede privilegi di amministratore!
echo.

REM Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Questo script richiede privilegi di amministratore!
    echo.
    echo Per eseguirlo:
    echo 1. Fai clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo [OK] Privilegi amministratore verificati
echo.

echo [INFO] Inizio disinstallazione servizio Local Opener...
echo.

REM Verifica se il servizio esiste
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Servizio CruscottoLocalOpener non trovato
    echo [INFO] Procedo con pulizia file di configurazione
) else (
    echo [INFO] Servizio CruscottoLocalOpener trovato
    echo [INFO] Rimozione in corso...
    
    REM Ferma il servizio se è in esecuzione
    sc query "CruscottoLocalOpener" | find "RUNNING" >nul
    if %errorLevel% == 0 (
        echo [INFO] Servizio in esecuzione, arresto in corso...
        sc stop "CruscottoLocalOpener" >nul 2>&1
        timeout /t 5 >NUL
        
        REM Verifica che sia fermato
        sc query "CruscottoLocalOpener" | find "RUNNING" >nul
        if %errorLevel% == 0 (
            echo [ATTENZIONE] Impossibile fermare il servizio
            echo [INFO] Tentativo di rimozione forzata...
        ) else (
            echo [OK] Servizio fermato
        )
    )
    
    REM Rimuovi il servizio
    echo [INFO] Rimozione servizio dal sistema...
    sc delete "CruscottoLocalOpener" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Servizio rimosso con successo
    ) else (
        echo [ERRORE] Impossibile rimuovere il servizio
        echo [INFO] Potrebbe essere necessario riavviare il PC
    )
)

echo.
echo ===============================================================================
echo PASSO 1: Rimozione regole firewall
echo ===============================================================================
echo.

echo [INFO] Rimozione regole firewall per Local Opener...

REM Rimuovi regole firewall esistenti
netsh advfirewall firewall delete rule name="Local Opener Service" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Regola firewall "Local Opener Service" rimossa
) else (
    echo [INFO] Regola firewall "Local Opener Service" non trovata
)

netsh advfirewall firewall delete rule name="Local Opener User" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Regola firewall "Local Opener User" rimossa
) else (
    echo [INFO] Regola firewall "Local Opener User" non trovata
)

echo.
echo ===============================================================================
echo PASSO 2: Pulizia file di configurazione sistema
echo ===============================================================================
echo.

echo [INFO] Pulizia configurazione sistema...

REM Rimuovi directory configurazione sistema
if exist "C:\ProgramData\.local-opener" (
    echo [INFO] Rimozione directory configurazione sistema...
    rmdir /s /q "C:\ProgramData\.local-opener" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Directory configurazione sistema rimossa
    ) else (
        echo [ATTENZIONE] Impossibile rimuovere directory configurazione sistema
        echo [INFO] Potrebbe essere necessario riavviare il PC
    )
) else (
    echo [INFO] Directory configurazione sistema non trovata
)

echo.
echo ===============================================================================
echo PASSO 3: Pulizia file di configurazione utente
echo ===============================================================================
echo.

echo [INFO] Pulizia configurazione utente...

REM Rimuovi directory configurazione utente
if exist "%APPDATA%\.local-opener" (
    echo [INFO] Rimozione directory configurazione utente...
    rmdir /s /q "%APPDATA%\.local-opener" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Directory configurazione utente rimossa
    ) else (
        echo [ATTENZIONE] Impossibile rimuovere directory configurazione utente
        echo [INFO] Potrebbe essere necessario riavviare il PC
    )
) else (
    echo [INFO] Directory configurazione utente non trovata
)

echo.
echo ===============================================================================
echo PASSO 4: Rimozione script avvio automatico
echo ===============================================================================
echo.

echo [INFO] Rimozione script avvio automatico...

REM Rimuovi script dalla cartella Startup
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs" (
    del "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Script avvio automatico utente rimosso
    ) else (
        echo [ATTENZIONE] Impossibile rimuovere script avvio automatico utente
    )
) else (
    echo [INFO] Script avvio automatico utente non trovato
)

echo.
echo ===============================================================================
echo PASSO 5: Arresto processi rimanenti
echo ===============================================================================
echo.

echo [INFO] Arresto processi Local Opener rimanenti...

REM Arresta tutti i processi Local Opener esistenti
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Processi Local Opener trovati, terminazione in corso...
    taskkill /F /IM local-opener.exe >NUL 2>&1
    if %errorLevel% == 0 (
        echo [OK] Processi Local Opener terminati
    ) else (
        echo [ATTENZIONE] Impossibile terminare alcuni processi
    )
) else (
    echo [INFO] Nessun processo Local Opener attivo
)

REM Arresta anche processi Node.js Local Opener
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq local-opener" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Processi Node.js Local Opener trovati, terminazione in corso...
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq local-opener" >NUL 2>&1
    if %errorLevel% == 0 (
        echo [OK] Processi Node.js Local Opener terminati
    ) else (
        echo [ATTENZIONE] Impossibile terminare alcuni processi Node.js
    )
) else (
    echo [INFO] Nessun processo Node.js Local Opener attivo
)

echo.
echo ===============================================================================
echo PASSO 6: Verifica rimozione
echo ===============================================================================
echo.

echo [INFO] Verifica rimozione completa...

REM Verifica che il servizio sia stato rimosso
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% neq 0 (
    echo [OK] Servizio non più presente nel sistema
) else (
    echo [ATTENZIONE] Servizio ancora presente nel sistema
    echo [INFO] Potrebbe essere necessario riavviare il PC
)

REM Verifica che non ci siano processi attivi
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [ATTENZIONE] Processi Local Opener ancora attivi
) else (
    echo [OK] Nessun processo Local Opener attivo
)

REM Verifica che le directory siano state rimosse
if not exist "C:\ProgramData\.local-opener" (
    echo [OK] Directory configurazione sistema rimossa
) else (
    echo [ATTENZIONE] Directory configurazione sistema ancora presente
)

if not exist "%APPDATA%\.local-opener" (
    echo [OK] Directory configurazione utente rimossa
) else (
    echo [ATTENZIONE] Directory configurazione utente ancora presente
)

echo.
echo ===============================================================================
echo DISINSTALLAZIONE COMPLETATA!
echo ===============================================================================
echo.

echo 📊 STATO FINALE:
if exist "C:\ProgramData\.local-opener" (
    echo ⚠️  Configurazione sistema: ANCORA PRESENTE
) else (
    echo ✅ Configurazione sistema: RIMOSSA
)

if exist "%APPDATA%\.local-opener" (
    echo ⚠️  Configurazione utente: ANCORA PRESENTE
) else (
    echo ✅ Configurazione utente: RIMOSSA
)

sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% == 0 (
    echo ⚠️  Servizio Windows: ANCORA PRESENTE
) else (
    echo ✅ Servizio Windows: RIMOSSO
)

tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Processi attivi: ANCORA PRESENTI
) else (
    echo ✅ Processi attivi: TERMINATI
)

echo.
echo 🔧 PROSSIMI PASSI:
echo 1. Se alcuni elementi sono ancora presenti, riavvia il PC
echo 2. Dopo il riavvio, esegui nuovamente questo script se necessario
echo 3. Per reinstallare, usa: INSTALLA-SERVIZIO-AMMINISTRATORE.bat
echo.

echo 💡 INFORMAZIONI IMPORTANTI:
echo - Il servizio è stato rimosso dal sistema
echo - Le configurazioni sono state eliminate
echo - I processi sono stati terminati
echo - Le regole firewall sono state rimosse
echo - Gli script di avvio automatico sono stati eliminati
echo.

echo Per reinstallare il servizio:
echo - Esegui: INSTALLA-SERVIZIO-AMMINISTRATORE.bat
echo.

echo Premi un tasto per chiudere...
pause >NUL
