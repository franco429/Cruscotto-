# Script PowerShell per diagnostica completa del servizio Local Opener

Write-Host "DIAGNOSTICA CRUSCOTTO LOCAL OPENER" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$ServiceName = "CruscottoLocalOpener"
$Port = 17654
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Verifica stato servizio
Write-Host "1️⃣ VERIFICA STATO SERVIZIO" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($Service) {
    Write-Host "✅ Servizio trovato nel sistema" -ForegroundColor Green
    Write-Host "   Nome: $($Service.Name)" -ForegroundColor White
    Write-Host "   Stato: $($Service.Status)" -ForegroundColor White
    Write-Host "   Tipo avvio: $($Service.StartType)" -ForegroundColor White
    
    if ($Service.Status -eq "Running") {
        Write-Host "✅ Servizio in esecuzione" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Servizio NON in esecuzione" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Servizio NON trovato nel sistema" -ForegroundColor Red
}

Write-Host ""

# 2. Verifica processi
Write-Host "2️⃣ VERIFICA PROCESSI" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow
$Processes = Get-Process -Name "*local-opener*", "*node*" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like "*local-opener*" -or ($_.ProcessName -eq "node" -and $_.CommandLine -like "*index.js*") }

if ($Processes) {
    Write-Host "✅ Processi Local Opener trovati:" -ForegroundColor Green
    foreach ($proc in $Processes) {
        Write-Host "   PID: $($proc.Id) | Nome: $($proc.ProcessName) | Memoria: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor White
    }
} else {
    Write-Host "❌ Nessun processo Local Opener in esecuzione" -ForegroundColor Red
}

Write-Host ""

