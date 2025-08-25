# diagnostica-avanzata.ps1
# Script di diagnostica avanzata per identificare problemi specifici

Write-Host "🔍 DIAGNOSTICA AVANZATA CRUSCOTTO LOCAL OPENER" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verifica privilegi amministratore
Write-Host "1. VERIFICA PRIVILEGI AMMINISTRATORE" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "   ✅ Privilegi amministratore verificati" -ForegroundColor Green
} else {
    Write-Host "   ❌ Privilegi amministratore INSUFFICIENTI" -ForegroundColor Red
    Write-Host "   Esegui questo script come amministratore!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verifica file necessari
Write-Host "2. VERIFICA FILE NECESSARI" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

$requiredFiles = @(
    "local-opener.exe",
    "nssm.exe"
)

$allFilesPresent = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host "   ✅ $file ($sizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file NON TROVATO" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (!$allFilesPresent) {
    Write-Host "   ❌ File mancanti rilevati!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verifica servizio esistente
Write-Host "3. VERIFICA SERVIZIO ESISTENTE" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

$serviceName = "CruscottoLocalOpener"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "   ⚠️ Servizio esistente trovato:" -ForegroundColor Yellow
    Write-Host "      Nome: $($existingService.Name)" -ForegroundColor White
    Write-Host "      Stato: $($existingService.Status)" -ForegroundColor White
    Write-Host "      Tipo Avvio: $($existingService.StartType)" -ForegroundColor White
    
    # Verifica configurazione NSSM
    if (Test-Path "nssm.exe") {
        Write-Host "      Configurazione NSSM:" -ForegroundColor White
        $nssmConfig = & ".\nssm.exe" dump $serviceName 2>$null
        if ($nssmConfig) {
            $nssmConfig | ForEach-Object { Write-Host "        $_" -ForegroundColor Gray }
        } else {
            Write-Host "        ❌ Configurazione NSSM non leggibile" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ✅ Nessun servizio esistente trovato" -ForegroundColor Green
}

Write-Host ""

# Verifica processi in esecuzione
Write-Host "4. VERIFICA PROCESSI IN ESECUZIONE" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*local-opener*" -or 
    $_.ProcessName -like "*node*" -and $_.CommandLine -like "*index.js*"
}

if ($processes) {
    Write-Host "   ⚠️ Processi Local Opener trovati:" -ForegroundColor Yellow
    foreach ($proc in $processes) {
        $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        Write-Host "      PID: $($proc.Id) | Nome: $($proc.ProcessName) | Memoria: $memoryMB MB" -ForegroundColor White
    }
} else {
    Write-Host "   ✅ Nessun processo Local Opener in esecuzione" -ForegroundColor Green
}

Write-Host ""

# Verifica porta 17654
Write-Host "5. VERIFICA PORTA 17654" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

$connection = Test-NetConnection -ComputerName localhost -Port 17654 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "   ❌ Porta 17654 già in uso!" -ForegroundColor Red
    Write-Host "   Potrebbe essere bloccata da un altro processo" -ForegroundColor Red
    
    # Identifica processo che usa la porta
    $netstat = netstat -ano | Select-String ":17654"
    if ($netstat) {
        Write-Host "   Processi che usano la porta 17654:" -ForegroundColor Yellow
        $netstat | ForEach-Object { Write-Host "      $_" -ForegroundColor White }
    }
} else {
    Write-Host "   ✅ Porta 17654 libera" -ForegroundColor Green
}

Write-Host ""

# Verifica firewall
Write-Host "6. VERIFICA FIREWALL" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

$firewallRules = Get-NetFirewallRule -DisplayName "*Local Opener*" -ErrorAction SilentlyContinue
if ($firewallRules) {
    Write-Host "   ⚠️ Regole firewall esistenti trovate:" -ForegroundColor Yellow
    foreach ($rule in $firewallRules) {
        Write-Host "      Nome: $($rule.DisplayName) | Stato: $($rule.Enabled)" -ForegroundColor White
    }
} else {
    Write-Host "   ✅ Nessuna regola firewall esistente" -ForegroundColor Green
}

Write-Host ""

# Verifica permessi directory
Write-Host "7. VERIFICA PERMESSI DIRECTORY" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

$installPath = "$env:ProgramFiles\CruscottoLocalOpener"
$configPath = "$env:APPDATA\.local-opener"

Write-Host "   Directory di installazione: $installPath" -ForegroundColor White
if (Test-Path $installPath) {
    try {
        $acl = Get-Acl $installPath
        Write-Host "      ✅ Accesso in lettura/scrittura" -ForegroundColor Green
    } catch {
        Write-Host "      ❌ Problemi di accesso: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "      ⚠️ Directory non esistente (verrà creata)" -ForegroundColor Yellow
}

Write-Host "   Directory configurazione: $configPath" -ForegroundColor White
if (Test-Path $configPath) {
    try {
        $acl = Get-Acl $configPath
        Write-Host "      ✅ Accesso in lettura/scrittura" -ForegroundColor Green
    } catch {
        Write-Host "      ❌ Problemi di accesso: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "      ⚠️ Directory non esistente (verrà creata)" -ForegroundColor Yellow
}

Write-Host ""

# Test NSSM
Write-Host "8. TEST NSSM.EXE" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow

if (Test-Path "nssm.exe") {
    try {
        $nssmVersion = & ".\nssm.exe" version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ NSSM funzionante: $nssmVersion" -ForegroundColor Green
        } else {
            Write-Host "   ❌ NSSM non funzionante: $nssmVersion" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Errore test NSSM: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ NSSM.exe non trovato" -ForegroundColor Red
}

Write-Host ""

# Test local-opener.exe
Write-Host "9. TEST LOCAL-OPENER.EXE" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

if (Test-Path "local-opener.exe") {
    try {
        $fileInfo = Get-Item "local-opener.exe"
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "   ✅ File valido: $sizeMB MB" -ForegroundColor Green
        Write-Host "      Data creazione: $($fileInfo.CreationTime)" -ForegroundColor White
        Write-Host "      Ultima modifica: $($fileInfo.LastWriteTime)" -ForegroundColor White
    } catch {
        Write-Host "   ❌ Errore lettura file: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ local-opener.exe non trovato" -ForegroundColor Red
}

Write-Host ""

# Riepilogo e suggerimenti
Write-Host "🔍 RIEPILOGO DIAGNOSTICA" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

$issues = @()

if (!$isAdmin) { $issues += "Privilegi amministratore insufficienti" }
if (!$allFilesPresent) { $issues += "File mancanti" }
if ($connection.TcpTestSucceeded) { $issues += "Porta 17654 già in uso" }

if ($issues.Count -eq 0) {
    Write-Host "   ✅ TUTTO OK! Nessun problema rilevato" -ForegroundColor Green
    Write-Host "   Puoi procedere con l'installazione" -ForegroundColor Green
} else {
    Write-Host "   ❌ PROBLEMI RILEVATI:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "      • $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "   🔧 SUGGERIMENTI:" -ForegroundColor Yellow
    if ($issues -contains "Privilegi amministratore insufficienti") {
        Write-Host "      • Esegui questo script come amministratore" -ForegroundColor Yellow
    }
    if ($issues -contains "File mancanti") {
        Write-Host "      • Verifica che tutti i file siano nella stessa cartella" -ForegroundColor Yellow
    }
    if ($issues -contains "Porta 17654 già in uso") {
        Write-Host "      • Termina i processi che usano la porta 17654" -ForegroundColor Yellow
        Write-Host "      • Riavvia il PC se necessario" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Diagnostica completata. Premi un tasto per chiudere." -ForegroundColor Cyan
Read-Host
