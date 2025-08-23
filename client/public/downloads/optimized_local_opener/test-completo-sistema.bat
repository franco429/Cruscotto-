@echo off
REM Script di test completo per il sistema Local Opener ottimizzato
REM Verifica installazione, configurazione utente, auto-discovery e funzionamento

chcp 65001 >nul
cls
echo ===============================================================================
echo           TEST COMPLETO SISTEMA LOCAL OPENER - OTTIMIZZATO
echo ===============================================================================
echo.

echo Questo script verifica che tutto funzioni correttamente:
echo - Servizio installato e attivo
echo - Configurazione utente ottimizzata (utente corrente O LocalSystem)
echo - Auto-discovery Google Drive funzionante
echo - Accesso ai percorsi G:\Il mio Drive, ecc.
echo - Servizio si avvia automaticamente al riavvio
echo.

echo.
echo ===============================================================================
echo PASSO 1: Verifica stato servizio
echo ===============================================================================
echo.

REM Verifica se il servizio è installato
sc query CruscottoLocalOpener >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio CruscottoLocalOpener installato
) else (
    echo [ERRORE] Servizio NON installato!
    echo [INFO] Eseguire prima installa-servizio-ottimizzato.bat
    pause
    exit /b 1
)

REM Verifica se il servizio è attivo
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio attivo e funzionante
) else (
    echo [ATTENZIONE] Servizio installato ma non attivo
    echo [INFO] Tentativo avvio servizio...
    net start CruscottoLocalOpener >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Servizio avviato correttamente
    ) else (
        echo [ERRORE] Impossibile avviare il servizio
        echo [INFO] Controllare i log in %APPDATA%\.local-opener\service-error.log
        pause
        exit /b 1
    )
)

echo.
echo ===============================================================================
echo PASSO 2: Verifica configurazione utente
echo ===============================================================================
echo.

REM Ottieni configurazione utente servizio
for /f "tokens=2 delims=:" %%i in ('sc qc CruscottoLocalOpener ^| find "SERVICE_START_NAME"') do set "SERVICE_USER=%%i"
set "SERVICE_USER=%SERVICE_USER:~1%"

REM Ottieni utente corrente
for /f "tokens=2 delims=\" %%i in ('whoami') do set "CURRENT_USER=%%i"

echo Utente servizio attuale: %SERVICE_USER%
echo Utente corrente sistema: %CURRENT_USER%

if "%SERVICE_USER%" == ".%CURRENT_USER%" (
    echo [OK] Configurazione utente CORRETTA per accesso Google Drive
) else if "%SERVICE_USER%" == "LocalSystem" (
    echo [INFO] Servizio configurato come LocalSystem (modalità ottimizzata)
    echo [OK] Auto-discovery Google Drive attivo per LocalSystem
) else (
    echo [ATTENZIONE] Utente servizio diverso: %SERVICE_USER%
    echo [INFO] Verificare se ha accesso a Google Drive
)

echo.
echo ===============================================================================
echo PASSO 3: Test connessione HTTP servizio
echo ===============================================================================
echo.

echo [INFO] Test connessione a http://127.0.0.1:17654/health...

REM Test connessione HTTP
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '[OK] Connessione HTTP riuscita' -ForegroundColor Green; $data = $response.Content | ConvertFrom-Json; Write-Host ('[INFO] Versione servizio: ' + $data.version) -ForegroundColor Cyan; Write-Host ('[INFO] Sistema: ' + $data.platform + ' ' + $data.arch) -ForegroundColor Cyan; if ($data.roots -and $data.roots.Count -gt 0) { Write-Host ('[OK] Percorsi configurati: ' + $data.roots.Count) -ForegroundColor Green; foreach ($root in $data.roots) { if ($root -like '*Google*' -or $root -like '*Drive*' -or $root -like 'G:\*' -or $root -like 'H:\*') { Write-Host ('  [GOOGLE] ' + $root) -ForegroundColor Green } else { Write-Host ('  [ALTRO] ' + $root) -ForegroundColor Cyan } } } else { Write-Host '[ATTENZIONE] Nessun percorso configurato' -ForegroundColor Yellow } } } catch { Write-Host '[ERRORE] Connessione HTTP fallita' -ForegroundColor Red; Write-Host ('[INFO] Dettagli errore: ' + $_.Exception.Message) -ForegroundColor Red }" 2>nul

