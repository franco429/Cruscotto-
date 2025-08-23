@echo off
REM Script BATCH per installazione OTTIMIZZATA Local Opener Service
REM Versione migliorata con gestione errori avanzata
REM Garantisce installazione come utente corrente per accesso Google Drive

echo INSTALLAZIONE OTTIMIZZATA CRUSCOTTO LOCAL OPENER
echo ===================================================
echo.

echo Questo script installera' il servizio Local Opener con:
echo - Configurazione utente corrente (NON LocalSystem)
echo - Avvio automatico al riavvio del PC
echo - Auto-discovery avanzato Google Drive
echo - Accesso completo alle cartelle G:\Il mio Drive, ecc.
echo.

pause

echo.
echo PASSO 1: Verifica privilegi amministratore...
echo.

REM Verifica se siamo amministratori
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privilegi amministratore confermati
) else (
    echo [ERRORE] Eseguire come amministratore!
    echo.
    echo SOLUZIONE:
    echo 1. Clic destro su "installa-servizio-ottimizzato.bat"
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo.
echo PASSO 2: Arresto servizio esistente (se presente)...
echo.

REM Arresta servizio se attivo
net stop CruscottoLocalOpener >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio arrestato
) else (
    echo [INFO] Servizio non era attivo
)

REM Rimuovi servizio esistente
sc delete CruscottoLocalOpener >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Vecchio servizio rimosso
) else (
    echo [INFO] Nessun servizio precedente da rimuovere
)

echo.
echo PASSO 3: Installazione servizio con configurazione ottimizzata...
echo.

REM Ottieni il percorso corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

REM Verifica presenza file essenziali
if not exist "%CURRENT_DIR%\index.js" (
    echo [ERRORE] File index.js mancante!
    pause
    exit /b 1
)

if not exist "%CURRENT_DIR%\nssm.exe" (
    echo [ERRORE] File nssm.exe mancante!
    pause
    exit /b 1
)

REM Verifica se abbiamo il file binario compilato (preferito)
if exist "%CURRENT_DIR%\local-opener.exe" (
    echo [INFO] Usando versione binaria ottimizzata...
    set "SERVICE_EXE=%CURRENT_DIR%\local-opener.exe"
    set "SERVICE_ARGS="
) else (
    echo [INFO] Usando versione Node.js...
    set "SERVICE_EXE=node.exe"
    set "SERVICE_ARGS=%CURRENT_DIR%\index.js"
)

echo [INFO] Installazione servizio con NSSM...
"%CURRENT_DIR%\nssm.exe" install CruscottoLocalOpener "%SERVICE_EXE%" %SERVICE_ARGS%
if %errorLevel% neq 0 (
    echo [ERRORE] Installazione servizio fallita!
    pause
    exit /b 1
)

echo [OK] Servizio installato con NSSM

echo.
echo PASSO 4: Configurazione avanzata servizio...
echo.

REM Configurazione directory di lavoro
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppDirectory "%CURRENT_DIR%"

REM Configurazione nome e descrizione
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Description "Servizio per aprire documenti locali da Pannello SGI - Auto-discovery Google Drive ottimizzato"

REM Configurazione avvio automatico
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Start SERVICE_AUTO_START
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Type SERVICE_WIN32_OWN_PROCESS

REM Configurazione resilienza
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppExit Default Restart
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRestartDelay 10000
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppThrottle 5000

REM Configurazione stabilità
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppNoConsole 1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppAffinity All
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppPriority NORMAL_PRIORITY_CLASS

echo [OK] Configurazione base completata

echo.
echo PASSO 5: Configurazione CRITICA utente servizio...
echo.

REM Ottieni utente corrente
for /f "tokens=2 delims=\" %%i in ('whoami') do set "CURRENT_USER=%%i"

REM Prova configurazione utente con sc.exe
echo [INFO] Tentativo configurazione utente con sc.exe...
REM Prima provo con formato semplice (per account locali)
sc config CruscottoLocalOpener obj= "%USERNAME%" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Utente servizio configurato: %USERNAME%
    set USER_CONFIGURED=1
) else (
    echo [ATTENZIONE] Tentativo con formato dominio...
    sc config CruscottoLocalOpener obj= "%USERDOMAIN%\%USERNAME%" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Utente servizio configurato: %USERDOMAIN%\%USERNAME%
        set USER_CONFIGURED=1
    ) else (
        echo [ATTENZIONE] Tentativo con nssm.exe...
        "%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener ObjectName "%USERNAME%"
        if %errorLevel% == 0 (
            echo [OK] Utente servizio configurato con NSSM: %USERNAME%
            set USER_CONFIGURED=1
        ) else (
            echo [ERRORE] Configurazione utente fallita!
            echo [INFO] Il servizio rimarrà LocalSystem
            set USER_CONFIGURED=0
        )
    )
)

echo.
echo PASSO 6: Configurazione logging...
echo.

REM Crea directory log
if not exist "%APPDATA%\.local-opener" mkdir "%APPDATA%\.local-opener"

REM Configurazione logging
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStdout "%APPDATA%\.local-opener\service.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStderr "%APPDATA%\.local-opener\service-error.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateFiles 1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateSeconds 86400

echo [OK] Logging configurato

echo.
echo PASSO 7: Configurazione firewall...
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
echo PASSO 8: Avvio servizio...
echo.

REM Avvia servizio
net start CruscottoLocalOpener
if %errorLevel% == 0 (
    echo [OK] Servizio avviato correttamente
) else (
    echo [ATTENZIONE] Avvio servizio fallito
    echo [INFO] Tentativo avvio con NSSM...
    "%CURRENT_DIR%\nssm.exe" start CruscottoLocalOpener
    if %errorLevel% == 0 (
        echo [OK] Servizio avviato con NSSM
    ) else (
        echo [ERRORE] Avvio servizio fallito completamente
        echo [INFO] Controllare i log in %APPDATA%\.local-opener\
    )
)

echo.
echo ===================================================
echo INSTALLAZIONE COMPLETATA!
echo ===================================================
echo.

REM Verifica stato servizio
sc query CruscottoLocalOpener | find "STATE" >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESSO] Servizio Local Opener installato e attivo!
    echo.
    echo URL servizio: http://127.0.0.1:17654
    echo Log servizio: %APPDATA%\.local-opener\service.log
    echo.
    if %USER_CONFIGURED% == 1 (
        echo [OK] Configurazione utente: .\%CURRENT_USER%
        echo [OK] Google Drive dovrebbe essere accessibile
    ) else (
        echo [ATTENZIONE] Configurazione utente fallita
        echo [INFO] Eseguire fix-service-user-final.ps1 per correggere
    )
) else (
    echo [ERRORE] Servizio non attivo!
    echo [INFO] Verificare i log e riavviare il PC
)

echo.
echo Per verificare il funzionamento:
echo 1. Apri http://127.0.0.1:17654 nel browser
echo 2. Controlla i log in %APPDATA%\.local-opener\
echo 3. Testa l'apertura di un documento dal pannello
echo.
echo Se ci sono problemi:
echo - Esegui diagnostica-servizio.bat
echo - Esegui fix-service-user-final.ps1
echo - Riavvia il PC
echo.

pause
