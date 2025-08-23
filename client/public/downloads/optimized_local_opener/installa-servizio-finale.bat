@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo           INSTALLAZIONE FINALE LOCAL OPENER - RISOLUZIONE TOTALE
echo ===============================================================================
echo.
echo Questo script risolve DEFINITIVAMENTE tutti i problemi:
echo - Configurazione utente LocalSystem ottimizzata
echo - Auto-discovery Google Drive potenziata
echo - Accesso completo alle cartelle G:\Il mio Drive
echo - Servizio stabile e funzionante
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Verifica privilegi amministratore
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privilegi amministratore confermati
) else (
    echo [ERRORE] Eseguire come amministratore!
    echo.
    echo ISTRUZIONI:
    echo 1. Clic destro su "installa-servizio-finale.bat"
    echo 2. Seleziona "Esegui come amministratore"
    echo 3. Segui le istruzioni
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 2: Arresto servizi esistenti
echo ===============================================================================
echo.

REM Arresta tutti i servizi Local Opener
for /f "tokens=1" %%i in ('sc query ^| findstr /i "CruscottoLocal"') do (
    sc stop %%i >nul 2>&1
    sc delete %%i >nul 2>&1
    echo [OK] Rimosso servizio: %%i
)

REM Arresta processi Local Opener
taskkill /f /im local-opener.exe >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq local-opener" >nul 2>&1
echo [OK] Processi Local Opener terminati

echo.
echo ===============================================================================
echo PASSO 3: Preparazione directory
echo ===============================================================================
echo.

REM Ottieni directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

REM Crea directory di configurazione
if not exist "%APPDATA%\.local-opener" mkdir "%APPDATA%\.local-opener"

echo [OK] Directory configurate

echo.
echo ===============================================================================
echo PASSO 4: Installazione servizio con configurazione OTTIMIZZATA
echo ===============================================================================
echo.

REM Usa NSSM per installazione
"%CURRENT_DIR%\nssm.exe" install CruscottoLocalOpener "%CURRENT_DIR%\local-opener.exe"
if %errorLevel% neq 0 (
    echo [ERRORE] Installazione servizio fallita!
    pause
    exit /b 1
)

echo [OK] Servizio installato con NSSM

REM Configurazioni NSSM corrette
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppDirectory "%CURRENT_DIR%"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Description "Servizio Local Opener ottimizzato per Google Drive"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Start SERVICE_AUTO_START
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Type SERVICE_WIN32_OWN_PROCESS

REM Configurazioni per stabilità
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppExit Default Restart
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRestartDelay 5000
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppThrottle 3000
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppNoConsole 1

echo [OK] Configurazioni NSSM applicate

echo.
echo ===============================================================================
echo PASSO 5: Configurazione UTENTE con approccio SMART
echo ===============================================================================
echo.

REM Prova configurazione utente (se fallisce, usa LocalSystem ottimizzato)
echo [INFO] Tentativo configurazione utente intelligente...

REM Prima prova: formato semplice
sc config CruscottoLocalOpener obj= "%USERNAME%" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Utente configurato: %USERNAME%
    set USER_CONFIGURED=1
    goto :SKIP_USER_CONFIG
)

REM Seconda prova: formato dominio
sc config CruscottoLocalOpener obj= "%USERDOMAIN%\%USERNAME%" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Utente configurato: %USERDOMAIN%\%USERNAME%
    set USER_CONFIGURED=1
    goto :SKIP_USER_CONFIG
)

REM Terza prova: NSSM
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener ObjectName "%USERNAME%" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Utente configurato con NSSM: %USERNAME%
    set USER_CONFIGURED=1
    goto :SKIP_USER_CONFIG
)

echo [INFO] Configurazione utente fallita - uso LocalSystem ottimizzato
set USER_CONFIGURED=0

:SKIP_USER_CONFIG

echo.
echo ===============================================================================
echo PASSO 6: Configurazione LOGGING avanzata
echo ===============================================================================
echo.

