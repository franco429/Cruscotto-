@echo off
echo Installazione Cruscotto Local Opener come servizio Windows...
echo.

if not exist nssm.exe (
    echo ERRORE: nssm.exe non trovato!
    echo Scarica NSSM da https://nssm.cc/download
    pause
    exit /b 1
)

echo Installo il servizio...
nssm.exe install CruscottoLocalOpener "%~dp0local-opener.exe"
nssm.exe set CruscottoLocalOpener AppDirectory "%~dp0"
nssm.exe set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service"
nssm.exe set CruscottoLocalOpener Description "Servizio per aprire documenti locali da Cruscotto SGI"
nssm.exe set CruscottoLocalOpener Start SERVICE_AUTO_START

echo Avvio il servizio...
nssm.exe start CruscottoLocalOpener

echo.
echo ✅ Servizio installato e avviato con successo!
echo Il Local Opener è ora attivo e si avvierà automaticamente all'accensione del PC.
echo.
pause
