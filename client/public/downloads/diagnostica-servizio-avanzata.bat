@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo 🔍 CRUSCOTTO LOCAL OPENER - DIAGNOSTICA AVANZATA SERVIZIO
echo ===========================================================
echo.

set SERVICE_NAME=CruscottoLocalOpener
set LOG_DIR=%APPDATA%\.local-opener

echo 📊 RACCOLTA INFORMAZIONI SISTEMA...
echo ====================================
echo.

echo 🖥️  Sistema Operativo:
ver

echo.
echo 🔧 Informazioni Node.js:
node --version 2>nul || echo ❌ Node.js non trovato nel PATH

echo.
echo 👤 Utente corrente: %USERNAME%
echo 🏠 Directory HOME: %USERPROFILE%
echo 📁 AppData: %APPDATA%

echo.
echo 🔍 VERIFICA STATO SERVIZIO
echo ===========================
echo.

echo Controllo esistenza servizio...
sc query %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Servizio trovato nel sistema
    echo.
    echo 📋 Dettagli servizio:
    sc query %SERVICE_NAME%
    echo.
    echo 📋 Configurazione servizio:
    sc qc %SERVICE_NAME%
) else (
    echo ❌ Servizio NON trovato nel sistema!
    echo.
    echo 💡 SOLUZIONE: Esegui INSTALLA-COME-AMMINISTRATORE.bat per installare il servizio
    goto :connection_test
)

echo.
echo 🔍 VERIFICA FILE E PERCORSI
echo ============================
echo.

echo Controllo directory log...
if exist "%LOG_DIR%" (
    echo ✅ Directory log trovata: %LOG_DIR%
    
    echo.
    echo 📄 File log presenti:
    dir "%LOG_DIR%" /B 2>nul || echo Nessun file log trovato
    
    echo.
    echo 📖 Ultimi messaggi dal log di servizio:
    if exist "%LOG_DIR%\service.log" (
        echo --- INIZIO LOG SERVIZIO ---
        type "%LOG_DIR%\service.log" | findstr /C:"[local-opener]" | tail -10 2>nul || (
            powershell -Command "Get-Content '%LOG_DIR%\service.log' | Select-Object -Last 10"
        )
        echo --- FINE LOG SERVIZIO ---
    ) else (
        echo ⚠️  Log servizio non trovato
    )
    
    echo.
    echo 📖 Ultimi errori dal log:
    if exist "%LOG_DIR%\service-error.log" (
        echo --- INIZIO LOG ERRORI ---
        type "%LOG_DIR%\service-error.log" | tail -10 2>nul || (
            powershell -Command "Get-Content '%LOG_DIR%\service-error.log' | Select-Object -Last 10"
        )
        echo --- FINE LOG ERRORI ---
    ) else (
        echo ✅ Nessun log di errore trovato
    )
) else (
    echo ❌ Directory log non trovata!
    echo 💡 Questo potrebbe indicare che il servizio non è mai stato avviato correttamente
)

echo.
echo 🌐 TEST CONNESSIONE SERVIZIO
echo =============================
:connection_test
echo.

echo Tentativo connessione a http://127.0.0.1:17654...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 10 -UseBasicParsing; Write-Host '✅ Servizio raggiungibile! Status:' $response.StatusCode; $healthData = $response.Content | ConvertFrom-Json; Write-Host 'Cartelle trovate:' $healthData.roots.Count; $healthData.roots | ForEach-Object { Write-Host '  -' $_ } } catch { Write-Host '❌ Servizio NON raggiungibile!' -ForegroundColor Red; Write-Host 'Errore:' $_.Exception.Message -ForegroundColor Yellow }"

echo.
echo 🚪 VERIFICA PORTE IN USO
echo =========================
echo.

echo Controllo porta 17654...
netstat -an | findstr ":17654" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Porta 17654 in uso:
    netstat -an | findstr ":17654"
) else (
    echo ❌ Porta 17654 NON in uso
    echo 💡 Il servizio Local Opener non sta ascoltando sulla porta corretta
)

echo.
echo 🛡️  VERIFICA FIREWALL
echo ======================
echo.

echo Controllo regole firewall Local Opener...
netsh advfirewall firewall show rule name="Local Opener" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Regola firewall trovata:
    netsh advfirewall firewall show rule name="Local Opener"
) else (
    echo ❌ Regola firewall NON trovata
    echo 💡 Potrebbe essere necessario configurare il firewall
)

echo.
echo 📁 VERIFICA PERCORSI GOOGLE DRIVE
echo ===================================
echo.

echo Ricerca automatica percorsi Google Drive...

REM Controllo percorsi comuni Google Drive
set FOUND_PATHS=0

for %%d in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\Il mio Drive" (
        echo ✅ Trovato: %%d:\Il mio Drive
        set /a FOUND_PATHS+=1
    )
    if exist "%%d:\My Drive" (
        echo ✅ Trovato: %%d:\My Drive  
        set /a FOUND_PATHS+=1
    )
    if exist "%%d:\Google Drive" (
        echo ✅ Trovato: %%d:\Google Drive
        set /a FOUND_PATHS+=1
    )
)

if exist "%USERPROFILE%\Google Drive" (
    echo ✅ Trovato: %USERPROFILE%\Google Drive
    set /a FOUND_PATHS+=1
)

if exist "%USERPROFILE%\GoogleDrive" (
    echo ✅ Trovato: %USERPROFILE%\GoogleDrive
    set /a FOUND_PATHS+=1
)

if !FOUND_PATHS! equ 0 (
    echo ⚠️  Nessun percorso Google Drive trovato automaticamente
    echo 💡 Potrebbe essere necessario configurare manualmente i percorsi
) else (
    echo.
    echo ✅ Trovati !FOUND_PATHS! percorsi Google Drive potenziali
)

echo.
echo 🔧 SUGGERIMENTI RISOLUZIONE PROBLEMI
echo =====================================
echo.

echo Se il servizio non è in stato "Running":
echo 1. ⚡ Riavvia il PC completamente
echo 2. 🔄 Esegui: sc start %SERVICE_NAME%
echo 3. 🛠️  Reinstalla eseguendo INSTALLA-COME-AMMINISTRATORE.bat
echo.

echo Se il servizio è "Running" ma non raggiungibile:
echo 1. 🔥 Controlla Windows Firewall
echo 2. 🛡️  Verifica antivirus/Windows Defender
echo 3. 🌐 Testa manualmente: http://127.0.0.1:17654
echo.

echo Se non trova le cartelle Google Drive:
echo 1. 📁 Configura manualmente dal frontend
echo 2. 🔍 Verifica che Google Drive sia installato e sincronizzato
echo 3. 🔧 Usa lo script auto-detect-google-drive.ps1
echo.

echo 🆘 COMANDI UTILI PER ADMIN
echo ===========================
echo.
echo Riavvio forzato servizio:
echo   sc stop %SERVICE_NAME% ^&^& timeout 3 ^&^& sc start %SERVICE_NAME%
echo.
echo Rimozione completa servizio:
echo   sc stop %SERVICE_NAME% ^&^& sc delete %SERVICE_NAME%
echo.
echo Visualizza log in tempo reale:
echo   powershell "Get-Content '%LOG_DIR%\service.log' -Wait -Tail 10"
echo.

echo ✅ DIAGNOSTICA COMPLETATA!
echo.
echo 📋 Se i problemi persistono, invia questo output al supporto tecnico.
echo.
pause
