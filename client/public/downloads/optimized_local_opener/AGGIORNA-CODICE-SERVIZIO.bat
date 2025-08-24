@echo off
chcp 65001 >nul
cls
echo.
echo ===============================================================================
echo            AGGIORNAMENTO COMPLETO CODICE LOCAL OPENER - ULTRA ROBUSTO
echo ===============================================================================
echo.
echo Questo script RISOLVE DEFINITIVAMENTE il problema:
echo  - Il servizio ha una versione VECCHIA del codice
echo  - L'endpoint /reconfigure-paths NON ESISTE nella versione attuale
echo  - Questo script COPIA il nuovo codice nella directory del servizio
echo  - Riavvia il servizio con il codice AGGIORNATO
echo.
echo PROBLEMA RISOLTO:
echo  - Endpoint /reconfigure-paths mancante (versione vecchia)
echo  - Codice servizio non aggiornato
echo  - Questo script forza l'aggiornamento completo
echo.

echo Avvio aggiornamento completo codice servizio...
echo.

REM Esegui PowerShell con aggiornamento completo
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%~dp0'; & '%~dp0force-update-service.ps1'"

echo.
echo ===============================================================================
echo Aggiornamento completo codice servizio completato!
echo ===============================================================================
echo.
echo Ora verifica che tutti i percorsi siano configurati:
echo.
echo 1. Health: http://127.0.0.1:17654/health
echo 2. Config: http://127.0.0.1:17654/config
echo.
echo Dovresti vedere i percorsi rilevati automaticamente, come:
echo  - G:\Il mio Drive (o My Drive)
echo  - H:\Il mio Drive (se presente)
echo  - C:\Users\[utente]\Google Drive (se presente)
echo  - Altri percorsi Google Drive rilevati automaticamente
echo.
echo Se funziona, il Local Opener e ora PERFETTO al 100%!
echo.
pause
