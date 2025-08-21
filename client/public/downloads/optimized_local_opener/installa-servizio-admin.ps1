# Script PowerShell per installare automaticamente Local Opener come servizio
# Richiede automaticamente privilegi amministratore e configura tutto automaticamente

# Controllo se gia eseguito come amministratore
$currentPrincipal = [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
$adminRole = [Security.Principal.WindowsBuiltInRole] "Administrator"
$isAdmin = $currentPrincipal.IsInRole($adminRole)

if (-NOT $isAdmin) {
    Write-Host "Richiesta privilegi Amministratore..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Definition
    Start-Process PowerShell -Verb runAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit
}

Write-Host "INSTALLAZIONE CRUSCOTTO LOCAL OPENER - AVVIO AUTOMATICO" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

# Percorso della directory corrente dello script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$NodeScriptPath = Join-Path $ScriptDir "index.js"
$ExePath = Join-Path $ScriptDir "local-opener.exe"
$NssmPath = Join-Path $ScriptDir "nssm.exe"

# Cerca Node.js nel sistema
$NodePath = $null
$PossibleNodePaths = @(
    "node",
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:PROGRAMFILES\nodejs\node.exe",
    "${env:PROGRAMFILES(X86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

Write-Host "Ricerca Node.js nel sistema..." -ForegroundColor Cyan
foreach ($TestPath in $PossibleNodePaths) {
    try {
        $TestResult = & $TestPath --version 2>$null
        if ($TestResult -match "v\d+\.\d+\.\d+") {
            $NodePath = $TestPath
            Write-Host "OK Node.js trovato: $NodePath (versione: $TestResult)" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

# Determina quale eseguibile usare
if ($NodePath -and (Test-Path $NodeScriptPath)) {
    Write-Host "MODALITA NODE.JS: Usando Node.js direttamente per auto-discovery avanzato" -ForegroundColor Cyan
    $ServiceExePath = $NodePath
    $ServiceArgs = "`"$NodeScriptPath`""
    $UseNodeJs = $true
} elseif (Test-Path $ExePath) {
    Write-Host "MODALITA BINARIA: Usando local-opener.exe compilato" -ForegroundColor Yellow
    $ServiceExePath = $ExePath
    $ServiceArgs = ""
    $UseNodeJs = $false
} else {
    Write-Host "ERRORE: Nessun eseguibile trovato!" -ForegroundColor Red
    Write-Host "- Node.js path: $NodePath" -ForegroundColor Red
    Write-Host "- index.js exists: $(Test-Path $NodeScriptPath)" -ForegroundColor Red  
    Write-Host "- local-opener.exe exists: $(Test-Path $ExePath)" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

if (-not (Test-Path $NssmPath)) {
    Write-Host "ERRORE: nssm.exe non trovato!" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

$ServiceName = "CruscottoLocalOpener"

# Rimozione servizio esistente (se presente)
Write-Host "Arresto e rimozione servizio esistente (se presente)..." -ForegroundColor Cyan
& $NssmPath stop $ServiceName 2>$null | Out-Null
Start-Sleep -Seconds 2
& $NssmPath remove $ServiceName confirm 2>$null | Out-Null

Write-Host "Installazione servizio con configurazione avanzata..." -ForegroundColor Cyan

# Installazione servizio
if ($UseNodeJs) {
    Write-Host "Configurazione servizio Node.js con auto-discovery avanzato..." -ForegroundColor Cyan
    & $NssmPath install $ServiceName $ServiceExePath $ServiceArgs | Out-Null
} else {
    Write-Host "Configurazione servizio binario..." -ForegroundColor Yellow
    & $NssmPath install $ServiceName $ServiceExePath | Out-Null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE durante installazione servizio!" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

# Configurazione del servizio
Write-Host "Configurazione parametri servizio..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppDirectory $ScriptDir | Out-Null
& $NssmPath set $ServiceName DisplayName "Cruscotto Local Opener Service" | Out-Null
& $NssmPath set $ServiceName Description "Servizio per aprire documenti locali da Cruscotto SGI - Avvio automatico all'accensione PC" | Out-Null

Write-Host "Configurazione avvio automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $NssmPath set $ServiceName Type SERVICE_WIN32_OWN_PROCESS | Out-Null

Write-Host "Configurazione resilienza e restart automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppExit Default Restart | Out-Null
& $NssmPath set $ServiceName AppRestartDelay 5000 | Out-Null
& $NssmPath set $ServiceName AppThrottle 3000 | Out-Null
& $NssmPath set $ServiceName AppStopMethodSkip 0 | Out-Null
& $NssmPath set $ServiceName AppStopMethodConsole 10000 | Out-Null
& $NssmPath set $ServiceName AppStopMethodWindow 5000 | Out-Null
& $NssmPath set $ServiceName AppStopMethodThreads 10000 | Out-Null

Write-Host "Configurazione ottimizzazioni..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppNoConsole 1 | Out-Null
& $NssmPath set $ServiceName AppAffinity All | Out-Null
& $NssmPath set $ServiceName AppPriority NORMAL_PRIORITY_CLASS | Out-Null

Write-Host "Configurazione sicurezza..." -ForegroundColor Cyan
& $NssmPath set $ServiceName ObjectName LocalSystem | Out-Null

Write-Host "Configurazione logging..." -ForegroundColor Cyan
$LogDir = "$env:APPDATA\.local-opener"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
& $NssmPath set $ServiceName AppStdout "$LogDir\service.log" | Out-Null
& $NssmPath set $ServiceName AppStderr "$LogDir\service-error.log" | Out-Null
& $NssmPath set $ServiceName AppRotateFiles 1 | Out-Null
& $NssmPath set $ServiceName AppRotateSeconds 86400 | Out-Null

Write-Host "Configurazione firewall Windows..." -ForegroundColor Cyan
netsh advfirewall firewall delete rule name="Local Opener" 2>$null | Out-Null
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 | Out-Null

Write-Host "Avvio servizio..." -ForegroundColor Cyan
& $NssmPath start $ServiceName | Out-Null

Write-Host ""
Write-Host "Attendo 15 secondi per verifica avvio completo..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verifica stato servizio con retry
Write-Host "Verifica stato servizio..." -ForegroundColor Cyan
$ServiceStatus = $null
$MaxRetries = 3
$RetryCount = 0

do {
    $ServiceStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if ($ServiceStatus -and $ServiceStatus.Status -eq "Paused") {
        Write-Host "ATTENZIONE: Servizio in stato PAUSED - tentativo riavvio forzato..." -ForegroundColor Yellow
        & $NssmPath stop $ServiceName | Out-Null
        Start-Sleep -Seconds 3
        & $NssmPath start $ServiceName | Out-Null
        Start-Sleep -Seconds 10
        $ServiceStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    }
    
    $RetryCount++
    if ($ServiceStatus -and $ServiceStatus.Status -ne "Running" -and $RetryCount -lt $MaxRetries) {
        Write-Host "Retry $RetryCount/$MaxRetries - Attendo ancora..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
} while ($ServiceStatus -and $ServiceStatus.Status -ne "Running" -and $RetryCount -lt $MaxRetries)

# Risultato finale
Write-Host ""
Write-Host "RISULTATO INSTALLAZIONE:" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

if ($ServiceStatus -and $ServiceStatus.Status -eq "Running") {
    Write-Host "SUCCESSO! Servizio installato e avviato correttamente" -ForegroundColor Green
    Write-Host "Il Local Opener si avviera automaticamente ad ogni accensione del PC" -ForegroundColor Green
    
    if ($UseNodeJs) {
        Write-Host "MODALITA NODE.JS ATTIVA: Auto-discovery avanzato di Google Drive abilitato!" -ForegroundColor Green
        Write-Host "Il servizio cerchera automaticamente Google Drive in TUTTE le cartelle utente" -ForegroundColor Green
    }
    
    # Test connessione con timeout piu lungo
    Write-Host ""
    Write-Host "Test connessione servizio..." -ForegroundColor Cyan
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 30 -UseBasicParsing
        Write-Host "Test connessione HTTP riuscito!" -ForegroundColor Green
        
        # Prova a leggere la risposta per vedere le cartelle trovate
        try {
            $HealthData = $Response.Content | ConvertFrom-Json
            if ($HealthData.roots -and $HealthData.roots.Count -gt 0) {
                Write-Host ""
                Write-Host "CARTELLE GOOGLE DRIVE RILEVATE AUTOMATICAMENTE: $($HealthData.roots.Count)" -ForegroundColor Green
                foreach ($root in $HealthData.roots) {
                    Write-Host "   - $root" -ForegroundColor White
                }
            } else {
                Write-Host "ATTENZIONE: Nessuna cartella trovata automaticamente - puoi aggiungerle manualmente dal frontend" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "INFO: Servizio attivo, configurazione percorsi disponibile dal frontend" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "ATTENZIONE: Servizio avviato ma connessione HTTP non ancora pronta" -ForegroundColor Yellow
        Write-Host "INFO: Attendi qualche secondo e riprova su http://127.0.0.1:17654" -ForegroundColor Cyan
    }
    
} else {
    Write-Host "ERRORE: Servizio non avviato correttamente!" -ForegroundColor Red
    if ($ServiceStatus) {
        Write-Host "Stato attuale servizio: $($ServiceStatus.Status)" -ForegroundColor Yellow
    } else {
        Write-Host "Servizio non trovato nel sistema!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "SOLUZIONI SUGGERITE:" -ForegroundColor Magenta
    Write-Host "1. Riavvia il PC completamente" -ForegroundColor White
    Write-Host "2. Esegui come amministratore: sc start $ServiceName" -ForegroundColor White  
    Write-Host "3. Controlla i log in: $LogDir\service-error.log" -ForegroundColor White
    Write-Host "4. Esegui diagnostica-servizio.bat per troubleshooting avanzato" -ForegroundColor White
    Write-Host "5. Se il problema persiste, reinstalla con privilegi amministratore completi" -ForegroundColor White
}

Write-Host ""
Write-Host "INFORMAZIONI UTILI:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "URL servizio locale: http://127.0.0.1:17654" -ForegroundColor White
Write-Host "Log servizio: $LogDir\service.log" -ForegroundColor White
Write-Host "Log errori: $LogDir\service-error.log" -ForegroundColor White
Write-Host "Manager servizi Windows: services.msc" -ForegroundColor White
Write-Host "Diagnostica: diagnostica-servizio.bat" -ForegroundColor White
Write-Host ""

Write-Host "INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Read-Host "Premi Invio per uscire"
