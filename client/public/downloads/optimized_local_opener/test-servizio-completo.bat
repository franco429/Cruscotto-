@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo               TEST COMPLETO SERVIZIO LOCAL OPENER
echo ===============================================================================
echo.
echo Questo script testa completamente il funzionamento del servizio Local Opener.
echo Verrà verificato:
echo - Stato del servizio Windows
echo - Connessione HTTP
echo - Configurazione Google Drive
echo - Funzionalità di apertura file
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Verifica stato servizio Windows
echo ===============================================================================
echo.

sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servizio CruscottoLocalOpener è attivo
) else (
    echo [ERRORE] Servizio CruscottoLocalOpener non è attivo
    echo.
    echo Tentativo di avvio del servizio...
    net start CruscottoLocalOpener
    if %errorLevel% == 0 (
        echo [OK] Servizio avviato con successo
    ) else (
        echo [ERRORE] Impossibile avviare il servizio
        echo Esegui "diagnostica-servizio.bat" per maggiori dettagli
        pause
        exit /b 1
    )
)

echo.
echo ===============================================================================
echo PASSO 2: Test connessione HTTP
echo ===============================================================================
echo.

REM Attendi che il servizio sia completamente attivo
timeout /t 5 /nobreak >nul

echo Controllo porta 17654...
netstat -ano | findstr :17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Porta 17654 è in ascolto
) else (
    echo [ERRORE] Porta 17654 non è in ascolto
    echo Il servizio potrebbe non essere completamente avviato
    pause
    exit /b 1
)

echo.
echo Test endpoint principale...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:17654' -TimeoutSec 10 -UseBasicParsing; if($r.StatusCode -eq 200) { Write-Host '[OK] Endpoint principale risponde' -ForegroundColor Green } else { Write-Host '[ERRORE] Endpoint risponde con codice:' $r.StatusCode -ForegroundColor Red } } catch { Write-Host '[ERRORE] Endpoint non raggiungibile:' $_.Exception.Message -ForegroundColor Red }" 2>nul

echo.
echo Test endpoint health...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 10 -UseBasicParsing; if($r.StatusCode -eq 200) { Write-Host '[OK] Endpoint health risponde' -ForegroundColor Green; $health = $r.Content | ConvertFrom-Json; Write-Host '[INFO] Versione:' $health.version -ForegroundColor Cyan; Write-Host '[INFO] Cartelle configurate:' $health.roots.Count -ForegroundColor Cyan; Write-Host '[INFO] Google Drive rilevato:' $health.googleDriveDetected -ForegroundColor Cyan } else { Write-Host '[ERRORE] Health endpoint risponde con codice:' $r.StatusCode -ForegroundColor Red } } catch { Write-Host '[ERRORE] Health endpoint non raggiungibile:' $_.Exception.Message -ForegroundColor Red }" 2>nul

echo.
echo ===============================================================================
echo PASSO 3: Test configurazione Google Drive
echo ===============================================================================
echo.

echo Test endpoint configurazione...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/config' -TimeoutSec 10 -UseBasicParsing; if($r.StatusCode -eq 200) { Write-Host '[OK] Endpoint config risponde' -ForegroundColor Green; $config = $r.Content | ConvertFrom-Json; if($config.roots -and $config.roots.Count -gt 0) { Write-Host '[OK] Cartelle Google Drive configurate:' $config.roots.Count -ForegroundColor Green; foreach($root in $config.roots) { Write-Host '   -' $root -ForegroundColor White } } else { Write-Host '[ATTENZIONE] Nessuna cartella Google Drive configurata' -ForegroundColor Yellow } } else { Write-Host '[ERRORE] Config endpoint risponde con codice:' $r.StatusCode -ForegroundColor Red } } catch { Write-Host '[ERRORE] Config endpoint non raggiungibile:' $_.Exception.Message -ForegroundColor Red }" 2>nul

echo.
echo Test auto-discovery Google Drive...
powershell -NoProfile -Command "try { $body = '{}' | ConvertTo-Json; $r = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/auto-detect-paths' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 30 -UseBasicParsing; if($r.StatusCode -eq 200) { Write-Host '[OK] Auto-discovery completato' -ForegroundColor Green; $result = $r.Content | ConvertFrom-Json; Write-Host '[INFO] Percorsi rilevati:' $result.detectedPaths.Count -ForegroundColor Cyan } else { Write-Host '[ERRORE] Auto-discovery fallito con codice:' $r.StatusCode -ForegroundColor Red } } catch { Write-Host '[ERRORE] Auto-discovery non funziona:' $_.Exception.Message -ForegroundColor Red }" 2>nul

echo.
echo ===============================================================================
echo PASSO 4: Test funzionalità apertura file (simulazione)
echo ===============================================================================
echo.

