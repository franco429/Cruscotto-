@echo off
echo.
echo DISINSTALLAZIONE SEMPLICE LOCAL OPENER
echo ======================================
echo.

echo Arresto servizio...
net stop "CruscottoLocalOpener" 2>nul

echo Rimozione servizio...
sc delete "CruscottoLocalOpener" 2>nul

echo Terminazione processi...
taskkill /f /im "local-opener.exe" 2>nul

echo Rimozione regola firewall...
netsh advfirewall firewall delete rule name="Local Opener" 2>nul

echo Pulizia file di log...
rmdir /s /q "%APPDATA%\.local-opener" 2>nul

echo.
echo DISINSTALLAZIONE COMPLETATA!
echo.
echo Ora puoi:
echo 1. Riavviare il PC
echo 2. Scaricare la nuova versione
echo 3. Reinstallare con INSTALLA-COME-AMMINISTRATORE.bat
echo.
pause
