@echo off
chcp 65001 >nul
echo.
echo CRUSCOTTO LOCAL OPENER - VERIFICA DISINSTALLAZIONE
echo =====================================================
echo.
echo Questo script verifica se il servizio Local Opener
echo è stato disinstallato completamente dal sistema.
echo.
pause

echo.
echo Verifica in corso...
echo.

REM Verifica servizio Windows
echo 1. VERIFICA SERVIZIO WINDOWS:
sc query CruscottoLocalOpener >nul 2>&1
if %errorlevel% equ 0 (
    echo    ERRORE Il servizio è ancora presente nel sistema
    sc query CruscottoLocalOpener
) else (
    echo    OK Il servizio è stato rimosso correttamente
)

echo.

REM Verifica processi attivi
echo 2. VERIFICA PROCESSI ATTIVI:
tasklist /fi "imagename eq local-opener*" 2>nul | find /i "local-opener" >nul
if %errorlevel% equ 0 (
    echo    ATTENZIONE Processi Local Opener ancora in esecuzione:
    tasklist /fi "imagename eq local-opener*"
) else (
    echo    OK Nessun processo Local Opener in esecuzione
)

echo.

REM Verifica porta di rete
echo 3. VERIFICA PORTA DI RETE 17654:
netstat -an | find ":17654" >nul
if %errorlevel% equ 0 (
    echo    ATTENZIONE Porta 17654 ancora in uso:
    netstat -an | find ":17654"
) else (
    echo    OK Porta 17654 libera
)

echo.

REM Verifica regole firewall
echo 4. VERIFICA REGOLE FIREWALL:
netsh advfirewall firewall show rule name="Local Opener" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ATTENZIONE Regola firewall "Local Opener" ancora presente
) else (
    echo    OK Regola firewall "Local Opener" rimossa
)

echo.

REM Verifica file di configurazione
echo 5. VERIFICA FILE DI CONFIGURAZIONE:
if exist "%APPDATA%\.local-opener" (
    echo    INFO Directory configurazione ancora presente: %APPDATA%\.local-opener
    dir "%APPDATA%\.local-opener" /b 2>nul
) else (
    echo    OK Directory configurazione rimossa
)

echo.

REM Test connessione HTTP
echo 6. TEST CONNESSIONE HTTP:
powershell -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:17654' -TimeoutSec 5 -UseBasicParsing; Write-Host '   ATTENZIONE Servizio HTTP ancora attivo' } catch { Write-Host '   OK Servizio HTTP non raggiungibile' }"

echo.
echo ========================================
echo VERIFICA DISINSTALLAZIONE COMPLETATA
echo ========================================
echo.
echo Se tutti i controlli mostrano "OK", la disinstallazione
echo è stata completata con successo.
echo.
echo Se ci sono "ATTENZIONE" o "ERRORE", potrebbero essere
echo necessarie azioni manuali o un riavvio del PC.
echo.
pause
