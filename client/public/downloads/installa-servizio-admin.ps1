# Script PowerShell per installare automaticamente Local Opener come servizio
# Richiede automaticamente privilegi amministratore

# Controllo se già eseguito come amministratore
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "🔒 Richiesta privilegi Amministratore..." -ForegroundColor Yellow
    Start-Process PowerShell -Verb runAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "🚀 INSTALLAZIONE CRUSCOTTO LOCAL OPENER - AVVIO AUTOMATICO" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

# Percorso della directory corrente dello script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ExePath = Join-Path $ScriptDir "local-opener.exe"
$NssmPath = Join-Path $ScriptDir "nssm.exe"

# Verifica file necessari
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ ERRORE: local-opener.exe non trovato!" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

if (-not (Test-Path $NssmPath)) {
    Write-Host "❌ ERRORE: nssm.exe non trovato!" -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

$ServiceName = "CruscottoLocalOpener"

Write-Host "🛑 Arresto servizio esistente (se presente)..." -ForegroundColor Cyan
& $NssmPath stop $ServiceName 2>$null
& $NssmPath remove $ServiceName confirm 2>$null

Write-Host "🔧 Installazione servizio con configurazione avanzata..." -ForegroundColor Cyan
& $NssmPath install $ServiceName $ExePath
& $NssmPath set $ServiceName AppDirectory $ScriptDir
& $NssmPath set $ServiceName DisplayName "Cruscotto Local Opener Service"
& $NssmPath set $ServiceName Description "Servizio per aprire documenti locali da Cruscotto SGI - Avvio automatico all'accensione PC"

Write-Host "⚙️ Configurazione avvio automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName Type SERVICE_WIN32_OWN_PROCESS
& $NssmPath set $ServiceName DelayedAutoStart 1

Write-Host "🔄 Configurazione resilienza e restart automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 10000
& $NssmPath set $ServiceName AppThrottle 5000
& $NssmPath set $ServiceName AppStopMethodConsole 15000

Write-Host "🔐 Configurazione sicurezza..." -ForegroundColor Cyan
& $NssmPath set $ServiceName ObjectName LocalSystem

Write-Host "📝 Configurazione logging..." -ForegroundColor Cyan
$LogDir = "$env:APPDATA\.local-opener"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
& $NssmPath set $ServiceName AppStdout "$LogDir\service.log"
& $NssmPath set $ServiceName AppStderr "$LogDir\service-error.log"
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateSeconds 86400

Write-Host "🌐 Configurazione firewall Windows..." -ForegroundColor Cyan
netsh advfirewall firewall delete rule name="Local Opener" 2>$null | Out-Null
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 | Out-Null

Write-Host "🚀 Avvio servizio..." -ForegroundColor Cyan
& $NssmPath start $ServiceName

Write-Host ""
Write-Host "⏳ Attendo 5 secondi per verifica avvio..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🔍 Verifica stato servizio..." -ForegroundColor Cyan
$ServiceStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($ServiceStatus -and $ServiceStatus.Status -eq "Running") {
    Write-Host "✅ SUCCESSO! Servizio installato e avviato correttamente" -ForegroundColor Green
    Write-Host "🎉 Il Local Opener si avvierà automaticamente ad ogni accensione del PC" -ForegroundColor Green
    
    # Test connessione
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ Test connessione HTTP riuscito!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Servizio avviato ma connessione HTTP non ancora pronta" -ForegroundColor Yellow
        Write-Host "💡 Attendi qualche secondo e riprova" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Servizio installato ma potrebbe non essere avviato" -ForegroundColor Yellow
    Write-Host "💡 Riavvia il PC o esegui: sc start $ServiceName" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 STATO INSTALLAZIONE:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "🌐 URL servizio: http://127.0.0.1:17654" -ForegroundColor White
Write-Host "📁 Log servizio: $LogDir\service.log" -ForegroundColor White
Write-Host "🔧 Manager servizi: services.msc" -ForegroundColor White
Write-Host "📋 Diagnostica: diagnostica-servizio.bat" -ForegroundColor White
Write-Host ""

Write-Host "✅ INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Read-Host "Premi Invio per uscire"
