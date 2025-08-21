@echo off
chcp 65001 >nul

echo.
echo 🔧 CRUSCOTTO LOCAL OPENER - RIPARAZIONE AUTOMATICA SERVIZIO
echo =============================================================
echo.
echo ⚠️  IMPORTANTE: Questo script richiede privilegi di Amministratore
echo    Se richiesto, clicca "Sì" nella finestra UAC per continuare.
echo.
pause

REM Controllo privilegi amministratore
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ ERRORE: Privilegi di amministratore richiesti!
    echo 💡 Clicca destro su questo file e seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Privilegi amministratore confermati
echo.

set SERVICE_NAME=CruscottoLocalOpener
set LOG_DIR=%APPDATA%\.local-opener

echo 🛑 FASE 1: Arresto e pulizia servizio esistente
echo ===============================================
echo.

echo Arresto servizio in corso...
sc stop %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Servizio arrestato
) else (
    echo ⚠️  Servizio già arrestato o non trovato
)

echo.
echo Attesa 5 secondi per completamento arresto...
timeout 5 >nul

echo.
echo Rimozione servizio dal sistema...
sc delete %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Servizio rimosso dal sistema
) else (
    echo ⚠️  Servizio non presente nel sistema
)

echo.
echo 🔍 FASE 2: Verifica e pulizia file
echo ===================================
echo.

echo Controllo directory Local Opener...
if exist "%~dp0local-opener.exe" (
    echo ✅ Eseguibile Local Opener trovato
) else (
    echo ❌ ERRORE: local-opener.exe non trovato!
    echo 💡 Assicurati di eseguire questo script dalla cartella del Local Opener
    pause
    exit /b 1
)

if exist "%~dp0nssm.exe" (
    echo ✅ NSSM trovato
) else (
    echo ❌ ERRORE: nssm.exe non trovato!
    echo 💡 File mancante per gestione servizio Windows
    pause
    exit /b 1
)

echo.
echo Pulizia log precedenti...
if exist "%LOG_DIR%" (
    del "%LOG_DIR%\service.log" >nul 2>&1
    del "%LOG_DIR%\service-error.log" >nul 2>&1
    echo ✅ Log precedenti puliti
) else (
    echo ℹ️  Directory log non esistente, verrà creata
)

echo.
echo 🚀 FASE 3: Reinstallazione servizio
echo ====================================
echo.

echo Installazione servizio con configurazione ottimizzata...
"%~dp0nssm.exe" install %SERVICE_NAME% "%~dp0local-opener.exe"
if %ERRORLEVEL% neq 0 (
    echo ❌ ERRORE durante installazione servizio!
    pause
    exit /b 1
)
echo ✅ Servizio installato

echo.
echo Configurazione parametri servizio...
"%~dp0nssm.exe" set %SERVICE_NAME% AppDirectory "%~dp0"
"%~dp0nssm.exe" set %SERVICE_NAME% DisplayName "Cruscotto Local Opener Service"
"%~dp0nssm.exe" set %SERVICE_NAME% Description "Servizio per aprire documenti locali da Pannello SGI - Riparato automaticamente"

echo.
echo Configurazione avvio automatico...
"%~dp0nssm.exe" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%~dp0nssm.exe" set %SERVICE_NAME% Type SERVICE_WIN32_OWN_PROCESS

echo.
echo Configurazione resilienza...
"%~dp0nssm.exe" set %SERVICE_NAME% AppExit Default Restart
"%~dp0nssm.exe" set %SERVICE_NAME% AppRestartDelay 5000
"%~dp0nssm.exe" set %SERVICE_NAME% AppThrottle 3000
"%~dp0nssm.exe" set %SERVICE_NAME% AppStopMethodSkip 0
"%~dp0nssm.exe" set %SERVICE_NAME% AppStopMethodConsole 10000
"%~dp0nssm.exe" set %SERVICE_NAME% AppStopMethodWindow 5000
"%~dp0nssm.exe" set %SERVICE_NAME% AppStopMethodThreads 3000

echo.
echo Configurazione stabilità...
"%~dp0nssm.exe" set %SERVICE_NAME% AppNoConsole 1
"%~dp0nssm.exe" set %SERVICE_NAME% AppAffinity All
"%~dp0nssm.exe" set %SERVICE_NAME% AppPriority NORMAL_PRIORITY_CLASS

echo.
echo Configurazione sicurezza...
"%~dp0nssm.exe" set %SERVICE_NAME% ObjectName LocalSystem

