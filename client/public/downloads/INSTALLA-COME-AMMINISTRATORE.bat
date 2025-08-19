@echo off
chcp 65001 >nul
echo.
echo 🚀 CRUSCOTTO LOCAL OPENER - INSTALLAZIONE AUTOMATICA AMMINISTRATORE
echo ======================================================================
echo.
echo ⚠️  IMPORTANTE: Questo script richiederà automaticamente i privilegi
echo     di Amministratore necessari per installare il servizio Windows.
echo.
echo 🔄 Se richiesto, clicca "Sì" nella finestra UAC per continuare.
echo.
pause

echo.
echo 🔧 Avvio installazione con privilegi amministratore...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installa-servizio-admin.ps1"

echo.
echo ✅ Processo completato. Controlla i messaggi sopra per il risultato.
echo.
pause
