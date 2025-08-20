@echo off
chcp 65001 >nul
echo.
echo 🛑 FERMA E DISINSTALLA SERVIZIO LOCAL OPENER VECCHIO
echo ======================================================
echo.
echo Questo script fermera e disinstallera completamente
echo il servizio Local Opener attualmente in esecuzione
echo.
echo ⚠️  IMPORTANTE: Esegui come Amministratore!
echo.
pause

echo.
echo 🔄 Fermo servizio esistente...
sc stop CruscottoLocalOpener
timeout 3

echo.
echo 🗑️ Rimuovo servizio dal sistema...
sc delete CruscottoLocalOpener

echo.
echo 🧹 Pulizia file temporanei...
if exist "%APPDATA%\.local-opener" (
    echo Rimuovo directory configurazione...
    rmdir /s /q "%APPDATA%\.local-opener"
)

echo.
echo 🔍 Verifica processi Local Opener in esecuzione...
tasklist | findstr "local-opener"
echo.
echo Se vedi processi sopra, terminali manualmente o riavvia il PC

echo.
echo ✅ DISINSTALLAZIONE COMPLETATA!
echo.
echo 📥 PROSSIMI PASSI:
echo 1. Scarica il nuovo ZIP Local Opener dal frontend
echo 2. Estrai in una cartella pulita  
echo 3. Esegui INSTALLA-COME-AMMINISTRATORE.bat
echo.
pause
