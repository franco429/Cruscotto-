@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    TEST MODALITA' TERMINALE APERTO
echo    LOCAL OPENER SERVICE
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    echo.
    echo Per eseguire come amministratore:
    echo 1. Tasto destro su questo file
    echo 2. "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set NSSM_PATH=%~dp0nssm.exe

echo Test configurazione servizio: %SERVICE_NAME%
echo.

:: Verifica esistenza file necessari
if not exist "%NSSM_PATH%" (
    echo ERRORE: File nssm.exe non trovato!
    echo Assicurati che sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

:: Verifica se il servizio esiste
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Il servizio %SERVICE_NAME% non esiste!
    echo Esegui prima install-local-opener.bat per installare il servizio.
    pause
    exit /b 1
)

echo Test configurazione modalità terminale aperto...
echo.

:: Verifica configurazione NSSM
echo - Verifica configurazione NSSM...
"%NSSM_PATH%" dump "%SERVICE_NAME%"

echo.
echo - Verifica stato servizio...
sc query "%SERVICE_NAME%"

echo.
echo - Verifica modalità interattiva...
"%NSSM_PATH%" get "%SERVICE_NAME%" AppType

echo.
echo ========================================
echo    TEST COMPLETATO
echo ========================================
echo.
echo Se tutto è configurato correttamente:
echo - AppType dovrebbe essere "Interactive"
echo - Il servizio dovrebbe essere "RUNNING"
echo - Il terminale dovrebbe essere visibile
echo.
echo Per verificare visivamente:
echo 1. Apri Task Manager
echo 2. Cerca "LocalOpener" nei processi
echo 3. Dovrebbe esserci una finestra console aperta
echo.
pause
