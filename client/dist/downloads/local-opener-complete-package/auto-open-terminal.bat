@echo off
:: Script per apertura automatica terminale Local Opener
:: Eseguito automaticamente all'avvio di Windows

setlocal enabledelayedexpansion

:: Attendi che il sistema sia completamente avviato
echo Attendo che Windows si avvii completamente...
timeout /t 30 /nobreak >nul

:: Verifica se il servizio è attivo
:check_service
echo Verifica stato servizio LocalOpener...
sc query "LocalOpener" | find "RUNNING" >nul 2>&1
if %errorLevel% neq 0 (
    echo Servizio LocalOpener non attivo, attendo...
    timeout /t 10 /nobreak >nul
    goto :check_service
)

echo  Servizio LocalOpener attivo e funzionante
echo.

:: Apri il terminale del servizio se non è già visibile
echo Apertura automatica terminale Local Opener...
echo.
echo Se il terminale non si apre automaticamente:
echo 1. Premi Win+R
echo 2. Digita: sc start LocalOpener
echo 3. Premi Invio
echo.

:: Forza l'apertura del terminale del servizio
echo Forzo apertura terminale servizio...
sc start "LocalOpener" >nul 2>&1

:: Attendi e verifica che il terminale sia visibile
echo Attendo apertura terminale...
timeout /t 5 /nobreak >nul

echo.
echo  Terminale Local Opener configurato per apertura automatica.
echo.
echo Per verificare lo stato:
echo - Servizio: sc query LocalOpener
echo - Task Scheduler: schtasks /query /tn LocalOpenerTerminal
echo.
echo Il terminale dovrebbe essere ora visibile.
echo Se non lo è, riavvia il servizio manualmente.
echo.
pause
