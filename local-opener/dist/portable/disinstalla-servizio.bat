@echo off
echo Disinstallazione Cruscotto Local Opener...
echo.

if not exist nssm.exe (
    echo ERRORE: nssm.exe non trovato!
    pause
    exit /b 1
)

echo Fermo il servizio...
nssm.exe stop CruscottoLocalOpener

echo Rimuovo il servizio...
nssm.exe remove CruscottoLocalOpener confirm

echo.
echo ✅ Servizio disinstallato con successo!
echo.
pause
