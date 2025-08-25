# disinstalla-avanzata.ps1
# Disinstallazione avanzata del servizio CruscottoLocalOpener
# Versione 2.0.0 - PowerShell avanzato

param(
    [switch]$Silent = $false,
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# Abilita modalità verbose se richiesta
if ($Verbose) {
    $VerbosePreference = "Continue"
    Write-Verbose "Modalità verbose abilitata"
}

# Funzione per logging
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
}

Write-Host "🗑️ DISINSTALLAZIONE AVANZATA CRUSCOTTO LOCAL OPENER" -ForegroundColor Red
Write-Host "=====================================================" -ForegroundColor Red
Write-Host "Versione 2.0.0 - PowerShell Avanzato" -ForegroundColor Red
Write-Host ""

# 1. VERIFICA PRIVILEGI
Write-Log "Verifica privilegi amministratore..." "SETUP" "Yellow"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Privilegi amministratore insufficienti!" -ForegroundColor Red
    Write-Host "Esegui questo script come amministratore." -ForegroundColor Yellow
    exit 1
}

Write-Log "✓ Privilegi amministratore verificati" "SETUP" "Green"

# 2. VERIFICA STATO SERVIZIO
Write-Host "`n🔍 VERIFICA STATO SERVIZIO" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$serviceName = "CruscottoLocalOpener"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    Write-Log "✓ Servizio trovato: $($service.Name)" "SERVICE" "Green"
    Write-Log "📊 Stato: $($service.Status)" "SERVICE" "White"
    Write-Log "🚀 Tipo avvio: $($service.StartType)" "SERVICE" "White"
    
    if ($service.Status -eq 'Running') {
        Write-Log "⏹️ Fermando servizio..." "SERVICE" "Yellow"
        try {
            Stop-Service -Name $serviceName -Force
            Start-Sleep -Seconds 3
            Write-Log "✓ Servizio fermato" "SERVICE" "Green"
        } catch {
            Write-Log "⚠ Errore fermata servizio: $($_.Exception.Message)" "ERROR" "Yellow"
        }
    }
} else {
    Write-Log "⚠ Servizio non trovato" "SERVICE" "Yellow"
}

# 3. DISINSTALLAZIONE SERVIZIO
Write-Host "`n🗑️ DISINSTALLAZIONE SERVIZIO" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Metodo 1: NSSM se disponibile
$nssmPath = "$PSScriptRoot\nssm.exe"
if (Test-Path $nssmPath) {
    Write-Log "🔧 Rimozione con NSSM..." "NSSM" "Yellow"
    try {
        & $nssmPath remove $serviceName confirm
        Write-Log "✓ Servizio rimosso con NSSM" "NSSM" "Green"
    } catch {
        Write-Log "⚠ Errore rimozione NSSM: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "⚠ NSSM non trovato, uso SC.exe" "NSSM" "Yellow"
}

# Metodo 2: SC.exe
Write-Log "🔧 Rimozione con SC.exe..." "SC" "Yellow"
try {
    $result = sc.exe delete $serviceName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "✓ Servizio rimosso con SC.exe" "SC" "Green"
    } else {
        Write-Log "⚠ Errore rimozione SC.exe: $result" "ERROR" "Yellow"
    }
} catch {
    Write-Log "⚠ Errore esecuzione SC.exe: $($_.Exception.Message)" "ERROR" "Yellow"
}

