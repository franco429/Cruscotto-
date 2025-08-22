# Script PowerShell per installare automaticamente Local Opener come servizio
# Richiede automaticamente privilegi amministratore

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

foreach ($TestPath in $PossibleNodePaths) {
    try {
        $TestResult = & $TestPath --version 2>$null
        if ($TestResult -match "v\d+\.\d+\.\d+") {
            $NodePath = $TestPath
            Write-Host "Node.js trovato: $NodePath (versione: $TestResult)" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

# Determina quale eseguibile usare (PRIORITA': binario compilato)
if (Test-Path $ExePath) {
    Write-Host "MODALITA BINARIA: Usando local-opener.exe compilato (CONSIGLIATO)" -ForegroundColor Green
    $ServiceExePath = $ExePath
    $ServiceArgs = ""
    $UseNodeJs = $false
} elseif ($NodePath -and (Test-Path $NodeScriptPath) -and (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "MODALITA NODE.JS: Usando Node.js con dipendenze disponibili" -ForegroundColor Yellow
    Write-Host "ATTENZIONE: Verifico dipendenze Node.js..." -ForegroundColor Yellow
    $ServiceExePath = $NodePath
    $ServiceArgs = "`"$NodeScriptPath`""
    $UseNodeJs = $true
} else {
    Write-Host "ERRORE: Nessun eseguibile utilizzabile trovato!" -ForegroundColor Red
    Write-Host "- local-opener.exe exists: $(Test-Path $ExePath)" -ForegroundColor Red
    if ($NodePath) {
        Write-Host "- Node.js path: $NodePath" -ForegroundColor Red
        Write-Host "- index.js exists: $(Test-Path $NodeScriptPath)" -ForegroundColor Red  
        Write-Host "- node_modules exists: $(Test-Path (Join-Path $ScriptDir "node_modules"))" -ForegroundColor Red
    } else {
        Write-Host "- Node.js: Non trovato" -ForegroundColor Red
    }
    Write-Host "" -ForegroundColor Red
    Write-Host "SOLUZIONE: Scarica cruscotto-local-opener-setup.exe dal sito" -ForegroundColor White
    Read-Host "Premi Invio per uscire"
    exit 1
}

if (-not (Test-Path $NssmPath)) {
    Write-Host "ERRORE: nssm.exe non trovato!" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

$ServiceName = "CruscottoLocalOpener"

Write-Host "Arresto servizio esistente (se presente)..." -ForegroundColor Cyan
& $NssmPath stop $ServiceName 2>$null
& $NssmPath remove $ServiceName confirm 2>$null

Write-Host "Installazione servizio con configurazione avanzata..." -ForegroundColor Cyan

if ($UseNodeJs) {
    Write-Host "Configurazione servizio Node.js con auto-discovery avanzato..." -ForegroundColor Cyan
    & $NssmPath install $ServiceName $ServiceExePath $ServiceArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRORE durante installazione servizio Node.js!" -ForegroundColor Red
        Read-Host "Premi Invio per uscire"
        exit 1
    }
} else {
    Write-Host "Configurazione servizio binario..." -ForegroundColor Yellow
    & $NssmPath install $ServiceName $ServiceExePath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRORE durante installazione servizio!" -ForegroundColor Red
        Read-Host "Premi Invio per uscire"
        exit 1
    }
}

& $NssmPath set $ServiceName AppDirectory $ScriptDir
& $NssmPath set $ServiceName DisplayName "Cruscotto Local Opener Service"
& $NssmPath set $ServiceName Description "Servizio per aprire documenti locali da Pannello SGI - Avvio automatico all accensione PC"

Write-Host "Configurazione avvio automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName Type SERVICE_WIN32_OWN_PROCESS
& $NssmPath set $ServiceName DelayedAutoStart 1

Write-Host "Configurazione resilienza e restart automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 10000
& $NssmPath set $ServiceName AppThrottle 5000
& $NssmPath set $ServiceName AppStopMethodSkip 0
& $NssmPath set $ServiceName AppStopMethodConsole 15000
& $NssmPath set $ServiceName AppStopMethodWindow 5000
& $NssmPath set $ServiceName AppStopMethodThreads 10000

Write-Host "Configurazione migliorata per stabilita..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppNoConsole 1
& $NssmPath set $ServiceName AppAffinity All
& $NssmPath set $ServiceName AppPriority NORMAL_PRIORITY_CLASS

Write-Host "Configurazione sicurezza come utente corrente..." -ForegroundColor Cyan
# Usa l'utente corrente invece di LocalSystem per accesso alle cartelle Google Drive
$CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "   Configurazione servizio per utente: $CurrentUser" -ForegroundColor White
& $NssmPath set $ServiceName ObjectName $CurrentUser

Write-Host "Configurazione logging..." -ForegroundColor Cyan
# Usa directory utente per log accessibili dal servizio
$LogDir = "$env:APPDATA\.local-opener"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
& $NssmPath set $ServiceName AppStdout "$LogDir\service.log"
& $NssmPath set $ServiceName AppStderr "$LogDir\service-error.log"
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateSeconds 86400

Write-Host "Configurazione firewall Windows..." -ForegroundColor Cyan
netsh advfirewall firewall delete rule name="Local Opener" 2>$null | Out-Null
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 | Out-Null

Write-Host "Avvio servizio..." -ForegroundColor Cyan
& $NssmPath start $ServiceName

Write-Host ""
Write-Host "Attendo 10 secondi per verifica avvio..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Verifica stato servizio..." -ForegroundColor Cyan
$ServiceStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

# Controlla se il servizio e' in stato PAUSED e tenta di riavviarlo
if ($ServiceStatus -and $ServiceStatus.Status -eq "Paused") {
    Write-Host "Servizio in stato PAUSED - tentativo riavvio forzato..." -ForegroundColor Yellow
    & $NssmPath stop $ServiceName
    Start-Sleep -Seconds 3
    & $NssmPath start $ServiceName
    Start-Sleep -Seconds 10
    $ServiceStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
}

if ($ServiceStatus -and $ServiceStatus.Status -eq "Running") {
    Write-Host "SUCCESSO! Servizio installato e avviato correttamente" -ForegroundColor Green
    if ($UseNodeJs) {
        Write-Host "MODALITA NODE.JS ATTIVA: Auto-discovery avanzato di Google Drive abilitato!" -ForegroundColor Green
        Write-Host "Il servizio cerchera automaticamente Google Drive in TUTTE le cartelle utente" -ForegroundColor Green
    } else {
        Write-Host "MODALITA BINARIA ATTIVA: Auto-discovery Google Drive e apertura documenti ottimizzata!" -ForegroundColor Green
        Write-Host "Il servizio e stato installato nella modalita piu stabile e performante" -ForegroundColor Green
    }
    Write-Host "Il Local Opener si avviera automaticamente ad ogni accensione del PC" -ForegroundColor Green
    
    # Test connessione
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 10 -UseBasicParsing
        Write-Host "Test connessione HTTP riuscito!" -ForegroundColor Green
        
        # Prova a leggere la risposta per vedere le cartelle trovate
        try {
            $HealthData = $Response.Content | ConvertFrom-Json
            if ($HealthData.roots -and $HealthData.roots.Count -gt 0) {
                Write-Host "Cartelle Google Drive trovate automaticamente: $($HealthData.roots.Count)" -ForegroundColor Green
                foreach ($root in $HealthData.roots) {
                    Write-Host "  - $root" -ForegroundColor White
                }
            } else {
                Write-Host "Nessuna cartella trovata automaticamente - puoi aggiungerle manualmente dal frontend" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Servizio attivo, configurazione percorsi disponibile dal frontend" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Servizio avviato ma connessione HTTP non ancora pronta" -ForegroundColor Yellow
        Write-Host "Attendi qualche secondo e riprova su http://127.0.0.1:17654" -ForegroundColor Yellow
    }
} else {
    Write-Host "PROBLEMA: Servizio non avviato correttamente!" -ForegroundColor Red
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
Write-Host "STATO INSTALLAZIONE:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "URL servizio: http://127.0.0.1:17654" -ForegroundColor White
Write-Host "Log servizio: $LogDir\service.log" -ForegroundColor White
Write-Host "Manager servizi: services.msc" -ForegroundColor White
Write-Host "Diagnostica: diagnostica-servizio.bat" -ForegroundColor White
Write-Host ""

Write-Host "INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Read-Host "Premi Invio per uscire"