@echo off
:: VERIFICA-AVVIO-AUTOMATICO.bat
:: Script per verificare lo stato dell'avvio automatico
:: Diagnostica completa del sistema di avvio automatico

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - VERIFICA
echo   Stato Avvio Automatico
echo   Versione 2.1 - Diagnostica Completa
echo ========================================
echo.

:: Imposta titolo finestra
title "Cruscotto Local Opener - Verifica Avvio Automatico"

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Alcuni controlli richiedono privilegi amministratore
    echo Eseguendo con privilegi limitati...
    echo.
)

echo ========================================
echo   VERIFICA 1: STATO SERVIZIO WINDOWS
echo ========================================
sc query CruscottoLocalOpener >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Servizio CruscottoLocalOpener installato
    sc query CruscottoLocalOpener | find "START_TYPE"
    sc query CruscottoLocalOpener | find "STATE"
) else (
    echo ❌ Servizio CruscottoLocalOpener non installato
)
echo.

echo ========================================
echo   VERIFICA 2: TASK SCHEDULER
echo ========================================
echo Controllo task per avvio al boot...
schtasks /query /tn "CruscottoLocalOpenerBoot" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Task CruscottoLocalOpenerBoot trovato
    schtasks /query /tn "CruscottoLocalOpenerBoot" | find "Ready"
) else (
    echo ❌ Task CruscottoLocalOpenerBoot non trovato
)

echo Controllo task per avvio al login...
schtasks /query /tn "CruscottoLocalOpenerLogin" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Task CruscottoLocalOpenerLogin trovato
    schtasks /query /tn "CruscottoLocalOpenerLogin" | find "Ready"
) else (
    echo ❌ Task CruscottoLocalOpenerLogin non trovato
)
echo.

echo ========================================
echo   VERIFICA 3: REGISTRO WINDOWS
echo ========================================
echo Controllo registro di sistema (HKLM)...
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Voce registro HKLM trovata
    reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener"
) else (
    echo ❌ Voce registro HKLM non trovata
)

echo Controllo registro utente (HKCU)...
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Voce registro HKCU trovata
    reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "CruscottoLocalOpener"
) else (
    echo ❌ Voce registro HKCU non trovata
)
echo.

echo ========================================
echo   VERIFICA 4: STATO APPLICAZIONE
echo ========================================
echo Controllo se l'applicazione è in esecuzione...
tasklist /fi "imagename eq local-opener.exe" 2>nul | find "local-opener.exe" >nul
if %errorlevel% == 0 (
    echo ✓ Local Opener in esecuzione
    tasklist /fi "imagename eq local-opener.exe"
) else (
    echo ❌ Local Opener non in esecuzione
)

echo Controllo porta 17654...
netstat -an | find ":17654" >nul
if %errorlevel% == 0 (
    echo ✓ Porta 17654 in ascolto
    netstat -an | find ":17654"
) else (
    echo ❌ Porta 17654 non in ascolto
)
echo.

echo ========================================
echo   VERIFICA 5: FILE DI SISTEMA
echo ========================================
set "OPENER_PATH="
if exist "%ProgramFiles%\CruscottoLocalOpener\local-opener.exe" (
    set "OPENER_PATH=%ProgramFiles%\CruscottoLocalOpener\local-opener.exe"
    echo ✓ Local Opener trovato in Program Files
) else (
    echo ❌ Local Opener non trovato in Program Files
)

if exist "%ProgramFiles%\CruscottoLocalOpener\nssm.exe" (
    echo ✓ NSSM trovato in Program Files
) else (
    echo ❌ NSSM non trovato in Program Files
)

if exist "%APPDATA%\.local-opener" (
    echo ✓ Directory configurazione trovata
) else (
    echo ❌ Directory configurazione non trovata
)
echo.

echo ========================================
echo   VERIFICA 6: TEST CONNESSIONE
echo ========================================
echo Test connessione HTTP...
powershell.exe -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '✓ Endpoint /health risponde correttamente' -ForegroundColor Green } else { Write-Host '⚠ Endpoint /health risponde con errore' -ForegroundColor Yellow } } catch { Write-Host '❌ Endpoint /health non raggiungibile' -ForegroundColor Red }"
echo.

echo ========================================
echo   RIEPILOGO E RACCOMANDAZIONI
echo ========================================
echo.
echo Se sono presenti errori (❌), esegui:
echo 1. CONFIGURA-AVVIO-AUTOMATICO.bat (come amministratore)
echo 2. INSTALLA-DEFINITIVO.bat (come amministratore)
echo 3. Riavvia il computer
echo.
echo Per verificare dopo il riavvio:
echo 1. Apri Task Manager
echo 2. Controlla se local-opener.exe è in esecuzione
echo 3. Apri http://127.0.0.1:17654/health
echo.
echo Premi un tasto per chiudere...
pause >nul
