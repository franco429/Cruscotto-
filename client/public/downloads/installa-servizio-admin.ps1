# Script PowerShell per installare automaticamente Local Opener come servizio
# Richiede automaticamente privilegi amministratore

# Controllo se già eseguito come amministratore
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
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

Write-Host "Configurazione avvio automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName Type SERVICE_WIN32_OWN_PROCESS

Write-Host "Configurazione resilienza e restart automatico..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000
& $NssmPath set $ServiceName AppThrottle 3000
& $NssmPath set $ServiceName AppStopMethodSkip 0
& $NssmPath set $ServiceName AppStopMethodConsole 10000
& $NssmPath set $ServiceName AppStopMethodWindow 5000
& $NssmPath set $ServiceName AppStopMethodThreads 3000

Write-Host "Configurazione migliorata per stabilita..." -ForegroundColor Cyan
& $NssmPath set $ServiceName AppNoConsole 1
& $NssmPath set $ServiceName AppAffinity All
& $NssmPath set $ServiceName AppPriority NORMAL_PRIORITY_CLASS

Write-Host "Configurazione sicurezza..." -ForegroundColor Cyan
& $NssmPath set $ServiceName ObjectName LocalSystem

Write-Host "Configurazione logging..." -ForegroundColor Cyan
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
    Write-Host "Il Local Opener si avviera automaticamente ad ogni accensione del PC" -ForegroundColor Green
    
    # Test connessione
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -UseBasicParsing
        Write-Host "Test connessione HTTP riuscito!" -ForegroundColor Green
    } catch {
        Write-Host "Servizio avviato ma connessione HTTP non ancora pronta" -ForegroundColor Yellow
        Write-Host "Attendi qualche secondo e riprova" -ForegroundColor Yellow
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
    Write-Host "4. Esegui diagnostica-servizio-avanzata.bat per troubleshooting avanzato" -ForegroundColor White
    Write-Host "5. Se il problema persiste, reinstalla con privilegi amministratore completi" -ForegroundColor White
}

Write-Host ""
Write-Host "STATO INSTALLAZIONE:" -ForegroundColor Magenta
Write-Host "====================" -ForegroundColor Magenta
Write-Host "URL servizio: http://127.0.0.1:17654" -ForegroundColor White
Write-Host "Log servizio: $LogDir\service.log" -ForegroundColor White
Write-Host "Manager servizi: services.msc" -ForegroundColor White
Write-Host "Diagnostica: diagnostica-servizio-avanzata.bat" -ForegroundColor White
Write-Host ""

Write-Host "INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host ""
Write-Host "PROSSIMI PASSI:" -ForegroundColor Magenta
Write-Host "===============" -ForegroundColor Magenta
Write-Host "1. Apri il Cruscotto SGI nel browser" -ForegroundColor White
Write-Host "2. Vai in Impostazioni - Configurazione Local Opener" -ForegroundColor White
Write-Host "3. Clicca 'Rileva Automaticamente' se i percorsi non sono gia configurati" -ForegroundColor White
Write-Host "4. Prova ad aprire un documento per testare il funzionamento" -ForegroundColor White
Write-Host ""
Read-Host "Premi Invio per uscire"