# avvia-local-opener.ps1
# Script di avvio per utente corrente
# Rileva dinamicamente i percorsi Google Drive
# AUTO-DETECTION COMPLETO come servizio principale

Write-Host "🚀 AVVIO LOCAL OPENER - UTENTE: $env:USERNAME" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Auto-Detection: COMPLETO - Tutti i percorsi rilevati automaticamente" -ForegroundColor Cyan
Write-Host ""

# Carica configurazione utente
$configFile = "$env:APPDATA\.local-opener\user-config.json"
if (Test-Path $configFile) {
    $config = Get-Content $configFile | ConvertFrom-Json
    Write-Host "✓ Configurazione caricata: $($config.detectedPaths.Count) percorsi" -ForegroundColor Green
    Write-Host "✓ Metodo rilevamento: $($config.detectionMethod)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 PERCORSI AUTORIZZATI:" -ForegroundColor Cyan
    foreach ($path in $config.detectedPaths) {
        Write-Host "  📁 $path" -ForegroundColor White
    }
} else {
    Write-Host "⚠ Configurazione non trovata, rilevamento automatico..." -ForegroundColor Yellow
}

# Cerca local-opener.exe
$openerPaths = @(
    "local-opener.exe",
    "$PSScriptRoot\local-opener.exe",
    "$env:ProgramFiles\CruscottoLocalOpener\local-opener.exe",
    "$env:USERPROFILE\Desktop\local-opener.exe",
    "$env:USERPROFILE\Downloads\local-opener.exe"
)

$openerFound = $false
foreach ($path in $openerPaths) {
    if (Test-Path $path) {
        Write-Host "✓ Local Opener trovato: $path" -ForegroundColor Green
        $openerFound = $true
        
        # Avvia in background
        Start-Process -FilePath $path -WindowStyle Minimized
        Write-Host "✓ Local Opener avviato in background" -ForegroundColor Green
        break
    }
}

if (-not $openerFound) {
    Write-Host "❌ Local Opener non trovato" -ForegroundColor Red
    Write-Host "Esegui l'installazione completa prima di usare questo script" -ForegroundColor Red
    exit 1
}

# Attendi avvio
Write-Host "⏳ Attendo avvio Local Opener..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verifica porta
Write-Host "🔍 Verifica avvio..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName localhost -Port 17654 -WarningAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Host "✅ Local Opener attivo e in ascolto sulla porta 17654" -ForegroundColor Green
} else {
    Write-Host "⚠ Local Opener potrebbe non essere ancora pronto" -ForegroundColor Yellow
}

Write-Host "`n🎯 Local Opener configurato per avvio automatico ad ogni login" -ForegroundColor Cyan
Write-Host "🌍 Auto-Detection completo: Tutti i percorsi Google Drive rilevati automaticamente" -ForegroundColor Cyan
Write-Host "📱 Per verificare lo stato: http://127.0.0.1:17654/health" -ForegroundColor Cyan
Write-Host "📁 Percorsi autorizzati: $($config.detectedPaths.Count)" -ForegroundColor Cyan
