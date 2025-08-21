@echo off
chcp 65001 >nul
echo.
echo CRUSCOTTO LOCAL OPENER - INSTALLAZIONE AUTOMATICA AMMINISTRATORE
echo ======================================================================
echo.
echo IMPORTANTE: Questo script richiederà automaticamente i privilegi
echo             di Amministratore necessari per installare il servizio Windows.
echo.
echo Cosa fa questo script:
echo  ✓ Installa Local Opener come servizio Windows permanente
echo  ✓ Configura avvio automatico ad ogni accensione del PC
echo  ✓ Rileva automaticamente tutti i percorsi Google Drive
echo  ✓ Configura resilienza e restart automatico
echo.
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.
pause

echo.
echo Avvio installazione con privilegi amministratore...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installa-servizio-admin.ps1"

echo.
echo Processo completato. Controlla i messaggi sopra per il risultato.
echo.
pause
