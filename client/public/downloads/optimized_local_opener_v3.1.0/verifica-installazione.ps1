# verifica-installazione.ps1
Write-Host "VERIFICA INSTALLAZIONE CRUSCOTTO LOCAL OPENER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$allOk = $true

# 1. Verifica servizio
Write-Host "`n[1] Verifica Servizio Windows..." -ForegroundColor Yellow
$service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -eq 'Running') {
        Write-Host "    ✓ Servizio attivo" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Servizio non attivo (Status: $($service.Status))" -ForegroundColor Red
        $allOk = $false
    }
    
    if ($service.StartType -eq 'Automatic' -or $service.StartType -eq 'AutomaticDelayedStart') {
        Write-Host "    ✓ Avvio automatico configurato" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Avvio automatico NON configurato" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "    ✗ Servizio non trovato" -ForegroundColor Red
    $allOk = $false
}

# 2. Verifica Task Scheduler
Write-Host "`n[2] Verifica Task Scheduler Backup..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName "CruscottoLocalOpenerBackup" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "    ✓ Task scheduler configurato" -ForegroundColor Green
} else {
    Write-Host "    ⚠ Task scheduler non configurato (opzionale)" -ForegroundColor Yellow
}

# 3. Verifica percorsi Google Drive
Write-Host "`n[3] Verifica Percorsi Google Drive..." -ForegroundColor Yellow
$configPath = "$env:APPDATA\.local-opener\config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    if ($config.paths -and $config.paths.Count -gt 0) {
        Write-Host "    ✓ Trovati $($config.paths.Count) percorsi:" -ForegroundColor Green
        foreach ($path in $config.paths) {
            if (Test-Path $path) {
                Write-Host "      ✓ $path" -ForegroundColor Green
            } else {
                Write-Host "      ✗ $path (non accessibile)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "    ✗ Nessun percorso configurato" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "    ✗ File di configurazione non trovato" -ForegroundColor Red
    $allOk = $false
}

# 4. Verifica porta
Write-Host "`n[4] Verifica Porta 17654..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName localhost -Port 17654 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "    ✓ Porta in ascolto" -ForegroundColor Green
} else {
    Write-Host "    ✗ Porta non raggiungibile" -ForegroundColor Red
    $allOk = $false
}

# 5. Test endpoint
Write-Host "`n[5] Test Endpoint /health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "    ✓ Endpoint risponde correttamente" -ForegroundColor Green
    }
} catch {
    Write-Host "    ✗ Endpoint non risponde" -ForegroundColor Red
    $allOk = $false
}

# RISULTATO FINALE
Write-Host "`n=============================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "RISULTATO: TUTTO OK! ✓" -ForegroundColor Green
    Write-Host "Il servizio è configurato correttamente e si avvierà automaticamente." -ForegroundColor Green
} else {
    Write-Host "RISULTATO: PROBLEMI RILEVATI ✗" -ForegroundColor Red
    Write-Host "Esegui 'installer-definitivo.ps1' per risolvere i problemi." -ForegroundColor Yellow
}
Write-Host "=============================================" -ForegroundColor Cyan
