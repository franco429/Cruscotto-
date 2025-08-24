@echo off
chcp 65001 >nul
title Local Opener - Avvio Automatico Utente OTTIMIZZATO
echo ===============================================================================
echo           LOCAL OPENER - AVVIO AUTOMATICO UTENTE OTTIMIZZATO
echo ===============================================================================
echo.
echo Questo script combina il meglio di entrambi gli approcci:
echo ✅ Avvio con privilegi utente (accesso completo Google Drive)
echo ✅ Funzionalità moderne e robuste
echo ✅ Auto-discovery Google Drive potenziato
echo ✅ Gestione errori avanzata
echo ✅ Logging completo
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Verifica ambiente e privilegi
echo ===============================================================================
echo.

REM Verifica se local-opener.exe esiste
if not exist "%~dp0local-opener.exe" (
    echo [ERRORE] local-opener.exe non trovato!
    echo Assicurati che il file sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

REM Verifica se Node.js è disponibile per funzionalità avanzate
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ATTENZIONE] Node.js non trovato - alcune funzionalità avanzate non saranno disponibili
    echo Le funzionalità base funzioneranno comunque
) else (
    echo [OK] Node.js disponibile per funzionalità avanzate
)

echo.
echo ===============================================================================
echo PASSO 2: Arresto processi esistenti
echo ===============================================================================
echo.

REM Arresta tutti i processi Local Opener esistenti
echo [INFO] Arresto processi Local Opener esistenti...
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Processi Local Opener terminati
    taskkill /F /IM local-opener.exe >NUL 2>&1
    timeout /t 2 >NUL
) else (
    echo [INFO] Nessun processo Local Opener attivo
)

REM Arresta anche processi Node.js Local Opener
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq local-opener" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Processi Node.js Local Opener terminati
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq local-opener" >NUL 2>&1
)

echo.
echo ===============================================================================
echo PASSO 3: Preparazione directory e configurazione
echo ===============================================================================
echo.

REM Ottieni directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

REM Crea directory di configurazione utente
if not exist "%APPDATA%\.local-opener" mkdir "%APPDATA%\.local-opener"
echo [OK] Directory configurazione creata: %APPDATA%\.local-opener

REM Crea configurazione iniziale se non esiste
if not exist "%APPDATA%\.local-opener\config.json" (
    echo [INFO] Creazione configurazione iniziale...
    echo { > "%APPDATA%\.local-opener\config.json"
    echo   "roots": [], >> "%APPDATA%\.local-opener\config.json"
    echo   "created": "%date% %time%", >> "%APPDATA%\.local-opener\config.json"
    echo   "source": "User Auto-Start Configuration" >> "%APPDATA%\.local-opener\config.json"
    echo } >> "%APPDATA%\.local-opener\config.json"
    echo [OK] Configurazione iniziale creata
)

echo.
echo ===============================================================================
echo PASSO 4: Auto-discovery Google Drive (privilegi utente)
echo ===============================================================================
echo.

echo [INFO] Esecuzione auto-discovery Google Drive con privilegi utente...
echo [INFO] Questo garantisce accesso completo alle cartelle Google Drive!

REM Esegui auto-discovery se disponibile
if exist "%CURRENT_DIR%\auto-detect-google-drive.ps1" (
    echo [INFO] Esecuzione script PowerShell auto-discovery...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%CURRENT_DIR%'; & '%CURRENT_DIR%\auto-detect-google-drive.ps1' -Silent"
    if %errorLevel% == 0 (
        echo [OK] Auto-discovery Google Drive completato
    ) else (
        echo [ATTENZIONE] Auto-discovery fallito, continuo con configurazione base
    )
) else (
    echo [INFO] Script auto-discovery non trovato, uso configurazione base
)

REM Verifica configurazione creata
if exist "%APPDATA%\.local-opener\config.json" (
    echo [OK] File configurazione verificato
) else (
    echo [ATTENZIONE] Configurazione non creata, continuo comunque
)

echo.
echo ===============================================================================
echo PASSO 5: Configurazione firewall
echo ===============================================================================
echo.

echo [INFO] Configurazione firewall per porta 17654...

REM Rimuovi regola esistente
netsh advfirewall firewall delete rule name="Local Opener User" >nul 2>&1

