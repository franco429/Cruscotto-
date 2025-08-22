# Script PowerShell per diagnostica completa Cruscotto Local Opener
# Versione ottimizzata per troubleshooting avanzato

Write-Host "DIAGNOSTICA CRUSCOTTO LOCAL OPENER - COMPLETA" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

$ServiceName = "CruscottoLocalOpener"
$ServicePort = 17654
$ServiceUrl = "http://127.0.0.1:$ServicePort"

# Funzione per test HTTP con timeout
function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutSec = 10)
    try {
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return @{
            Success = $true
            StatusCode = $Response.StatusCode
            Content = $Response.Content
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $null
        }
    }
}

# 1. VERIFICA STATO SERVIZIO
Write-Host "1. VERIFICA STATO SERVIZIO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($Service) {
    Write-Host "   OK Servizio trovato nel sistema" -ForegroundColor Green
    Write-Host "   Nome: $($Service.Name)" -ForegroundColor White
    Write-Host "   Stato: $($Service.Status)" -ForegroundColor $(if($Service.Status -eq "Running") {"Green"} else {"Yellow"})
    Write-Host "   Tipo avvio: $($Service.StartType)" -ForegroundColor White
    
    if ($Service.Status -eq "Running") {
        Write-Host "   SERVIZIO ATTIVO ✓" -ForegroundColor Green
    } else {
        Write-Host "   SERVIZIO NON ATTIVO ✗" -ForegroundColor Red
    }
} else {
    Write-Host "   ERRORE: Servizio non trovato!" -ForegroundColor Red
    Write-Host "   Il servizio potrebbe non essere installato" -ForegroundColor Yellow
}

# 2. VERIFICA PROCESSI IN ESECUZIONE
Write-Host ""
Write-Host "2. VERIFICA PROCESSI IN ESECUZIONE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$Processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*local-opener*" -or 
    $_.ProcessName -like "*node*" -and $_.CommandLine -like "*index.js*"
}

if ($Processes) {
    Write-Host "   OK Processi Local Opener trovati:" -ForegroundColor Green
    foreach ($proc in $Processes) {
        Write-Host "   - PID: $($proc.Id) | Nome: $($proc.ProcessName) | Memoria: $([math]::Round($proc.WorkingSet64/1MB))MB" -ForegroundColor White
    }
} else {
    Write-Host "   ATTENZIONE: Nessun processo Local Opener in esecuzione" -ForegroundColor Yellow
}

# 3. TEST CONNESSIONE HTTP
Write-Host ""
Write-Host "3. TEST CONNESSIONE HTTP" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

