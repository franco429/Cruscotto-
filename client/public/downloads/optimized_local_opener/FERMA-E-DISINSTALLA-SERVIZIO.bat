@echo off
chcp 65001 >nul
echo.
echo CRUSCOTTO LOCAL OPENER - ARRESTO E DISINSTALLAZIONE RAPIDA
echo ============================================================
echo.
echo ATTENZIONE: Questo script fermerà e rimuoverà completamente
echo             il servizio Local Opener dal sistema.
echo.
echo Cosa fa questo script:
echo  ✓ Ferma immediatamente il servizio Local Opener
echo  ✓ Disinstalla completamente il servizio Windows
echo  ✓ Rimuove le regole firewall
echo  ✓ Pulisce la configurazione (opzionale)
echo.
echo Se richiesto, clicca "Si" nella finestra UAC per continuare.
echo.
set /p conferma=Sei sicuro di voler continuare? (s/N): 
if /i not "%conferma%"=="s" (
    echo Operazione annullata dall'utente.
    pause
    exit /b
)

echo.
echo Arresto immediato del servizio...
sc stop CruscottoLocalOpener >nul 2>&1
timeout /t 3 /nobreak >nul

echo Avvio disinstallazione completa con privilegi amministratore...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0disinstalla-servizio-admin.ps1"

echo.
echo Operazione completata. Controlla i messaggi sopra per il risultato.
echo.
pause
