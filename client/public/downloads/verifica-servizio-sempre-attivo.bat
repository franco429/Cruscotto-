@echo off
echo.
echo VERIFICA SERVIZIO LOCAL OPENER SEMPRE ATTIVO
echo ===========================================
echo.

echo Controllo stato servizio Windows...
sc query "CruscottoLocalOpener" | findstr "STATE" | findstr "RUNNING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servizio Windows in esecuzione
) else (
    echo [PROBLEMA] Servizio Windows NON in esecuzione
    echo.
    echo AZIONE: Avvio automatico servizio...
    net start "CruscottoLocalOpener"
    timeout /t 3 /nobreak >nul
)

echo.
echo Controllo connessione HTTP...
curl -s --connect-timeout 3 http://127.0.0.1:17654/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servizio HTTP risponde
) else (
    echo [PROBLEMA] Servizio HTTP non risponde
    echo.
    echo AZIONE: Restart servizio...
    net stop "CruscottoLocalOpener" 2>nul
    timeout /t 2 /nobreak >nul
    net start "CruscottoLocalOpener"
    timeout /t 5 /nobreak >nul
)

echo.
echo Controllo configurazione avvio automatico...
sc qc "CruscottoLocalOpener" | findstr "AUTO_START" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Avvio automatico configurato
) else (
    echo [PROBLEMA] Avvio automatico NON configurato
    echo.
    echo AZIONE: Configurazione avvio automatico...
    sc config "CruscottoLocalOpener" start= auto
)

echo.
echo Controllo permessi servizio...
sc qc "CruscottoLocalOpener" | findstr "LocalSystem" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Permessi LocalSystem corretti
) else (
    echo [INFO] Permessi servizio: verifica manuale
)

echo.
echo Test finale connessione...
curl -s --connect-timeout 5 http://127.0.0.1:17654/health >temp_health.txt 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] SERVIZIO COMPLETAMENTE FUNZIONANTE
    echo Il Local Opener e configurato per rimanere sempre attivo
    del temp_health.txt >nul 2>&1
) else (
    echo [PROBLEMA] Servizio ancora non funzionante
    echo.
    echo SOLUZIONI:
    echo 1. Riavvia il PC
    echo 2. Reinstalla con INSTALLA-COME-AMMINISTRATORE.bat
    echo 3. Verifica che antivirus non blocchi local-opener.exe
)

echo.
echo VERIFICA COMPLETATA
echo ===================
echo.
echo Se tutto e [OK], il servizio restera sempre attivo
echo anche dopo chiusura file e riavvio PC.
echo.
pause