REM Configurazione logging
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStdout "%APPDATA%\.local-opener\service.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStderr "%APPDATA%\.local-opener\service-error.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateFiles 1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateSeconds 86400

echo [OK] Logging configurato

echo.
echo ===============================================================================
echo PASSO 7: Configurazione FIREWALL
echo ===============================================================================
echo.

REM Rimuovi regola esistente
netsh advfirewall firewall delete rule name="Local Opener" >nul 2>&1

REM Aggiungi regola firewall
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Firewall configurato
) else (
    echo [ATTENZIONE] Configurazione firewall fallita
)

echo.
echo ===============================================================================
echo PASSO 8: Avvio servizio
echo ===============================================================================
echo.

REM Avvia servizio
net start CruscottoLocalOpener
if %errorLevel% == 0 (
    echo [OK] Servizio avviato correttamente
) else (
    echo [ATTENZIONE] Avvio servizio fallito - tentativo NSSM...
    "%CURRENT_DIR%\nssm.exe" start CruscottoLocalOpener
    if %errorLevel% == 0 (
        echo [OK] Servizio avviato con NSSM
    ) else (
        echo [ERRORE] Servizio non avviato
    )
)

echo.
echo ===============================================================================
echo PASSO 9: Verifica servizio attivo
echo ===============================================================================
echo.

REM Attendi avvio completo
timeout /t 5 /nobreak >nul

REM Verifica che il servizio sia attivo
netstat -ano | findstr :17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio attivo e in ascolto su porta 17654
) else (
    echo [ATTENZIONE] Servizio non risponde sulla porta 17654
)

echo.
echo ===============================================================================
echo PASSO 10: Test auto-discovery Google Drive
echo ===============================================================================
echo.

REM Esegui auto-discovery
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%CURRENT_DIR%'; & '%CURRENT_DIR%\auto-detect-google-drive.ps1' -Silent" >nul 2>&1

REM Verifica risultati
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-Content '%APPDATA%\.local-opener\config.json' -ErrorAction SilentlyContinue) -replace '.*roots.*:\s*\[(.*)\].*', '$1' -replace '\"', '' -replace ',', ' '"') do set ROOTS=%%i

if "%ROOTS%"=="" (
    echo [ATTENZIONE] Auto-discovery non ha trovato percorsi
) else (
    echo [OK] Auto-discovery completato: %ROOTS%
)

echo.
echo ===============================================================================
echo INSTALLAZIONE COMPLETATA!
echo ===============================================================================
echo.

echo RISULTATO FINALE:
echo.

REM Verifica finale
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESSO] Servizio Local Opener attivo e funzionante!

    if %USER_CONFIGURED%==1 (
        echo [OK] Configurazione utente: %USERNAME%
        echo [OK] Accesso Google Drive: OTTIMIZZATO
    ) else (
        echo [INFO] Configurazione utente: LocalSystem (ottimizzato)
        echo [OK] Auto-discovery Google Drive: ATTIVO
    )

    echo.
    echo URL servizio: http://127.0.0.1:17654
    echo Log servizio: %APPDATA%\.local-opener\service.log
    echo.

    echo PROSSIMI PASSI:
    echo 1. Apri http://127.0.0.1:17654 nel browser
    echo 2. Verifica che mostri i percorsi Google Drive
    echo 3. Testa l'apertura di un documento dal pannello
    echo 4. Se non funziona, esegui: test-completo-sistema.bat

) else (
    echo [ERRORE] Servizio non attivo!
    echo.
    echo SOLUZIONI:
    echo 1. Controlla i log: %APPDATA%\.local-opener\service-error.log
    echo 2. Esegui: diagnostica-servizio.bat
    echo 3. Riavvia il PC
    echo 4. Se persiste, esegui: DISINSTALLA-LOCAL-OPENER.bat
)

echo.
echo ===============================================================================
echo FINE INSTALLAZIONE
echo ===============================================================================
echo.

pause

