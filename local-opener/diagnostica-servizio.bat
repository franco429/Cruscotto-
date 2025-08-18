@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ====================================================================
echo 🔧 DIAGNOSTICA CRUSCOTTO LOCAL OPENER - SERVIZIO WINDOWS
echo ====================================================================
echo.

set SERVICE_NAME=CruscottoLocalOpener
set PORT=17654
set URL=http://127.0.0.1:%PORT%

echo 📋 VERIFICA STATO SERVIZIO...
echo ====================================================================

:: Controlla se il servizio è installato
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servizio installato: %SERVICE_NAME%
    
    :: Mostra dettagli servizio
    echo.
    echo 📊 DETTAGLI SERVIZIO:
    sc qc "%SERVICE_NAME%" | findstr /i "START_TYPE"
    sc query "%SERVICE_NAME%" | findstr /i "STATE"
    
    :: Verifica se è configurato per avvio automatico
    sc qc "%SERVICE_NAME%" | findstr /i "AUTO_START" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Configurato per avvio automatico
    ) else (
        echo ⚠️  NON configurato per avvio automatico
        echo 💡 Comando per risolvere: sc config "%SERVICE_NAME%" start= auto
    )
    
    :: Verifica se è in esecuzione
    sc query "%SERVICE_NAME%" | findstr /i "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Servizio in esecuzione
    ) else (
        echo ❌ Servizio NON in esecuzione
        echo 💡 Comando per avviare: sc start "%SERVICE_NAME%"
    )
    
) else (
    echo ❌ Servizio NON installato: %SERVICE_NAME%
    echo 💡 Esegui l'installer: cruscotto-local-opener-setup.exe
)

echo.
echo 🌐 VERIFICA CONNESSIONE...
echo ====================================================================

:: Verifica se la porta è in ascolto
netstat -an | findstr ":17654" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Porta %PORT% in ascolto
) else (
    echo ❌ Porta %PORT% NON in ascolto
)

:: Test connessione HTTP
echo 🔗 Test connessione %URL%...
powershell -Command "try { $response = Invoke-WebRequest -Uri '%URL%/health' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ Connessione HTTP riuscita'; Write-Host ('📊 Risposta: ' + $response.StatusCode + ' - ' + $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)) + '...') } catch { Write-Host '❌ Connessione HTTP fallita:' $_.Exception.Message }" 2>nul

echo.
echo 📁 VERIFICA CONFIGURAZIONE...
echo ====================================================================

set CONFIG_DIR=%APPDATA%\.local-opener
set CONFIG_FILE=%CONFIG_DIR%\config.json

if exist "%CONFIG_FILE%" (
    echo ✅ File configurazione trovato: %CONFIG_FILE%
    echo 📄 Contenuto configurazione:
    type "%CONFIG_FILE%" 2>nul
) else (
    echo ❌ File configurazione NON trovato: %CONFIG_FILE%
    echo 💡 Il servizio dovrebbe creare questo file al primo avvio
)

echo.
echo 📝 LOG SERVIZIO...
echo ====================================================================

set LOG_FILE=%CONFIG_DIR%\service.log
set ERROR_LOG=%CONFIG_DIR%\service-error.log

if exist "%LOG_FILE%" (
    echo ✅ Log servizio: %LOG_FILE%
    echo 📄 Ultime 10 righe:
    powershell -Command "Get-Content '%LOG_FILE%' | Select-Object -Last 10" 2>nul
) else (
    echo ⚠️  Log servizio non trovato: %LOG_FILE%
)

if exist "%ERROR_LOG%" (
    echo.
    echo ❌ Log errori: %ERROR_LOG%
    echo 📄 Ultime 5 righe:
    powershell -Command "Get-Content '%ERROR_LOG%' | Select-Object -Last 5" 2>nul
) else (
    echo ✅ Nessun log errori (buon segno!)
)

echo.
echo 🔧 COMANDI UTILI...
echo ====================================================================
echo 🔄 Riavvia servizio:      sc stop "%SERVICE_NAME%" ^&^& sc start "%SERVICE_NAME%"
echo 🚀 Avvia servizio:        sc start "%SERVICE_NAME%"
echo 🛑 Ferma servizio:        sc stop "%SERVICE_NAME%"
echo ⚙️  Configura auto-start:  sc config "%SERVICE_NAME%" start= auto
echo 🖥️  Manager servizi:      services.msc
echo 🌐 Test manuale:         start http://127.0.0.1:17654
echo 📁 Apri config:          explorer "%CONFIG_DIR%"

echo.
echo 🆘 RISOLUZIONE PROBLEMI...
echo ====================================================================
echo 1. Se il servizio non è installato: Esegui l'installer come amministratore
echo 2. Se il servizio non si avvia: Controlla Windows Event Viewer
echo 3. Se la porta è occupata: Riavvia il PC o termina altri processi
echo 4. Se la connessione fallisce: Controlla Windows Firewall
echo 5. Per reinstallare: Disinstalla dal Pannello di Controllo e reinstalla

echo.
echo ✅ Diagnostica completata! Premi un tasto per uscire...
pause >nul
