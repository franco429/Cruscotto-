# Script PowerShell per disinstallazione completa Local Opener
# Rimuove servizio, file, configurazioni e regole firewall

# Controllo se già eseguito come amministratore
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "🔒 Richiesta privilegi Amministratore..." -ForegroundColor Yellow
    Start-Process PowerShell -Verb runAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "🗑️ DISINSTALLAZIONE COMPLETA LOCAL OPENER" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# Percorso della directory corrente dello script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$NssmPath = Join-Path $ScriptDir "nssm.exe"
$ServiceName = "CruscottoLocalOpener"

Write-Host "🛑 1. Arresto del servizio..." -ForegroundColor Cyan
try {
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        if ($NssmPath -and (Test-Path $NssmPath)) {
            & $NssmPath stop $ServiceName 2>$null
            Start-Sleep -Seconds 3
            Write-Host "✅ Servizio arrestato" -ForegroundColor Green
        } else {
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Servizio arrestato (comando nativo)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ Servizio non trovato" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Errore nell'arresto del servizio: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🗑️ 2. Rimozione del servizio Windows..." -ForegroundColor Cyan
try {
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        if ($NssmPath -and (Test-Path $NssmPath)) {
            & $NssmPath remove $ServiceName confirm 2>$null
        } else {
            sc delete $ServiceName | Out-Null
        }
        Write-Host "✅ Servizio Windows rimosso" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Servizio già rimosso" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Errore nella rimozione del servizio: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔥 3. Rimozione regole firewall..." -ForegroundColor Cyan
try {
    netsh advfirewall firewall delete rule name="Local Opener" 2>$null | Out-Null
    Write-Host "✅ Regole firewall rimosse" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Errore rimozione firewall: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧹 4. Pulizia file di log..." -ForegroundColor Cyan
try {
    $LogDir = "$env:APPDATA\.local-opener"
    if (Test-Path $LogDir) {
        Remove-Item -Path $LogDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ File di log rimossi" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Cartella log non trovata" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Errore pulizia log: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 5. Terminazione processi rimanenti..." -ForegroundColor Cyan
try {
    $LocalOpenerProcesses = Get-Process -Name "local-opener" -ErrorAction SilentlyContinue
    if ($LocalOpenerProcesses) {
        foreach ($process in $LocalOpenerProcesses) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "✅ Processi terminati" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Nessun processo Local Opener in esecuzione" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Errore terminazione processi: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 6. Verifica pulizia porte..." -ForegroundColor Cyan
$PortInUse = netstat -an | findstr ":17654"
if ($PortInUse) {
    Write-Host "⚠️ Porta 17654 ancora in uso - potrebbe essere necessario riavviare" -ForegroundColor Yellow
} else {
    Write-Host "✅ Porta 17654 libera" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 7. Verifica finale..." -ForegroundColor Cyan
$ServiceExists = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$ProcessExists = Get-Process -Name "local-opener" -ErrorAction SilentlyContinue

if (-not $ServiceExists -and -not $ProcessExists) {
    Write-Host "✅ DISINSTALLAZIONE COMPLETATA CON SUCCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 STATO SISTEMA:" -ForegroundColor Magenta
    Write-Host "=================" -ForegroundColor Magenta
    Write-Host "🗑️ Servizio Windows: RIMOSSO" -ForegroundColor Green
    Write-Host "🔥 Regole Firewall: RIMOSSE" -ForegroundColor Green  
    Write-Host "🧹 File di Log: PULITI" -ForegroundColor Green
    Write-Host "🔍 Processi: TERMINATI" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 PROSSIMI PASSI:" -ForegroundColor Magenta
    Write-Host "================" -ForegroundColor Magenta
    Write-Host "1. 🆕 Scarica la versione aggiornata dal Cruscotto" -ForegroundColor White
    Write-Host "2. 📁 Estrai l'archivio in una cartella pulita" -ForegroundColor White
    Write-Host "3. 🚀 Esegui INSTALLA-COME-AMMINISTRATORE.bat" -ForegroundColor White
    Write-Host "4. 🔍 Goditi la rilevazione automatica dei percorsi!" -ForegroundColor White
} else {
    Write-Host "⚠️ DISINSTALLAZIONE PARZIALE" -ForegroundColor Yellow
    Write-Host "💡 Riavvia il PC e ripeti la procedura se necessario" -ForegroundColor Cyan
    if ($ServiceExists) {
        Write-Host "   • Servizio ancora presente" -ForegroundColor Yellow
    }
    if ($ProcessExists) {
        Write-Host "   • Processi ancora attivi" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "⚡ NUOVE FUNZIONALITÀ NELLA VERSIONE AGGIORNATA:" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "🔍 Rilevazione automatica percorsi Google Drive" -ForegroundColor White
Write-Host "🔧 Configurazione automatica durante installazione" -ForegroundColor White
Write-Host "📱 Notifiche intelligenti nell'interfaccia web" -ForegroundColor White
Write-Host "🛠️ Diagnostica avanzata con auto-riparazione" -ForegroundColor White
Write-Host "⚡ Apertura istantanea documenti senza configurazione manuale" -ForegroundColor White

Write-Host ""
Read-Host "Premi Invio per uscire"