Write-Host "   Test endpoint principale: $ServiceUrl" -ForegroundColor White
$MainTest = Test-HttpEndpoint -Url $ServiceUrl
if ($MainTest.Success) {
    Write-Host "   OK Servizio HTTP attivo ✓" -ForegroundColor Green
    Write-Host "   Status Code: $($MainTest.StatusCode)" -ForegroundColor White
} else {
    Write-Host "   ERRORE: Servizio HTTP non raggiungibile ✗" -ForegroundColor Red
    Write-Host "   Errore: $($MainTest.Error)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "   Test endpoint health: $ServiceUrl/health" -ForegroundColor White
$HealthTest = Test-HttpEndpoint -Url "$ServiceUrl/health"
if ($HealthTest.Success) {
    Write-Host "   OK Endpoint health attivo ✓" -ForegroundColor Green
    try {
        $HealthData = $HealthTest.Content | ConvertFrom-Json
        Write-Host "   Versione: $($HealthData.version)" -ForegroundColor White
        Write-Host "   Cartelle configurate: $($HealthData.roots.Count)" -ForegroundColor White
        Write-Host "   Google Drive rilevato: $($HealthData.googleDriveDetected)" -ForegroundColor $(if($HealthData.googleDriveDetected) {"Green"} else {"Yellow"})
        
        if ($HealthData.roots -and $HealthData.roots.Count -gt 0) {
            Write-Host "   Percorsi Google Drive configurati:" -ForegroundColor Green
            foreach ($root in $HealthData.roots) {
                Write-Host "     - $root" -ForegroundColor White
            }
        } else {
            Write-Host "   ATTENZIONE: Nessun percorso Google Drive configurato" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   Risposta health ricevuta ma non parsabile" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERRORE: Endpoint health non raggiungibile ✗" -ForegroundColor Red
}

# 4. VERIFICA PORTA DI RETE
Write-Host ""
Write-Host "4. VERIFICA PORTA DI RETE" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

try {
    $NetStats = netstat -an | Select-String ":$ServicePort"
    if ($NetStats) {
        Write-Host "   OK Porta $ServicePort in ascolto ✓" -ForegroundColor Green
        foreach ($line in $NetStats) {
            Write-Host "   $line" -ForegroundColor White
        }
    } else {
        Write-Host "   ERRORE: Porta $ServicePort non in ascolto ✗" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERRORE: Impossibile verificare stato porta" -ForegroundColor Red
}

# 5. VERIFICA FIREWALL
Write-Host ""
Write-Host "5. VERIFICA FIREWALL WINDOWS" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

try {
    $FirewallRules = netsh advfirewall firewall show rule name="Local Opener" 2>$null
    if ($FirewallRules -and $FirewallRules -notlike "*No rules*") {
        Write-Host "   OK Regola firewall 'Local Opener' configurata ✓" -ForegroundColor Green
    } else {
        Write-Host "   ATTENZIONE: Regola firewall 'Local Opener' non trovata" -ForegroundColor Yellow
        Write-Host "   Il firewall potrebbe bloccare le connessioni" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERRORE: Impossibile verificare stato firewall" -ForegroundColor Red
}

# 6. VERIFICA FILE DI CONFIGURAZIONE
Write-Host ""
Write-Host "6. VERIFICA FILE DI CONFIGURAZIONE" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$ConfigDir = "$env:APPDATA\.local-opener"
$ConfigFile = "$ConfigDir\config.json"

if (Test-Path $ConfigDir) {
    Write-Host "   OK Directory configurazione trovata: $ConfigDir ✓" -ForegroundColor Green
    
    if (Test-Path $ConfigFile) {
        Write-Host "   OK File configurazione trovato ✓" -ForegroundColor Green
        try {
            $Config = Get-Content $ConfigFile | ConvertFrom-Json
            Write-Host "   Percorsi configurati nel file: $($Config.roots.Count)" -ForegroundColor White
        } catch {
            Write-Host "   ATTENZIONE: File configurazione non parsabile" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   INFO: File configurazione non ancora creato" -ForegroundColor Cyan
    }
} else {
    Write-Host "   INFO: Directory configurazione non ancora creata" -ForegroundColor Cyan
}

# 7. VERIFICA LOG
Write-Host ""
Write-Host "7. VERIFICA LOG SERVIZIO" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$LogDir = "$env:APPDATA\.local-opener"
$ServiceLog = "$LogDir\service.log"
$ErrorLog = "$LogDir\service-error.log"

if (Test-Path $ServiceLog) {
    Write-Host "   OK Log servizio trovato: $ServiceLog ✓" -ForegroundColor Green
    $LogSize = (Get-Item $ServiceLog).Length
    Write-Host "   Dimensione log: $([math]::Round($LogSize/1KB, 2))KB" -ForegroundColor White
    
    # Mostra le ultime 5 righe del log
    try {
        $LastLines = Get-Content $ServiceLog -Tail 5 -ErrorAction SilentlyContinue
        if ($LastLines) {
            Write-Host "   Ultime righe del log:" -ForegroundColor White
            foreach ($line in $LastLines) {
                Write-Host "     $line" -ForegroundColor Gray
            }
        }
    } catch {}
} else {
    Write-Host "   INFO: Log servizio non ancora creato" -ForegroundColor Cyan
}

if (Test-Path $ErrorLog) {
    Write-Host "   ATTENZIONE: Log errori trovato: $ErrorLog" -ForegroundColor Yellow
    $ErrorLogSize = (Get-Item $ErrorLog).Length
    if ($ErrorLogSize -gt 0) {
        Write-Host "   Dimensione log errori: $([math]::Round($ErrorLogSize/1KB, 2))KB" -ForegroundColor Yellow
        Write-Host "   Controlla il file per errori dettagliati" -ForegroundColor Yellow
    }
}

# 8. TEST AUTO-DISCOVERY GOOGLE DRIVE
Write-Host ""
Write-Host "8. TEST AUTO-DISCOVERY GOOGLE DRIVE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AutoDetectScript = Join-Path $ScriptDir "auto-detect-google-drive.ps1"

if (Test-Path $AutoDetectScript) {
    Write-Host "   OK Script auto-detect trovato ✓" -ForegroundColor Green
    Write-Host "   Esecuzione test auto-discovery..." -ForegroundColor White
    
    try {
        $AutoDetectResult = & $AutoDetectScript -Silent $true
        if ($AutoDetectResult -and $AutoDetectResult.Success) {
            Write-Host "   OK Auto-discovery completato ✓" -ForegroundColor Green
            Write-Host "   Percorsi trovati: $($AutoDetectResult.Count)" -ForegroundColor White
            if ($AutoDetectResult.ValidPaths) {
                foreach ($path in $AutoDetectResult.ValidPaths) {
                    Write-Host "     - $path" -ForegroundColor White
                }
            }
        } else {
            Write-Host "   ATTENZIONE: Auto-discovery non ha trovato percorsi" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERRORE: Impossibile eseguire auto-discovery: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ERRORE: Script auto-detect non trovato ✗" -ForegroundColor Red
}

# 9. RIEPILOGO E SUGGERIMENTI
Write-Host ""
Write-Host "9. RIEPILOGO E SUGGERIMENTI" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$Issues = @()
if (-not $Service) { $Issues += "Servizio non installato" }
elseif ($Service.Status -ne "Running") { $Issues += "Servizio non in esecuzione" }
if (-not $MainTest.Success) { $Issues += "Servizio HTTP non raggiungibile" }
if (-not $Processes) { $Issues += "Nessun processo Local Opener attivo" }

if ($Issues.Count -eq 0) {
    Write-Host "   STATO: TUTTO OK ✓" -ForegroundColor Green
    Write-Host "   Il servizio Local Opener è installato e funzionante correttamente" -ForegroundColor Green
} else {
    Write-Host "   STATO: PROBLEMI RILEVATI ✗" -ForegroundColor Red
    Write-Host "   Problemi trovati:" -ForegroundColor Yellow
    foreach ($issue in $Issues) {
        Write-Host "     - $issue" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "   SOLUZIONI SUGGERITE:" -ForegroundColor Cyan
    Write-Host "   1. Riavvia il PC completamente" -ForegroundColor White
    Write-Host "   2. Esegui 'INSTALLA-COME-AMMINISTRATORE.bat' come amministratore" -ForegroundColor White
    Write-Host "   3. Verifica che Google Drive sia installato e configurato" -ForegroundColor White
    Write-Host "   4. Controlla i log in: $LogDir" -ForegroundColor White
    Write-Host "   5. Disabilita temporaneamente antivirus/firewall per test" -ForegroundColor White
}

Write-Host ""
Write-Host "DIAGNOSTICA COMPLETATA!" -ForegroundColor Green
Write-Host "URL servizio: $ServiceUrl" -ForegroundColor Cyan
Write-Host "Directory log: $LogDir" -ForegroundColor Cyan
Write-Host ""

Read-Host "Premi Invio per uscire"