echo.
echo Configurazione logging...
mkdir "%LOG_DIR%" >nul 2>&1
"%~dp0nssm.exe" set %SERVICE_NAME% AppStdout "%LOG_DIR%\service.log"
"%~dp0nssm.exe" set %SERVICE_NAME% AppStderr "%LOG_DIR%\service-error.log"
"%~dp0nssm.exe" set %SERVICE_NAME% AppRotateFiles 1
"%~dp0nssm.exe" set %SERVICE_NAME% AppRotateSeconds 86400

echo ✅ Configurazione servizio completata

echo.
echo 🛡️  FASE 4: Configurazione firewall
echo ====================================
echo.

echo Rimozione regole firewall precedenti...
netsh advfirewall firewall delete rule name="Local Opener" >nul 2>&1

echo.
echo Aggiunta nuova regola firewall...
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Regola firewall configurata
) else (
    echo ⚠️  Errore configurazione firewall - potrebbe essere necessario configurarlo manualmente
)

echo.
echo 🚀 FASE 5: Avvio servizio riparato
echo ===================================
echo.

echo Avvio servizio...
"%~dp0nssm.exe" start %SERVICE_NAME%
if %ERRORLEVEL% neq 0 (
    echo ❌ ERRORE durante avvio servizio!
    echo 💡 Controlla i log per dettagli: %LOG_DIR%\service-error.log
) else (
    echo ✅ Comando di avvio inviato
)

echo.
echo Attesa 15 secondi per stabilizzazione servizio...
timeout 15 >nul

echo.
echo 🔍 FASE 6: Verifica funzionamento
echo ==================================
echo.

echo Controllo stato servizio...
sc query %SERVICE_NAME% | findstr "STATE" | findstr "RUNNING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Servizio in stato RUNNING
    
    echo.
    echo Test connessione HTTP...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 10 -UseBasicParsing; Write-Host '✅ Test connessione riuscito! Stato:' $response.StatusCode -ForegroundColor Green; $healthData = $response.Content | ConvertFrom-Json; Write-Host 'Cartelle Google Drive configurate:' $healthData.roots.Count -ForegroundColor Green; $healthData.roots | ForEach-Object { Write-Host '   📁' $_ -ForegroundColor White } } catch { Write-Host '❌ Servizio avviato ma connessione HTTP non pronta' -ForegroundColor Yellow; Write-Host 'Errore:' $_.Exception.Message -ForegroundColor Yellow; Write-Host 'Attendi qualche minuto e verifica manualmente su http://127.0.0.1:17654' -ForegroundColor Cyan }"
    
) else (
    echo ❌ PROBLEMA: Servizio non in stato RUNNING!
    echo.
    echo Controllo stato dettagliato...
    sc query %SERVICE_NAME%
    
    echo.
    echo 🆘 TENTATIVI DI RISOLUZIONE AGGIUNTIVI:
    echo.
    echo 1. Tentativo riavvio forzato...
    "%~dp0nssm.exe" stop %SERVICE_NAME%
    timeout 5 >nul
    "%~dp0nssm.exe" start %SERVICE_NAME%
    timeout 10 >nul
    
    sc query %SERVICE_NAME% | findstr "STATE" | findstr "RUNNING" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo ✅ Riavvio forzato riuscito!
    ) else (
        echo ❌ Riavvio forzato fallito
        echo.
        echo 💡 SOLUZIONI ALTERNATIVE:
        echo    1. Riavvia completamente il PC
        echo    2. Controlla antivirus e Windows Defender
        echo    3. Verifica che non ci siano altri Local Opener in esecuzione
        echo    4. Esegui diagnostica-servizio-avanzata.bat per dettagli
    )
)

echo.
echo 📋 RIASSUNTO RIPARAZIONE
echo ========================
echo.
echo ✅ Servizio rimosso e reinstallato
echo ✅ Configurazione ottimizzata applicata  
echo ✅ Firewall configurato
echo ✅ Log puliti e riconfigurati
echo.
echo 🌐 URL servizio: http://127.0.0.1:17654
echo 📁 Log servizio: %LOG_DIR%\service.log
echo 🔧 Per troubleshooting: diagnostica-servizio-avanzata.bat
echo.

echo ✅ RIPARAZIONE AUTOMATICA COMPLETATA!
echo.
echo 💡 PROSSIMI PASSI:
echo    1. Apri il Pannello SGI nel browser
echo    2. Vai in Impostazioni → Applicazione
echo    3. Verifica che lo stato del servizio sia "Attivo"
echo    4. Testa l'apertura di un documento
echo.
pause
