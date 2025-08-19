@echo off
echo.
echo DISINSTALLAZIONE COMPLETA LOCAL OPENER
echo ======================================
echo.
echo IMPORTANTE: Questo script richiederà automaticamente i privilegi
echo di Amministratore per rimuovere completamente il servizio.
echo.
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.
pause

echo.
echo Avvio disinstallazione con privilegi amministratore...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0disinstalla-servizio-admin.ps1"

echo.
echo Processo completato. Controlla i messaggi sopra per il risultato.
echo.
echo Ora puoi reinstallare la versione aggiornata con:
echo INSTALLA-COME-AMMINISTRATORE.bat
echo.
echo ALTERNATIVA: Se ci sono ancora problemi, usa DISINSTALLA-SEMPLICE.bat
echo.
pause