# 4. PULIZIA FILE E DIRECTORY
Write-Host "`n🧹 PULIZIA FILE E DIRECTORY" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Directory sistema
$systemDir = "$env:ProgramFiles\CruscottoLocalOpener"
if (Test-Path $systemDir) {
    Write-Log "📁 Rimozione directory sistema: $systemDir" "CLEANUP" "Yellow"
    try {
        Remove-Item -Path $systemDir -Recurse -Force
        Write-Log "✓ Directory sistema rimossa" "CLEANUP" "Green"
    } catch {
        Write-Log "⚠ Errore rimozione directory sistema: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "✓ Directory sistema non trovata" "CLEANUP" "Green"
}

# Configurazioni utente
$userConfigDir = "$env:APPDATA\.local-opener"
if (Test-Path $userConfigDir) {
    Write-Log "📁 Rimozione configurazioni utente: $userConfigDir" "CLEANUP" "Yellow"
    try {
        Remove-Item -Path $userConfigDir -Recurse -Force
        Write-Log "✓ Configurazioni utente rimosse" "CLEANUP" "Green"
    } catch {
        Write-Log "⚠ Errore rimozione configurazioni utente: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "✓ Configurazioni utente non trovate" "CLEANUP" "Green"
}

# 5. PULIZIA AVVIO AUTOMATICO
Write-Host "`n🔄 PULIZIA AVVIO AUTOMATICO" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Task Scheduler
$tasks = @("CruscottoLocalOpenerBackup", "CruscottoLocalOpenerUser")
foreach ($taskName in $tasks) {
    try {
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($task) {
            Write-Log "🔧 Rimozione task: $taskName" "TASK" "Yellow"
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Log "✓ Task rimosso: $taskName" "TASK" "Green"
        }
    } catch {
        Write-Log "⚠ Errore rimozione task $taskName: $($_.Exception.Message)" "ERROR" "Yellow"
    }
}

# Registro Windows
Write-Log "🔧 Pulizia registro Windows..." "REGISTRY" "Yellow"
try {
    # HKLM
    Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
    # HKCU
    Remove-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "CruscottoLocalOpenerUser" -ErrorAction SilentlyContinue
    Write-Log "✓ Registro Windows pulito" "REGISTRY" "Green"
} catch {
    Write-Log "⚠ Errore pulizia registro: $($_.Exception.Message)" "ERROR" "Yellow"
}

# Startup folder
$startupScript = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\CruscottoLocalOpener.bat"
if (Test-Path $startupScript) {
    Write-Log "🔧 Rimozione startup folder..." "STARTUP" "Yellow"
    try {
        Remove-Item -Path $startupScript -Force
        Write-Log "✓ Startup folder pulito" "STARTUP" "Green"
    } catch {
        Write-Log "⚠ Errore rimozione startup folder: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "✓ Startup folder già pulito" "STARTUP" "Green"
}

# 6. TERMINAZIONE PROCESSI
Write-Host "`n🧪 TERMINAZIONE PROCESSI" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$processes = Get-Process -Name "local-opener" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Log "🔧 Terminazione processi attivi..." "PROCESS" "Yellow"
    try {
        $processes | Stop-Process -Force
        Write-Log "✓ Processi terminati: $($processes.Count)" "PROCESS" "Green"
    } catch {
        Write-Log "⚠ Errore terminazione processi: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "✓ Nessun processo attivo trovato" "PROCESS" "Green"
}

# 7. VERIFICA PORTA
Write-Host "`n🔍 VERIFICA PORTA 17654" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $connection = Test-NetConnection -ComputerName localhost -Port 17654 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Log "⚠ Porta 17654 ancora in uso!" "PORT" "Yellow"
        Write-Log "🔧 Identificazione processo..." "PORT" "Yellow"
        
        $netstat = netstat -ano | Select-String ":17654"
        if ($netstat) {
            $netstat | ForEach-Object { Write-Log "   $_" "PORT" "White" }
        }
        
        Write-Log "💡 Riavvia il PC per completare la pulizia" "PORT" "Yellow"
    } else {
        Write-Log "✓ Porta 17654 libera" "PORT" "Green"
    }
} catch {
    Write-Log "⚠ Errore verifica porta: $($_.Exception.Message)" "ERROR" "Yellow"
}

# 8. PULIZIA FINALE
Write-Host "`n🧹 PULIZIA FINALE" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

# File temporanei
$tempFiles = Get-ChildItem -Path $env:TEMP -Name "local-opener*" -ErrorAction SilentlyContinue
if ($tempFiles) {
    Write-Log "📁 Rimozione file temporanei..." "CLEANUP" "Yellow"
    try {
        $tempFiles | ForEach-Object { Remove-Item -Path "$env:TEMP\$_" -Force -ErrorAction SilentlyContinue }
        Write-Log "✓ File temporanei rimossi: $($tempFiles.Count)" "CLEANUP" "Green"
    } catch {
        Write-Log "⚠ Errore rimozione file temporanei: $($_.Exception.Message)" "ERROR" "Yellow"
    }
} else {
    Write-Log "✓ Nessun file temporaneo trovato" "CLEANUP" "Green"
}

# Firewall
Write-Log "🔧 Rimozione regole firewall..." "FIREWALL" "Yellow"
try {
    Remove-NetFirewallRule -DisplayName "Cruscotto Local Opener" -ErrorAction SilentlyContinue
    Write-Log "✓ Regole firewall rimosse" "FIREWALL" "Green"
} catch {
    Write-Log "⚠ Errore rimozione firewall: $($_.Exception.Message)" "ERROR" "Yellow"
}

# 9. RISULTATO FINALE
Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "  DISINSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

Write-Log "✅ Servizio CruscottoLocalOpener rimosso" "SUCCESS" "Green"
Write-Log "✅ File di sistema eliminati" "SUCCESS" "Green"
Write-Log "✅ Configurazioni utente pulite" "SUCCESS" "Green"
Write-Log "✅ Avvio automatico disabilitato" "SUCCESS" "Green"
Write-Log "✅ Processi terminati" "SUCCESS" "Green"
Write-Log "✅ Firewall pulito" "SUCCESS" "Green"

Write-Host "`n💡 PROSSIMI PASSI:" -ForegroundColor Cyan
Write-Host "  1. Riavvia il PC per completare la pulizia" -ForegroundColor White
Write-Host "  2. Se necessario, reinstallare con installer-definitivo.ps1" -ForegroundColor White

Write-Host "`n🔧 VERIFICA POST-DISINSTALLAZIONE:" -ForegroundColor Yellow
Write-Host "  • Controlla Services.msc (servizio non deve essere presente)" -ForegroundColor White
Write-Host "  • Verifica che la porta 17654 sia libera" -ForegroundColor White
Write-Host "  • Controlla che non ci siano processi local-opener.exe" -ForegroundColor White

if (-not $Silent) {
    Write-Host "`nPremi INVIO per chiudere..." -ForegroundColor Cyan
    Read-Host
}
