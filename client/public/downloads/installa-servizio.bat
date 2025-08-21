@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo 🚀 INSTALLAZIONE CRUSCOTTO LOCAL OPENER COME SERVIZIO WINDOWS
echo ====================================================================
echo.

if not exist nssm.exe (
    echo ❌ ERRORE: nssm.exe non trovato!
    echo 💡 Scarica NSSM da https://nssm.cc/download
    pause
    exit /b 1
)

set SERVICE_NAME=CruscottoLocalOpener

echo 🛑 Arresto servizio esistente (se presente)...
nssm.exe stop !SERVICE_NAME! >nul 2>&1
nssm.exe remove !SERVICE_NAME! confirm >nul 2>&1

echo 🔧 Installazione servizio con configurazione avanzata...
nssm.exe install !SERVICE_NAME! "%~dp0local-opener.exe"
nssm.exe set !SERVICE_NAME! AppDirectory "%~dp0"
nssm.exe set !SERVICE_NAME! DisplayName "Cruscotto Local Opener Service"
nssm.exe set !SERVICE_NAME! Description "Servizio per aprire documenti locali da Pannello SGI - Avvio automatico all'accensione PC"

echo ⚙️  Configurazione avvio automatico...
nssm.exe set !SERVICE_NAME! Start SERVICE_AUTO_START
nssm.exe set !SERVICE_NAME! Type SERVICE_WIN32_OWN_PROCESS
nssm.exe set !SERVICE_NAME! DelayedAutoStart 1

echo 🔄 Configurazione resilienza e restart automatico...
nssm.exe set !SERVICE_NAME! AppExit Default Restart
nssm.exe set !SERVICE_NAME! AppRestartDelay 10000
nssm.exe set !SERVICE_NAME! AppThrottle 5000
nssm.exe set !SERVICE_NAME! AppStopMethodConsole 15000

echo 🔐 Configurazione sicurezza...
nssm.exe set !SERVICE_NAME! ObjectName LocalSystem

echo 📝 Configurazione logging...
md "%APPDATA%\.local-opener" >nul 2>&1
nssm.exe set !SERVICE_NAME! AppStdout "%APPDATA%\.local-opener\service.log"
nssm.exe set !SERVICE_NAME! AppStderr "%APPDATA%\.local-opener\service-error.log"
nssm.exe set !SERVICE_NAME! AppRotateFiles 1
nssm.exe set !SERVICE_NAME! AppRotateSeconds 86400

echo 🌐 Configurazione firewall Windows...
netsh advfirewall firewall delete rule name="Local Opener" >nul 2>&1
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1

echo 🚀 Avvio servizio...
nssm.exe start !SERVICE_NAME!

echo.
echo ⏳ Attendo 5 secondi per verifica avvio...
timeout /t 5 >nul

echo 🔍 Verifica stato servizio...
sc query !SERVICE_NAME! | findstr /i "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ SUCCESSO! Servizio installato e avviato correttamente
    echo 🎉 Il Local Opener si avvierà automaticamente ad ogni accensione del PC
) else (
    echo ⚠️  Servizio installato ma potrebbe non essere avviato
    echo 💡 Riavvia il PC o esegui: sc start !SERVICE_NAME!
)

echo.
echo 📊 STATO INSTALLAZIONE:
echo ================================
echo 🌐 URL servizio: http://127.0.0.1:17654
echo 📁 Log servizio: %APPDATA%\.local-opener\service.log
echo 🔧 Manager servizi: services.msc
echo 📋 Diagnostica: diagnostica-servizio.bat
echo.
pause
