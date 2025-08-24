@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo        INSTALLAZIONE SERVIZIO LOCAL OPENER IN BACKGROUND PERMANENTE
echo ===============================================================================
echo.
echo Questo script installa il servizio Local Opener come servizio Windows
echo reale che funziona SEMPRE in background, anche se chiudi il terminale.
echo.
echo IMPORTANTE: Esegui come AMMINISTRATORE!
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
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 2: Arresto e pulizia servizio esistente
echo ===============================================================================
echo.

REM Ferma servizio esistente
sc stop CruscottoLocalOpener >nul 2>&1
timeout /t 3 /nobreak >nul

REM Elimina servizio esistente
sc delete CruscottoLocalOpener >nul 2>&1

REM Termina processi residui
taskkill /f /im local-opener.exe >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq local-opener" >nul 2>&1

echo [OK] Pulizia completata

echo.
echo ===============================================================================
echo PASSO 3: Installazione servizio Windows permanente
echo ===============================================================================
echo.

REM Directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

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
echo PASSO 4: Configurazione per esecuzione in background
echo ===============================================================================
echo.

REM CONFIGURAZIONI CRITICHE PER BACKGROUND
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppDirectory "%CURRENT_DIR%" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener ObjectName LocalSystem >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Type SERVICE_WIN32_OWN_PROCESS >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Start SERVICE_AUTO_START >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener Description "Servizio Local Opener in background per apertura documenti" >nul 2>&1

REM IMPORTANTE: Disabilita console per esecuzione background
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppNoConsole 1 >nul 2>&1

REM Configurazioni stabilità
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppExit Default Restart >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRestartDelay 5000 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppThrottle 3000 >nul 2>&1

REM Priorità e affidabilità
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppPriority NORMAL_PRIORITY_CLASS >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStopMethodSkip 0 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStopMethodConsole 1500 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStopMethodWindow 1500 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStopMethodThreads 1500 >nul 2>&1

echo [OK] Configurazione background completata

echo.
echo ===============================================================================
echo PASSO 5: Configurazione logging silenzioso
echo ===============================================================================
echo.

REM Crea directory log
if not exist "C:\ProgramData\.local-opener" mkdir "C:\ProgramData\.local-opener"

REM Configurazione logging (senza console)
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStdout "C:\ProgramData\.local-opener\service.log" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppStderr "C:\ProgramData\.local-opener\service-error.log" >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateFiles 1 >nul 2>&1
"%CURRENT_DIR%\nssm.exe" set CruscottoLocalOpener AppRotateSeconds 86400 >nul 2>&1

echo [OK] Logging configurato

echo.
echo ===============================================================================
echo PASSO 6: Configurazione dipendenze servizio
echo ===============================================================================
echo.

REM Imposta dipendenze per avvio corretto
sc config CruscottoLocalOpener depend= LanmanServer/LanmanWorkstation >nul 2>&1

echo [OK] Dipendenze configurate

echo.
echo ===============================================================================
echo PASSO 7: Avvio servizio in background
echo ===============================================================================
echo.

REM Avvia servizio
net start CruscottoLocalOpener
if %errorLevel% == 0 (
    echo [OK] Servizio avviato in background!
) else (
    echo [ATTENZIONE] Tentativo avvio con NSSM...
    "%CURRENT_DIR%\nssm.exe" start CruscottoLocalOpener
)

echo.
echo ===============================================================================
echo PASSO 8: Verifica funzionamento
echo ===============================================================================
echo.

timeout /t 5 /nobreak >nul

REM Verifica servizio attivo
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio attivo in background
) else (
    echo [ERRORE] Servizio non attivo
)

REM Verifica porta
netstat -ano | findstr :17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Porta 17654 in ascolto
) else (
    echo [ATTENZIONE] Porta non ancora attiva
)

echo.
echo ===============================================================================
echo INSTALLAZIONE COMPLETATA!
echo ===============================================================================
echo.
echo ✅ SERVIZIO INSTALLATO IN BACKGROUND PERMANENTE!
echo.
echo Il servizio Local Opener ora:
echo - ✅ Funziona sempre in background (invisibile)
echo - ✅ NON dipende da nessun terminale CMD
echo - ✅ Continua a funzionare anche se chiudi tutto
echo - ✅ Si riavvia automaticamente al riavvio del PC
echo - ✅ Si riavvia automaticamente in caso di crash
echo.
echo VERIFICA:
echo - Apri Gestione Attività (Task Manager)
echo - Vai nella scheda "Servizi"
echo - Cerca "CruscottoLocalOpener" - deve essere "In esecuzione"
echo.
echo LOGS:
echo - Log servizio: C:\ProgramData\.local-opener\service.log
echo - Log errori: C:\ProgramData\.local-opener\service-error.log
echo.
echo Per fermare il servizio: net stop CruscottoLocalOpener
echo Per avviare il servizio: net start CruscottoLocalOpener
echo.

pause