if %errorLevel% neq 0 (
    echo [ERRORE] Test HTTP fallito - servizio non risponde
)

echo.
echo ===============================================================================
echo PASSO 4: Test accesso Google Drive
echo ===============================================================================
echo.

echo [INFO] Test accesso diretto ai percorsi Google Drive comuni...

set "TEST_PATHS=G:\Il mio Drive,G:\My Drive,G:\,H:\Il mio Drive,H:\My Drive,H:\,I:\Il mio Drive,I:\My Drive,I:\"

for %%p in (%TEST_PATHS%) do (
    if exist "%%p" (
        REM Test accesso completo
        dir "%%p" >nul 2>&1
        if %errorLevel% == 0 (
            echo [OK] Accessibile: %%p
        ) else (
            echo [ATTENZIONE] Esiste ma non accessibile: %%p
        )
    ) else (
        echo [INFO] Non trovato: %%p
    )
)

echo.
echo ===============================================================================
echo PASSO 5: Test auto-start al riavvio
echo ===============================================================================
echo.

echo [INFO] Verifica configurazione auto-start...

REM Verifica configurazione auto-start
sc qc CruscottoLocalOpener | find "AUTO_START" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio configurato per avvio automatico
) else (
    echo [ATTENZIONE] Servizio NON configurato per avvio automatico
    echo [INFO] Eseguire installa-servizio-ottimizzato.bat per correggere
)

REM Verifica delayed auto-start
sc qc CruscottoLocalOpener | find "DELAYED" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Avvio automatico con delay (migliora stabilità)
) else (
    echo [INFO] Avvio automatico immediato (normale)
)

echo.
echo ===============================================================================
echo PASSO 6: Test auto-discovery Google Drive
echo ===============================================================================
echo.

echo [INFO] Test endpoint auto-discovery...

powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/auto-detect-paths' -Method POST -TimeoutSec 30; if ($response.StatusCode -eq 200) { Write-Host '[OK] Auto-discovery endpoint attivo' -ForegroundColor Green; $data = $response.Content | ConvertFrom-Json; Write-Host ('[INFO] Percorsi rilevati: ' + $data.detectedPaths.Count) -ForegroundColor Cyan; if ($data.detectedPaths.Count -gt 0) { Write-Host '[OK] Auto-discovery ha trovato percorsi!' -ForegroundColor Green; foreach ($path in $data.detectedPaths) { Write-Host ('  - ' + $path) -ForegroundColor Cyan } } else { Write-Host '[ATTENZIONE] Auto-discovery non ha trovato percorsi Google Drive' -ForegroundColor Yellow } } } catch { Write-Host '[ERRORE] Auto-discovery endpoint non risponde' -ForegroundColor Red }" 2>nul

echo.
echo ===============================================================================
echo RISULTATI TEST COMPLETO
echo ===============================================================================
echo.

echo SUGGERIMENTI PER OTTIMIZZAZIONE:
echo.

REM Verifica presenza di Google Drive
if exist "G:\Il mio Drive" (
    echo [INFO] Google Drive rilevato su G:\Il mio Drive
    echo [INFO] Il sistema dovrebbe funzionare perfettamente
) else if exist "G:\My Drive" (
    echo [INFO] Google Drive rilevato su G:\My Drive
    echo [INFO] Il sistema dovrebbe funzionare perfettamente
) else (
    echo [ATTENZIONE] Google Drive non rilevato automaticamente
    echo [INFO] Verificare che Google Drive Desktop sia installato e attivo
    echo [INFO] Oppure configurare manualmente i percorsi
)

echo.
echo PASSI SUCCESSIVI:
echo 1. Apri http://127.0.0.1:17654 nel browser per verificare
echo 2. Testa l'apertura di un documento dal pannello di controllo
echo 3. Se ci sono problemi, esegui diagnostica-servizio.bat
echo 4. Per aggiornare i percorsi: AGGIORNA-CODICE-SERVIZIO.bat
echo.

echo.
echo ===============================================================================
echo TEST COMPLETATO!
echo ===============================================================================
echo.

pause
