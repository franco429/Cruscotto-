# Script per ricreare il file ZIP aggiornato
# Questo script risolve i problemi di cache browser/CDN

param(
    [string]$OutputPath = "..\optimized_local_opener_v2.0.2.zip"
)

Write-Host "🔄 Ricreazione file ZIP aggiornato..." -ForegroundColor Yellow
Write-Host "📁 Directory corrente: $(Get-Location)" -ForegroundColor Cyan

# Verifica che siamo nella directory corretta
if (-not (Test-Path "package.json")) {
    Write-Error "❌ Script deve essere eseguito dalla directory optimized_local_opener"
    exit 1
}

# Verifica versione attuale
$packageJson = Get-Content "package.json" | ConvertFrom-Json
Write-Host "📦 Versione attuale: $($packageJson.version)" -ForegroundColor Green
Write-Host "🏷️ Build Version: $($packageJson.buildVersion)" -ForegroundColor Green

# Rimuovi ZIP esistente se presente
if (Test-Path $OutputPath) {
    Write-Host "🗑️ Rimozione ZIP esistente..." -ForegroundColor Yellow
    Remove-Item $OutputPath -Force
}

# Lista file da includere (escludi script temporanei)
$filesToInclude = @(
    "package.json",
    "VERSION.txt",
    "CHANGELOG-v2.0.md",
    "README-INSTALLAZIONE.md",
    "auto-config.js",
    "AVVIO-AUTOMATICO-UTENTE.bat",
    "INSTALLA-DEFINITIVO.bat",
    "DISINSTALLA-SERVIZIO.bat",
    "installer-definitivo.ps1",
    "verifica-installazione.ps1",
    "STRUTTURA-FINALE.txt",
    "VERIFICA-DOWNLOAD.txt",
    "nssm.exe",
    "local-opener.exe"
)

# Verifica presenza file
Write-Host "🔍 Verifica presenza file..." -ForegroundColor Cyan
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (MANCANTE)" -ForegroundColor Red
    }
}

# Crea ZIP con compressione ottimizzata
Write-Host "📦 Creazione ZIP aggiornato..." -ForegroundColor Yellow
try {
    # Usa .NET per creare ZIP (più affidabile di Compress-Archive)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    $compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
    $includeBaseDirectory = $false
    
    # Crea il percorso di output completo
    $fullOutputPath = (Resolve-Path "..").Path + "\optimized_local_opener_v2.0.2.zip"
    
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        (Get-Location),
        $fullOutputPath,
        $compressionLevel,
        $includeBaseDirectory
    )
    
    Write-Host "✅ ZIP creato con successo: $fullOutputPath" -ForegroundColor Green
    
    # Verifica dimensione e contenuto
    $zipInfo = Get-Item $fullOutputPath
    Write-Host "📊 Dimensione ZIP: $([math]::Round($zipInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
    # Verifica contenuto ZIP
    Write-Host "🔍 Verifica contenuto ZIP..." -ForegroundColor Cyan
    $zip = [System.IO.Compression.ZipFile]::OpenRead($fullOutputPath)
    $zip.Entries | ForEach-Object { Write-Host "  📄 $($_.Name)" -ForegroundColor White }
    $zip.Dispose()
    
} catch {
    Write-Error "❌ Errore nella creazione ZIP: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "🎉 ZIP aggiornato creato con successo!" -ForegroundColor Green
Write-Host "📁 Percorso: $fullOutputPath" -ForegroundColor Cyan
Write-Host "🔍 Per verificare: controlla VERSION.txt nel ZIP" -ForegroundColor Yellow
Write-Host "💡 Questo dovrebbe risolvere i problemi di cache browser" -ForegroundColor Yellow
