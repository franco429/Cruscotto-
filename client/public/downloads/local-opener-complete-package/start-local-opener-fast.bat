@echo off
:: Versione ultra-veloce per avvio automatico Windows
set "EXE_PATH=%~dp0cruscotto-local-opener-setup.exe"

:: Avvio immediato senza controlli o output
start "" "%EXE_PATH%" >nul 2>&1
exit /b 0
