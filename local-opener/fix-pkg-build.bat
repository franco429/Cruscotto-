@echo off
echo 🔧 Aggiornamento PKG per risolvere errore punycode...
echo.

cd /d "%~dp0"

echo 📦 Disinstallazione versione vecchia...
npm uninstall pkg

echo 📦 Installazione versione aggiornata...
npm install --save-dev pkg@latest

echo ✅ PKG aggiornato! Ora puoi eseguire npm run build

pause