# 3. Verifica porta
Write-Host "3️⃣ VERIFICA PORTA $Port" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow
try {
    $Connection = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
    if ($Connection.TcpTestSucceeded) {
        Write-Host "✅ Porta $Port accessibile" -ForegroundColor Green
    } else {
        Write-Host "❌ Porta $Port NON accessibile" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Errore test porta: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. Test connessione HTTP
Write-Host "4️⃣ TEST CONNESSIONE HTTP" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ Connessione HTTP riuscita" -ForegroundColor Green
    Write-Host "   Status Code: $($Response.StatusCode)" -ForegroundColor White
    
    try {
        $HealthData = $Response.Content | ConvertFrom-Json
        Write-Host "   Versione: $($HealthData.version)" -ForegroundColor White
        Write-Host "   Percorsi configurati: $($HealthData.roots.Count)" -ForegroundColor White
        Write-Host "   Google Drive rilevato: $($HealthData.googleDriveDetected)" -ForegroundColor White
    } catch {
        Write-Host "⚠️ Risposta ricevuta ma formato non JSON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Connessione HTTP fallita: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. Verifica file di sistema
Write-Host "5️⃣ VERIFICA FILE DI SISTEMA" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
$FilesToCheck = @(
    @{ Path = (Join-Path $ScriptDir "index.js"); Name = "Script Node.js" },
    @{ Path = (Join-Path $ScriptDir "local-opener.exe"); Name = "Eseguibile binario" },
    @{ Path = (Join-Path $ScriptDir "nssm.exe"); Name = "NSSM Service Manager" },
    @{ Path = (Join-Path $ScriptDir "package.json"); Name = "Package.json" }
)

foreach ($file in $FilesToCheck) {
    if (Test-Path $file.Path) {
        $fileInfo = Get-Item $file.Path
        Write-Host "✅ $($file.Name): trovato ($([math]::Round($fileInfo.Length/1KB, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($file.Name): NON trovato" -ForegroundColor Red
    }
}

Write-Host ""

# 6. Verifica configurazione
Write-Host "6️⃣ VERIFICA CONFIGURAZIONE" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow
$ConfigDir = "$env:APPDATA\.local-opener"
$ConfigFile = Join-Path $ConfigDir "config.json"
$LogDir = "$env:APPDATA\.local-opener"

if (Test-Path $ConfigFile) {
    Write-Host "✅ File di configurazione trovato" -ForegroundColor Green
    try {
        $Config = Get-Content $ConfigFile | ConvertFrom-Json
        Write-Host "   Percorsi configurati: $($Config.roots.Count)" -ForegroundColor White
        if ($Config.roots.Count -gt 0) {
            Write-Host "   Percorsi:" -ForegroundColor White
            foreach ($root in $Config.roots) {
                $exists = Test-Path $root
                $status = if ($exists) { "✅" } else { "❌" }
                Write-Host "     $status $root" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "⚠️ File di configurazione corrotto" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ File di configurazione NON trovato" -ForegroundColor Yellow
}

Write-Host ""

# 7. Verifica log
Write-Host "7️⃣ VERIFICA LOG" -ForegroundColor Yellow
Write-Host "================" -ForegroundColor Yellow
$LogFiles = @(
    @{ Path = (Join-Path $LogDir "service.log"); Name = "Log servizio" },
    @{ Path = (Join-Path $LogDir "service-error.log"); Name = "Log errori" }
)

foreach ($log in $LogFiles) {
    if (Test-Path $log.Path) {
        $logInfo = Get-Item $log.Path
        Write-Host "OK $($log.Name): trovato ($([math]::Round($logInfo.Length/1KB, 2)) KB)" -ForegroundColor Green
        
        # Mostra ultime righe del log errori se presente
        if ($log.Name -eq "Log errori" -and $logInfo.Length -gt 0) {
            Write-Host "   Ultime righe log errori:" -ForegroundColor Yellow
            try {
                $lastLines = Get-Content $log.Path -Tail 5
                foreach ($line in $lastLines) {
                    Write-Host "     $line" -ForegroundColor Gray
                }
            } catch {
                Write-Host "     Impossibile leggere il log" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "INFO $($log.Name): non presente" -ForegroundColor Cyan
    }
}

Write-Host ""

# 8. Verifica Node.js (se applicabile)
Write-Host "8. VERIFICA NODE.JS" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
try {
    $NodeVersion = & node --version 2>$null
    if ($NodeVersion) {
        Write-Host "OK Node.js installato: $NodeVersion" -ForegroundColor Green
    } else {
        Write-Host "ATTENZIONE Node.js non trovato nel PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ATTENZIONE Node.js non accessibile" -ForegroundColor Yellow
}

Write-Host ""

# 9. Raccomandazioni
Write-Host "9. RACCOMANDAZIONI" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$hasIssues = $false

if (-not $Service -or $Service.Status -ne "Running") {
    Write-Host "PROBLEMA: Servizio non in esecuzione" -ForegroundColor Red
    Write-Host "   Soluzione: Esegui INSTALLA-COME-AMMINISTRATORE.bat" -ForegroundColor White
    $hasIssues = $true
}

try {
    $testConnection = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -WarningAction SilentlyContinue
    if (-not $testConnection.TcpTestSucceeded) {
        Write-Host "PROBLEMA: Porta non accessibile" -ForegroundColor Red
        Write-Host "   Soluzione: Controlla firewall e riavvia servizio" -ForegroundColor White
        $hasIssues = $true
    }
} catch {}

if (-not (Test-Path $ConfigFile)) {
    Write-Host "PROBLEMA: Configurazione mancante" -ForegroundColor Red
    Write-Host "   Soluzione: Riavvia il servizio per ricreare la configurazione" -ForegroundColor White
    $hasIssues = $true
}

if (-not $hasIssues) {
    Write-Host "TUTTO OK: Il servizio sembra funzionare correttamente!" -ForegroundColor Green
}

Write-Host ""
Write-Host "INFORMAZIONI SISTEMA" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host "Sistema operativo: $((Get-WmiObject Win32_OperatingSystem).Caption)" -ForegroundColor White
Write-Host "Architettura: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor White
Write-Host "Utente corrente: $env:USERNAME" -ForegroundColor White
Write-Host "Directory servizio: $ScriptDir" -ForegroundColor White
Write-Host "Directory configurazione: $ConfigDir" -ForegroundColor White

Write-Host ""
Write-Host "DIAGNOSTICA COMPLETATA!" -ForegroundColor Green
Read-Host "Premi Invio per uscire"
