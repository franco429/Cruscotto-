@echo off
echo Cruscotto Local Opener - Versione Portable
echo ==========================================

rem Rileva architettura sistema
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set ARCH=arm64
    set EXE=local-opener-arm64.exe
) else (
    set ARCH=x64
    set EXE=local-opener-x64.exe
)

echo Architettura rilevata: %ARCH%
echo.

rem Verifica se l'eseguibile esiste
if not exist "%EXE%" (
    echo ERRORE: Eseguibile %EXE% non trovato!
    echo Assicurati di aver estratto tutti i file.
    pause
    exit /b 1
)

echo Avvio di %EXE%...
start "" "%EXE%"

echo.
echo Local Opener avviato con successo!
echo Puoi chiudere questa finestra.
echo.
pause
