# Script PowerShell per creare il ZIP con tutti i file aggiornati

Write-Host "Creazione ZIP ottimizzato Local Opener..." -ForegroundColor Cyan

# Directory corrente
$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$zipPath = Join-Path (Split-Path -Parent $currentDir) "optimized_local_opener.zip"

# Rimuovi ZIP esistente
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "ZIP esistente rimosso" -ForegroundColor Yellow
}

# Lista file da includere
$filesToInclude = @(
    "*.bat",
    "*.ps1",
    "*.exe",
    "*.js",
    "*.json",
    "*.txt",
    "*.md",
    "assets\*"
)

# Crea ZIP
try {
    # Crea directory temporanea
    $tempDir = Join-Path $env:TEMP "local_opener_temp"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null

    # Copia file nella directory temporanea
    foreach ($pattern in $filesToInclude) {
        $files = Get-ChildItem -Path $currentDir -Filter $pattern -Recurse
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring($currentDir.Length + 1)
            $destPath = Join-Path $tempDir $relativePath
            $destDir = Split-Path -Parent $destPath
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item -Path $file.FullName -Destination $destPath -Force
        }
    }

    # Crea ZIP
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)

    # Rimuovi directory temporanea
    Remove-Item $tempDir -Recurse -Force

    Write-Host "✅ ZIP creato con successo: $zipPath" -ForegroundColor Green
    Write-Host "Include tutti i file necessari per risolvere l'errore 1069!" -ForegroundColor Green
} catch {
    Write-Host "❌ Errore creazione ZIP: $_" -ForegroundColor Red
}
