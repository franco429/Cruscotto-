# Script PowerShell per configurare il servizio Local Opener sempre attivo
# Assicura che il servizio rimanga attivo dopo chiusura file e riavvio PC

# Controllo se già eseguito come amministratore
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-NOT $isAdmin) {
    Write-Host "Richiesta privilegi Amministratore..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process PowerShell -Verb runAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit
}

Write-Host "CONFIGURAZIONE SERVIZIO LOCAL OPENER SEMPRE ATTIVO" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

$ServiceName = "CruscottoLocalOpener"

Write-Host "1. Verifica esistenza servizio..." -ForegroundColor Cyan
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "ERRORE: Servizio non trovato. Installa prima Local Opener." -ForegroundColor Red
    Read-Host "Premi Invio per uscire"
    exit 1
}

Write-Host "2. Configurazione avvio automatico..." -ForegroundColor Cyan
sc config $ServiceName start= auto
sc config $ServiceName delayed-auto= false

Write-Host "3. Configurazione resilienza servizio..." -ForegroundColor Cyan
sc failure $ServiceName reset= 0 actions= restart/5000/restart/10000/restart/20000

Write-Host "4. Configurazione recupero automatico..." -ForegroundColor Cyan
# Riavvia il servizio automaticamente se si arresta
sc config $ServiceName depend= ""
sc config $ServiceName type= own
sc config $ServiceName error= normal

Write-Host "5. Arresto e riavvio servizio..." -ForegroundColor Cyan
Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Service -Name $ServiceName

Write-Host "6. Verifica configurazione..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

$serviceStatus = Get-Service -Name $ServiceName
$serviceConfig = sc qc $ServiceName

Write-Host ""
Write-Host "RISULTATI CONFIGURAZIONE:" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

if ($serviceStatus.Status -eq "Running") {
    Write-Host "Stato servizio: ATTIVO" -ForegroundColor Green
} else {
    Write-Host "Stato servizio: PROBLEMA" -ForegroundColor Red
}

if ($serviceConfig -match "AUTO_START") {
    Write-Host "Avvio automatico: CONFIGURATO" -ForegroundColor Green
} else {
    Write-Host "Avvio automatico: NON CONFIGURATO" -ForegroundColor Red
}

# Test connessione HTTP
try {
    $testResponse = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "Connessione HTTP: FUNZIONANTE" -ForegroundColor Green
} catch {
    Write-Host "Connessione HTTP: PROBLEMA" -ForegroundColor Red
}

Write-Host ""
Write-Host "CONFIGURAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host ""
Write-Host "Il servizio Local Opener ora:" -ForegroundColor Cyan
Write-Host "- Si avvia automaticamente al boot del PC" -ForegroundColor White
Write-Host "- Rimane attivo anche se chiudi il file .exe" -ForegroundColor White
Write-Host "- Si riavvia automaticamente in caso di errore" -ForegroundColor White
Write-Host "- Funziona sempre in background" -ForegroundColor White

Write-Host ""
Read-Host "Premi Invio per uscire"