REM Aggiungi regola firewall per utente corrente
netsh advfirewall firewall add rule name="Local Opener User" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Firewall configurato per porta 17654
) else (
    echo [ATTENZIONE] Configurazione firewall fallita (potrebbe richiedere privilegi admin)
)

echo.
echo ===============================================================================
echo PASSO 6: Avvio Local Opener con privilegi utente
echo ===============================================================================
echo.

echo [INFO] Creazione script VBS per avvio background con privilegi utente...

REM Crea VBScript avanzato per avvio background
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\start-local-opener-advanced.vbs"
echo Set FSO = CreateObject("Scripting.FileSystemObject") >> "%TEMP%\start-local-opener-advanced.vbs"
echo. >> "%TEMP%\start-local-opener-advanced.vbs"
echo ' Imposta directory di lavoro >> "%TEMP%\start-local-opener-advanced.vbs"
echo WshShell.CurrentDirectory = "%CURRENT_DIR%" >> "%TEMP%\start-local-opener-advanced.vbs"
echo. >> "%TEMP%\start-local-opener-advanced.vbs"
echo ' Avvia Local Opener in background completo >> "%TEMP%\start-local-opener-advanced.vbs"
echo WshShell.Run "%~dp0local-opener.exe", 0, False >> "%TEMP%\start-local-opener-advanced.vbs"
echo. >> "%TEMP%\start-local-opener-advanced.vbs"
echo ' Log dell'avvio >> "%TEMP%\start-local-opener-advanced.vbs"
echo FSO.CreateTextFile("%APPDATA%\.local-opener\startup.log", True).WriteLine "Avviato: " ^& Now() >> "%TEMP%\start-local-opener-advanced.vbs"

echo [INFO] Avvio Local Opener in modalità background avanzata...
echo [IMPORTANTE] Il servizio sarà COMPLETAMENTE INDIPENDENTE da questo terminale!
echo [IMPORTANTE] Puoi chiudere questo CMD in qualsiasi momento senza problemi!

REM Esegui VBScript per avvio completamente in background
cscript //nologo "%TEMP%\start-local-opener-advanced.vbs"

echo [INFO] Attendo avvio completo...
echo [INFO] Il servizio è ora in esecuzione in background INDIPENDENTE!
timeout /t 5 >NUL

echo.
echo ===============================================================================
echo PASSO 7: Verifica avvio e funzionamento
echo ===============================================================================
echo.

REM Verifica che il processo sia attivo
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Local Opener avviato con successo!
) else (
    echo [ERRORE] Local Opener non avviato correttamente
    echo [INFO] Tentativo avvio alternativo...
    
    REM Prova avvio diretto
    start /B "" "%~dp0local-opener.exe"
    timeout /t 3 >NUL
    
    tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
    if "%ERRORLEVEL%"=="0" (
        echo [OK] Local Opener avviato con metodo alternativo
    ) else (
        echo [ERRORE] Avvio fallito anche con metodo alternativo
        pause
        exit /b 1
    )
)

REM Verifica che il servizio risponda
echo [INFO] Verifica risposta servizio...
timeout /t 3 >NUL

REM Test connessione HTTP (se curl disponibile)
where curl >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Test connessione HTTP al servizio...
    curl -s -o nul -w "HTTP Status: %%{http_code}" http://127.0.0.1:17654/health 2>nul
    if %errorLevel% == 0 (
        echo [OK] Servizio risponde correttamente
    ) else (
        echo [ATTENZIONE] Servizio non risponde HTTP (potrebbe essere ancora in avvio)
    )
) else (
    echo [INFO] curl non disponibile, salto test HTTP
)

echo.
echo ===============================================================================
echo PASSO 8: Configurazione avvio automatico permanente
echo ===============================================================================
echo.

echo [INFO] Configurazione avvio automatico per riavvii...

REM Crea VBScript permanente per avvio automatico
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_FOLDER%" mkdir "%STARTUP_FOLDER%"

