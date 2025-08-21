# Script PowerShell per disinstallare completamente Local Opener
# Richiede automaticamente privilegi amministratore

# Controllo se gia eseguito come amministratore
$currentPrincipal = [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
$adminRole = [Security.Principal.WindowsBuiltInRole] "Administrator"
$isAdmin = $currentPrincipal.IsInRole($adminRole)

if (-NOT $isAdmin) {
    Write-Host "Richiesta privilegi Amministratore per disinstallazione..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Definition
    Start-Process PowerShell -Verb runAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit
}

Write-Host "DISINSTALLAZIONE CRUSCOTTO LOCAL OPENER" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Red
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$NssmPath = Join-Path $ScriptDir "nssm.exe"
$ServiceName = "CruscottoLocalOpener"

if (-not (Test-Path $NssmPath)) {
    Write-Host "AVVISO: nssm.exe non trovato, utilizzo comandi Windows standard" -ForegroundColor Yellow
}

Write-Host "Arresto servizio Local Opener..." -ForegroundColor Yellow
if (Test-Path $NssmPath) {
    & $NssmPath stop $ServiceName 2>$null | Out-Null
} else {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue | Out-Null
    sc.exe stop $ServiceName 2>$null | Out-Null
}

Start-Sleep -Seconds 3

Write-Host "Rimozione servizio dal sistema..." -ForegroundColor Yellow
if (Test-Path $NssmPath) {
    & $NssmPath remove $ServiceName confirm 2>$null | Out-Null
} else {
    sc.exe delete $ServiceName 2>$null | Out-Null
}

Write-Host "Rimozione regole firewall..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Local Opener" 2>$null | Out-Null

Write-Host "Verifica rimozione..." -ForegroundColor Cyan
$ServiceCheck = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($ServiceCheck) {
    Write-Host "ATTENZIONE: Il servizio e ancora presente nel sistema" -ForegroundColor Yellow
    Write-Host "Tentativo rimozione forzata..." -ForegroundColor Yellow
    
    # Tentativo di rimozione forzata
    Start-Process -FilePath "sc.exe" -ArgumentList "delete", $ServiceName -Wait -NoNewWindow -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    $ServiceCheck = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if ($ServiceCheck) {
        Write-Host "ERRORE: Impossibile rimuovere completamente il servizio" -ForegroundColor Red
        Write-Host "Potrebbe essere necessario riavviare il PC per completare la rimozione" -ForegroundColor Yellow
    } else {
        Write-Host "Servizio rimosso con successo dopo tentativo forzato" -ForegroundColor Green
    }
} else {
    Write-Host "Servizio rimosso con successo" -ForegroundColor Green
}

Write-Host ""
Write-Host "Gestione file di configurazione..." -ForegroundColor Cyan
$ConfigDir = "$env:APPDATA\.local-opener"
$LogDir = "$env:APPDATA\.local-opener"

if (Test-Path $ConfigDir) {
    Write-Host "Trovata directory di configurazione: $ConfigDir" -ForegroundColor White
    $RemoveConfig = Read-Host "Vuoi rimuovere anche i file di configurazione? (s/N)"
    
    if ($RemoveConfig -eq "s" -or $RemoveConfig -eq "S" -or $RemoveConfig -eq "si" -or $RemoveConfig -eq "SI") {
        try {
            Remove-Item -Path $ConfigDir -Recurse -Force
            Write-Host "OK File di configurazione rimossi" -ForegroundColor Green
        } catch {
            Write-Host "ATTENZIONE: Impossibile rimuovere alcuni file di configurazione: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "INFO: File di configurazione mantenuti in: $ConfigDir" -ForegroundColor Cyan
    }
} else {
    Write-Host "INFO: Nessun file di configurazione trovato" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "RISULTATO DISINSTALLAZIONE:" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta

# Verifica finale
$FinalServiceCheck = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$ProcessCheck = Get-Process -Name "local-opener*" -ErrorAction SilentlyContinue

if (-not $FinalServiceCheck -and -not $ProcessCheck) {
    Write-Host "DISINSTALLAZIONE COMPLETATA CON SUCCESSO!" -ForegroundColor Green
    Write-Host "Il servizio Local Opener e stato rimosso completamente" -ForegroundColor Green
    Write-Host "Nessun processo Local Opener in esecuzione" -ForegroundColor Green
} else {
    Write-Host "DISINSTALLAZIONE PARZIALE" -ForegroundColor Yellow
    if ($FinalServiceCheck) {
        Write-Host "- Servizio ancora presente nel sistema" -ForegroundColor Yellow
    }
    if ($ProcessCheck) {
        Write-Host "- Processi Local Opener ancora in esecuzione" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "AZIONI CONSIGLIATE:" -ForegroundColor Magenta
    Write-Host "1. Riavvia il PC per completare la rimozione" -ForegroundColor White
    Write-Host "2. Controlla manualmente in services.msc" -ForegroundColor White
    Write-Host "3. Termina manualmente i processi local-opener nel Task Manager" -ForegroundColor White
}

Write-Host ""
Write-Host "DISINSTALLAZIONE TERMINATA!" -ForegroundColor Green
Read-Host "Premi Invio per uscire"
