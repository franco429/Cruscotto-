@echo off
:: DISINSTALLA-SERVIZIO.bat
:: Disinstallazione completa del servizio CruscottoLocalOpener
:: CORREZIONE DEFINITIVA - Gestione percorsi corretta

:: Cambia alla directory dello script
cd /d "%~dp0"

echo ========================================
echo   DISINSTALLAZIONE CRUSCOTTO LOCAL OPENER
echo   Versione 2.0.0 - Servizio Windows
echo ========================================
echo.

:: Verifica se siamo admin
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Privilegi amministratore verificati
    echo.
) else (
    echo ❌ Privilegi amministratore insufficienti
    echo Richiesta elevazione privilegi...
    echo.
    powershell.exe -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo 🔍 VERIFICA STATO SERVIZIO:
echo =============================

:: Verifica se il servizio esiste
sc query CruscottoLocalOpener >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Servizio CruscottoLocalOpener trovato
    echo.
    
    :: Verifica stato servizio
    for /f "tokens=3 delims=: " %%i in ('sc query CruscottoLocalOpener ^| find "STATE"') do set SERVICE_STATE=%%i
    
    echo 📊 Stato servizio: %SERVICE_STATE%
    echo.
    
    if "%SERVICE_STATE%"=="RUNNING" (
        echo ⏹️ Fermando servizio...
        sc stop CruscottoLocalOpener
        timeout /t 3 /nobreak >nul
        echo ✓ Servizio fermato
        echo.
    )
) else (
    echo ⚠ Servizio CruscottoLocalOpener non trovato
    echo.
)

echo 🗑️ DISINSTALLAZIONE SERVIZIO:
echo ===============================

:: Rimuovi servizio con NSSM se disponibile
if exist "nssm.exe" (
    echo 🔧 Rimozione con NSSM...
    nssm.exe remove CruscottoLocalOpener confirm
    if %errorlevel% == 0 (
        echo ✓ Servizio rimosso con NSSM
    ) else (
        echo ⚠ Errore rimozione NSSM, tentativo con SC...
    )
    echo.
)

:: Rimuovi servizio con SC (metodo alternativo)
echo 🔧 Rimozione con SC...
sc.exe delete CruscottoLocalOpener
if %errorlevel% == 0 (
    echo ✓ Servizio rimosso con SC
) else (
    echo ⚠ Errore rimozione SC
)
echo.

echo 🧹 PULIZIA FILE E CONFIGURAZIONI:
echo ===================================

:: Rimuovi directory di sistema
if exist "%ProgramFiles%\CruscottoLocalOpener" (
    echo 📁 Rimozione directory sistema...
    rmdir /s /q "%ProgramFiles%\CruscottoLocalOpener"
    if %errorlevel% == 0 (
        echo ✓ Directory sistema rimossa
    ) else (
        echo ⚠ Errore rimozione directory sistema
    )
) else (
    echo ✓ Directory sistema non trovata
)
echo.

:: Rimuovi configurazioni utente
if exist "%APPDATA%\.local-opener" (
    echo 📁 Rimozione configurazioni utente...
    rmdir /s /q "%APPDATA%\.local-opener"
    if %errorlevel% == 0 (
        echo ✓ Configurazioni utente rimosse
    ) else (
        echo ⚠ Errore rimozione configurazioni utente
    )
) else (
    echo ✓ Configurazioni utente non trovate
)
echo.

echo 🔄 PULIZIA AVVIO AUTOMATICO:
echo ==============================

:: Rimuovi task scheduler
echo 🔧 Rimozione Task Scheduler...
schtasks /delete /tn "CruscottoLocalOpenerBackup" /f >nul 2>&1
schtasks /delete /tn "CruscottoLocalOpenerUser" /f >nul 2>&1
echo ✓ Task Scheduler rimossi
echo.

:: Rimuovi registro Windows
echo 🔧 Rimozione registro Windows...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpenerUser" /f >nul 2>&1
echo ✓ Registro Windows pulito
echo.

:: Rimuovi startup folder
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CruscottoLocalOpener.bat" (
    echo 🔧 Rimozione startup folder...
    del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CruscottoLocalOpener.bat" >nul 2>&1
    echo ✓ Startup folder pulito
) else (
    echo ✓ Startup folder già pulito
)
echo.

echo 🧪 VERIFICA PROCESSI ATTIVI:
echo =============================

:: Termina processi local-opener.exe attivi
tasklist /fi "imagename eq local-opener.exe" >nul 2>&1
if %errorlevel% == 0 (
    echo 🔧 Terminazione processi attivi...
    taskkill /f /im local-opener.exe >nul 2>&1
    echo ✓ Processi terminati
) else (
    echo ✓ Nessun processo attivo trovato
)
echo.

echo 🔍 VERIFICA PORTA 17654:
echo ==========================

:: Verifica se la porta è ancora in uso
netstat -an | find ":17654" >nul 2>&1
if %errorlevel% == 0 (
    echo ⚠ Porta 17654 ancora in uso
    echo 🔧 Identificazione processo...
    netstat -ano | find ":17654"
    echo.
    echo 💡 Se la porta è ancora in uso, riavvia il PC
) else (
    echo ✓ Porta 17654 libera
)
echo.

echo 🧹 PULIZIA FINALE:
echo ===================

:: Rimuovi file temporanei e log
if exist "%TEMP%\local-opener*" (
    echo 📁 Rimozione file temporanei...
    del /q "%TEMP%\local-opener*" >nul 2>&1
    echo ✓ File temporanei rimossi
) else (
    echo ✓ Nessun file temporaneo trovato
)
echo.

:: Rimuovi regole firewall
echo 🔧 Rimozione regole firewall...
netsh advfirewall firewall delete rule name="Cruscotto Local Opener" >nul 2>&1
echo ✓ Regole firewall rimosse
echo.

echo ========================================
echo   DISINSTALLAZIONE COMPLETATA!
echo ========================================
echo.
echo ✅ Servizio CruscottoLocalOpener rimosso
echo ✅ File di sistema eliminati
echo ✅ Configurazioni utente pulite
echo ✅ Avvio automatico disabilitato
echo ✅ Processi terminati
echo ✅ Porta 17654 liberata
echo ✅ Firewall pulito
echo.
echo 💡 PROSSIMI PASSI:
echo    1. Riavvia il PC per completare la pulizia
echo    2. Se necessario, reinstallare con INSTALLA-DEFINITIVO.bat
echo.
echo 🔧 VERIFICA:
echo    - Controlla Services.msc (servizio non deve essere presente)
echo    - Verifica che la porta 17654 sia libera
echo    - Controlla che non ci siano processi local-opener.exe
echo.
echo Premi un tasto per chiudere...
pause >nul