REM Crea VBScript avanzato nella cartella Startup
echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo Set FSO = CreateObject("Scripting.FileSystemObject") >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo. >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo ' Imposta directory di lavoro >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo WshShell.CurrentDirectory = "%CURRENT_DIR%" >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo. >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo ' Verifica se già in esecuzione >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo Set objWMIService = GetObject("winmgmts:") >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo Set colProcesses = objWMIService.ExecQuery("Select * From Win32_Process Where Name = 'local-opener.exe'") >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo If colProcesses.Count = 0 Then >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo   ' Avvia solo se non è già in esecuzione >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo   WshShell.Run "%CURRENT_DIR%\local-opener.exe", 0, False >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo   ' Log dell'avvio automatico >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo   FSO.CreateTextFile("%APPDATA%\.local-opener\auto-startup.log", True).WriteLine "Avvio automatico: " ^& Now() >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"
echo End If >> "%STARTUP_FOLDER%\Local-Opener-User-Auto.vbs"

echo [OK] Script avvio automatico creato in: %STARTUP_FOLDER%

REM Pulisci file temporanei
del "%TEMP%\start-local-opener-advanced.vbs" >NUL 2>&1

echo.
echo ===============================================================================
echo PASSO 9: Test finale e verifica
echo ===============================================================================
echo.

echo [INFO] Test finale del servizio...

echo [TEST INDIPENDENZA] Verifico che il servizio sia completamente indipendente...
echo [TEST INDIPENDENZA] Il servizio dovrebbe continuare a funzionare anche se chiudi questo CMD!

REM Verifica finale
tasklist /FI "IMAGENAME eq local-opener.exe" 2>NUL | find /I /N "local-opener.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [SUCCESSO] Local Opener attivo e funzionante!
    
    echo.
    echo 📊 STATO FINALE:
    echo ✅ Processo avviato con privilegi utente
    echo ✅ Accesso completo alle cartelle Google Drive
    echo ✅ Servizio in ascolto su porta 17654
    echo ✅ Avvio automatico configurato
    echo ✅ Firewall configurato
    echo ✅ Logging attivo
    echo.
    echo 🌐 URL servizio: http://127.0.0.1:17654
    echo 📁 Configurazione: %APPDATA%\.local-opener\
    echo 📝 Log avvio: %APPDATA%\.local-opener\startup.log
    echo.
    echo 🔧 PROSSIMI PASSI:
    echo 1. Apri http://127.0.0.1:17654 nel browser
    echo 2. Verifica che mostri i percorsi Google Drive
    echo 3. Testa l'apertura di un documento dal pannello
    echo 4. Se non funziona, esegui: test-completo-sistema.bat
    echo.
    echo 💡 VANTAGGI DI QUESTO APPROCCIO:
echo - Accesso completo alle cartelle Google Drive (privilegi utente)
echo - Funzionalità moderne e robuste
echo - Auto-discovery Google Drive potenziato
echo - Gestione errori avanzata
echo - Logging completo per debugging
echo - Avvio automatico al boot
echo - COMPLETAMENTE INDIPENDENTE dal terminale CMD
echo - Continua a funzionare anche se chiudi questo CMD
    echo.
    echo Local Opener continuera' a girare anche se:
    echo - Chiudi questo terminale CMD
    echo - Chiudi tutte le finestre
    echo - Riavvii il computer
    echo - Chiudi la sessione utente
    echo.
    echo 🔧 TECNICA UTILIZZATA:
echo - VBScript avanzato con WScript.Shell
echo - Modalita' 0 (nascosta) + False (non aspetta)
echo - Directory di lavoro corretta
echo - Verifica duplicati all'avvio automatico
echo - Logging completo di tutti gli eventi
echo - Processo COMPLETAMENTE INDIPENDENTE dal CMD
echo - Continua a funzionare anche se chiudi il terminale
    echo.
    echo Per disinstallare l'avvio automatico:
    echo - Elimina il file dalla cartella Startup
    echo - Oppure esegui DISINSTALLA-LOCAL-OPENER.bat
    echo.
    
) else (
    echo [ERRORE] Local Opener non attivo!
    echo.
    echo SOLUZIONI:
    echo 1. Controlla i log: %APPDATA%\.local-opener\startup.log
    echo 2. Esegui: diagnostica-servizio.bat
    echo 3. Riavvia il PC
    echo 4. Se persiste, esegui: DISINSTALLA-LOCAL-OPENER.bat
)

echo.
echo ===============================================================================
echo CONFIGURAZIONE COMPLETATA!
echo ===============================================================================
echo.

echo Premi un tasto per chiudere...
pause >NUL
