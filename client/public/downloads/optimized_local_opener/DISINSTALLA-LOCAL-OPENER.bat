@echo off
chcp 65001 >nul
echo.
echo CRUSCOTTO LOCAL OPENER - DISINSTALLAZIONE COMPLETA
echo =======================================================
echo.
echo ATTENZIONE: Questo script rimuoverà completamente il servizio
echo             Local Opener dal sistema.
echo.
echo Cosa fa questo script:
echo  ✓ Ferma il servizio Local Opener
echo  ✓ Rimuove il servizio Windows
echo  ✓ Rimuove le regole firewall
echo  ✓ Mantiene i file di configurazione (se necessario)
echo.
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.
pause

echo.
echo Avvio disinstallazione con privilegi amministratore...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0disinstalla-servizio-admin.ps1"

echo.
echo Disinstallazione completata. Controlla i messaggi sopra per il risultato.
echo.
pause
