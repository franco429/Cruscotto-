@echo off
setlocal enabledelayedexpansion
title Installazione Servizio Local Opener con Account Utente

echo ==========================================
echo    INSTALLAZIONE SERVIZIO CON ACCOUNT UTENTE
echo    (Per accesso completo a Google Drive)
echo ==========================================
echo.
echo IMPORTANTE: Questa modalita' richiede la password del tuo account Windows
echo e permette al servizio di accedere a tutti i tuoi drive mappati.
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Questo script deve essere eseguito come amministratore!
    echo.
    echo Chiudi questa finestra e:
    echo 1. Fai clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Verifica file necessari
if not exist "%~dp0local-opener.exe" (
    echo [ERRORE] local-opener.exe non trovato!
    pause
    exit /b 1
)

if not exist "%~dp0nssm.exe" (
    echo [ERRORE] nssm.exe non trovato!
    pause
    exit /b 1
)

:: Ottieni nome utente corrente
set "currentUser=%USERNAME%"
set "currentDomain=%USERDOMAIN%"
echo Utente corrente: %currentDomain%\%currentUser%
echo.

:: Ferma e rimuovi servizio esistente se presente
echo Rimozione servizio esistente...
net stop CruscottoLocalOpener >nul 2>&1
"%~dp0nssm.exe" remove CruscottoLocalOpener confirm >nul 2>&1
timeout /t 3 /nobreak >nul

:: Chiedi password
echo Inserisci la password per l'account %currentDomain%\%currentUser%:
echo (La password non verra' visualizzata mentre la digiti)
echo.

:: Usa PowerShell per leggere la password in modo sicuro
powershell -Command "$password = Read-Host -AsSecureString; $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password); $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR); Write-Host $PlainPassword" > "%temp%\pw.tmp"
set /p userPassword=<"%temp%\pw.tmp"
del "%temp%\pw.tmp"

:: Installa servizio
echo.
echo Installazione servizio con account utente...

"%~dp0nssm.exe" install CruscottoLocalOpener "%~dp0local-opener.exe"

:: Configura account utente
"%~dp0nssm.exe" set CruscottoLocalOpener ObjectName "%currentDomain%\%currentUser%" "%userPassword%"

:: Configura parametri servizio
"%~dp0nssm.exe" set CruscottoLocalOpener DisplayName "Cruscotto Local Opener (User Mode)"
"%~dp0nssm.exe" set CruscottoLocalOpener Description "Servizio per apertura file locali dal browser - Modalita' utente con accesso completo a Google Drive"
"%~dp0nssm.exe" set CruscottoLocalOpener Start SERVICE_AUTO_START

:: Configura directory di lavoro
"%~dp0nssm.exe" set CruscottoLocalOpener AppDirectory "%~dp0"

:: Configura log
"%~dp0nssm.exe" set CruscottoLocalOpener AppStdout "%~dp0logs\service.log"
"%~dp0nssm.exe" set CruscottoLocalOpener AppStderr "%~dp0logs\service-error.log"
"%~dp0nssm.exe" set CruscottoLocalOpener AppRotateFiles 1
"%~dp0nssm.exe" set CruscottoLocalOpener AppRotateBytes 1048576

:: Crea directory logs se non esiste
if not exist "%~dp0logs" mkdir "%~dp0logs"

:: Clear password variable
set "userPassword="

:: Avvia servizio
echo.
echo Avvio servizio...
net start CruscottoLocalOpener

:: Verifica stato
timeout /t 3 /nobreak >nul
sc query CruscottoLocalOpener | find "RUNNING" >nul
if %errorlevel%==0 (
    echo.
    echo ==========================================
    echo [OK] SERVIZIO INSTALLATO E AVVIATO!
    echo ==========================================
    echo.
    echo Il servizio e' ora in esecuzione con il tuo account utente.
    echo Avra' accesso completo a Google Drive e tutti i drive mappati!
    echo.
    echo URL servizio: http://127.0.0.1:17654
    echo.
    echo NOTA: Se cambi la password di Windows, dovrai reinstallare il servizio.
) else (
    echo.
    echo [ERRORE] Il servizio non si e' avviato correttamente.
    echo.
    echo Possibili cause:
    echo 1. Password errata
    echo 2. L'utente non ha il permesso "Accedi come servizio"
    echo 3. Problemi di configurazione
    echo.
    echo Esegui 'diagnostica-servizio.bat' per maggiori dettagli.
)

echo.
pause