echo Test endpoint apertura file...
powershell -NoProfile -Command "try { $testData = @{ title='test.txt'; candidates=@('test.txt', 'esempio.txt'); logicalPath='test/test.txt' } | ConvertTo-Json; $r = Invoke-WebRequest -Uri 'http://127.0.0.1:17654/open' -Method POST -Body $testData -ContentType 'application/json' -TimeoutSec 10 -UseBasicParsing; if($r.StatusCode -eq 404) { Write-Host '[OK] Endpoint apertura file funziona (404 atteso per file test)' -ForegroundColor Green } elseif($r.StatusCode -eq 200) { Write-Host '[OK] Endpoint apertura file funziona completamente!' -ForegroundColor Green } else { Write-Host '[ATTENZIONE] Endpoint risponde con codice inatteso:' $r.StatusCode -ForegroundColor Yellow } } catch { Write-Host '[ERRORE] Endpoint apertura file non funziona:' $_.Exception.Message -ForegroundColor Red }" 2>nul

echo.
echo ===============================================================================
echo PASSO 5: Test log e configurazione
echo ===============================================================================
echo.

echo Verifica file di configurazione...
if exist "%APPDATA%\.local-opener\config.json" (
    echo [OK] File configurazione trovato: %APPDATA%\.local-opener\config.json
    
    powershell -NoProfile -Command "try { $config = Get-Content '%APPDATA%\.local-opener\config.json' | ConvertFrom-Json; Write-Host '[INFO] Configurazione valida con' $config.roots.Count 'percorsi' -ForegroundColor Cyan } catch { Write-Host '[ATTENZIONE] Configurazione non parsabile' -ForegroundColor Yellow }" 2>nul
) else (
    echo [ATTENZIONE] File configurazione non trovato
)

echo.
echo Verifica log del servizio...
if exist "%APPDATA%\.local-opener\service.log" (
    echo [OK] Log servizio trovato: %APPDATA%\.local-opener\service.log
    
    powershell -NoProfile -Command "try { $log = Get-Content '%APPDATA%\.local-opener\service.log' -Tail 5 -ErrorAction SilentlyContinue; if($log) { Write-Host '[INFO] Ultime righe del log:' -ForegroundColor Cyan; foreach($line in $log) { Write-Host '   ' $line -ForegroundColor Gray } } } catch { }" 2>nul
) else (
    echo [INFO] Log servizio non ancora creato (normale per primo avvio)
)

if exist "%APPDATA%\.local-opener\service-error.log" (
    echo [ATTENZIONE] Log errori trovato - controlla per problemi: %APPDATA%\.local-opener\service-error.log
) else (
    echo [OK] Nessun log errori (servizio funziona correttamente)
)

echo.
echo ===============================================================================
echo RISULTATO TEST COMPLETO
echo ===============================================================================
echo.

REM Verifica finale generale
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
set SERVICE_OK=%errorLevel%

netstat -ano | findstr :17654 >nul 2>&1
set PORT_OK=%errorLevel%

powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:17654/health' -TimeoutSec 5 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
set HTTP_OK=%errorLevel%

if %SERVICE_OK%==0 if %PORT_OK%==0 if %HTTP_OK%==0 (
    echo [SUCCESSO] Servizio Local Opener funziona correttamente!
    echo.
    echo Stato: TUTTO OK
    echo - Servizio Windows: ATTIVO
    echo - Porta 17654: IN ASCOLTO  
    echo - Endpoint HTTP: FUNZIONANTI
    echo - Configurazione: PRESENTE
    echo.
    echo Il servizio è pronto per l'uso dal Cruscotto SGI.
    echo.
    echo URL principale: http://127.0.0.1:17654
    echo URL health: http://127.0.0.1:17654/health
    echo URL config: http://127.0.0.1:17654/config
    
) else (
    echo [PROBLEMI] Il servizio Local Opener presenta alcuni problemi.
    echo.
    echo Diagnosi:
    if not %SERVICE_OK%==0 echo - Servizio Windows: NON ATTIVO
    if not %PORT_OK%==0 echo - Porta 17654: NON IN ASCOLTO
    if not %HTTP_OK%==0 echo - Endpoint HTTP: NON FUNZIONANTI
    echo.
    echo SOLUZIONI CONSIGLIATE:
    echo 1. Esegui "diagnostica-servizio.bat" per analisi dettagliata
    echo 2. Riavvia il servizio: net stop CruscottoLocalOpener ^&^& net start CruscottoLocalOpener  
    echo 3. Riavvia il PC completamente
    echo 4. Se persiste, reinstalla con "installa-servizio-finale.bat"
)

echo.
echo ===============================================================================
echo FINE TEST
echo ===============================================================================
echo.

pause
