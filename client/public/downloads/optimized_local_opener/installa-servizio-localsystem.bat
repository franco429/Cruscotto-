@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo        INSTALLAZIONE LOCAL OPENER - VERSIONE LOCALSYSTEM DEFINITIVA
echo ===============================================================================
echo.
echo Questo script installa il servizio Local Opener utilizzando LocalSystem
echo per evitare problemi di autenticazione (errore 1069)
echo.
echo VANTAGGI:
echo - Nessuna richiesta di password
echo - Accesso completo al sistema
echo - Compatibilità con Google Drive Desktop
echo - Installazione sempre funzionante
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
    echo 1. Clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 2: Pulizia servizi esistenti
echo ===============================================================================
echo.

REM Arresta e rimuove tutti i servizi Local Opener esistenti
echo [INFO] Rimozione servizi esistenti...
sc stop CruscottoLocalOpener >nul 2>&1
timeout /t 3 /nobreak >nul
sc delete CruscottoLocalOpener >nul 2>&1

REM Termina processi residui
taskkill /f /im local-opener.exe >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq local-opener" >nul 2>&1

echo [OK] Pulizia completata

echo.
echo ===============================================================================
echo PASSO 3: Preparazione directory e file
echo ===============================================================================
echo.

REM Directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

REM Crea directory configurazione utente
if not exist "%APPDATA%\.local-opener" mkdir "%APPDATA%\.local-opener"

REM Crea directory per LocalSystem
if not exist "C:\ProgramData\.local-opener" mkdir "C:\ProgramData\.local-opener"

echo [OK] Directory create

echo.
echo ===============================================================================
echo PASSO 4: Installazione servizio con NSSM
echo ===============================================================================
echo.

REM Installa servizio con NSSM
"%CURRENT_DIR%\nssm.exe" install CruscottoLocalOpener "%CURRENT_DIR%\local-opener.exe"
if %errorLevel% neq 0 (
    echo [ERRORE] Installazione servizio fallita!
    pause
    exit /b 1
)

echo [OK] Servizio base installato

echo.
echo ===============================================================================
echo PASSO 5: Configurazione servizio con LocalSystem
echo ===============================================================================
echo.

REM Configura servizio per usare LocalSystem
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener ObjectName LocalSystem >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Type SERVICE_WIN32_OWN_PROCESS >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Start SERVICE_AUTO_START >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Description "Servizio Local Opener per apertura documenti" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppDirectory "%CURRENT_DIR%" >nul 2>&1

REM Configurazioni stabilità
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppExit Default Restart >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRestartDelay 5000 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppThrottle 3000 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppNoConsole 1 >nul 2>&1

echo [OK] Servizio configurato con LocalSystem

echo.
echo ===============================================================================
echo PASSO 6: Configurazione privilegi e interazione desktop
echo ===============================================================================
echo.

REM Abilita interazione con il desktop per LocalSystem
sc config CruscottoLocalOpener type= interact type= own >nul 2>&1

REM Conferma configurazione LocalSystem
sc config CruscottoLocalOpener obj= LocalSystem >nul 2>&1

echo [OK] Privilegi configurati

echo.
echo ===============================================================================
echo PASSO 7: Configurazione logging
echo ===============================================================================
echo.

REM Configurazione logging per LocalSystem
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStdout "C:\ProgramData\.local-opener\service.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStderr "C:\ProgramData\.local-opener\service-error.log"
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateFiles 1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateSeconds 86400

echo [OK] Logging configurato

echo.
echo ===============================================================================
echo PASSO 8: Configurazione firewall
echo ===============================================================================
echo.

REM Rimuovi regola esistente
netsh advfirewall firewall delete rule name="Local Opener" >nul 2>&1

REM Aggiungi regola firewall
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1

echo [OK] Firewall configurato

echo.
echo ===============================================================================
echo PASSO 9: Auto-discovery Google Drive
echo ===============================================================================
echo.

REM Esegui auto-discovery per LocalSystem
echo [INFO] Ricerca percorsi Google Drive...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%CURRENT_DIR%\auto-detect-google-drive.ps1' -Silent" >nul 2>&1

REM Copia configurazione in entrambe le directory
if exist "%APPDATA%\.local-opener\config.json" (
    copy "%APPDATA%\.local-opener\config.json" "C:\ProgramData\.local-opener\config.json" >nul 2>&1
    echo [OK] Configurazione Google Drive creata
) else (
    echo [INFO] Configurazione Google Drive verrà creata al primo avvio
)

echo.
echo ===============================================================================
echo PASSO 10: Avvio servizio
echo ===============================================================================
echo.

REM Avvia servizio
net start CruscottoLocalOpener
if %errorLevel% == 0 (
    echo [OK] Servizio avviato correttamente!
) else (
    echo [ATTENZIONE] Tentativo avvio con NSSM...
    "%CURRENT_DIR%\nssm.exe" start CruscottoLocalOpener
)

echo.
echo ===============================================================================
echo PASSO 11: Verifica finale
echo ===============================================================================
echo.

REM Attendi avvio completo
timeout /t 5 /nobreak >nul

REM Verifica porta
netstat -ano | findstr :17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio in ascolto sulla porta 17654
) else (
    echo [ATTENZIONE] Porta non ancora attiva
)

REM Verifica stato servizio
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio Windows attivo
) else (
    echo [ERRORE] Servizio non attivo
)

echo.
echo ===============================================================================
echo INSTALLAZIONE COMPLETATA!
echo ===============================================================================
echo.

REM Mostra informazioni finali
echo RIEPILOGO:
echo ----------
echo Account servizio: LocalSystem (nessuna password richiesta)
echo URL servizio: http://127.0.0.1:17654
echo Log servizio: C:\ProgramData\.local-opener\service.log
echo Log errori: C:\ProgramData\.local-opener\service-error.log
echo.
echo PROSSIMI PASSI:
echo 1. Apri http://127.0.0.1:17654 nel browser
echo 2. Verifica che il servizio mostri i percorsi Google Drive
echo 3. Testa l'apertura di un documento dal pannello
echo.
echo Se il servizio non funziona:
echo - Controlla i log in C:\ProgramData\.local-opener\
echo - Esegui diagnostica-servizio.bat
echo - Riavvia il PC e riprova
echo.

pause
