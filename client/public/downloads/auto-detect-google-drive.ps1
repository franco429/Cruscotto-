# Script PowerShell per rilevazione automatica percorsi Google Drive locale
# Utilizzato dal Local Opener per configurare automaticamente i percorsi

param(
    [switch]$Silent = $false,
    [string]$OutputFile = "",
    [switch]$ConfigureService = $false
)

if (-not $Silent) {
    Write-Host "RILEVAZIONE AUTOMATICA PERCORSI GOOGLE DRIVE" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
}

$DetectedPaths = @()
$ValidPaths = @()

# Funzione per aggiungere percorsi rilevati
function Add-DetectedPath {
    param([string]$Path, [string]$Source)
    
    if (Test-Path $Path) {
        $DetectedPaths += @{
            Path = $Path
            Source = $Source
            Exists = $true
        }
        $ValidPaths += $Path
        if (-not $Silent) {
            Write-Host "✅ Trovato: $Path (da $Source)" -ForegroundColor Green
        }
    } else {
        $DetectedPaths += @{
            Path = $Path
            Source = $Source
            Exists = $false
        }
        if (-not $Silent) {
            Write-Host "❌ Non valido: $Path (da $Source)" -ForegroundColor Yellow
        }
    }
}

if (-not $Silent) {
    Write-Host "🔎 Ricerca percorsi Google Drive nel registro di Windows..." -ForegroundColor Cyan
}

# 1. Ricerca nel registro di Windows - Google Drive Desktop
try {
    $GoogleDriveRegistry = Get-ItemProperty -Path "HKCU:\Software\Google\DriveFS" -ErrorAction SilentlyContinue
    if ($GoogleDriveRegistry -and $GoogleDriveRegistry.ClientEmail) {
        $DriveLetters = @("G", "H", "I", "J", "K", "L")
        foreach ($Letter in $DriveLetters) {
            $StandardPath = "${Letter}:\Il mio Drive"
            $EnglishPath = "${Letter}:\My Drive"
            
            Add-DetectedPath -Path $StandardPath -Source "Google Drive Desktop ($Letter)" 
            Add-DetectedPath -Path $EnglishPath -Source "Google Drive Desktop EN ($Letter)"
        }
    }
} catch {
    if (-not $Silent) {
        Write-Host "⚠️ Errore accesso registro Google Drive Desktop: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 2. Ricerca nelle cartelle utente standard
$UserProfile = $env:USERPROFILE
if ($UserProfile) {
    $StandardUserPaths = @(
        "$UserProfile\Google Drive",
        "$UserProfile\GoogleDrive", 
        "$UserProfile\Documents\Google Drive",
        "$UserProfile\OneDrive\Google Drive"
    )
    
    foreach ($Path in $StandardUserPaths) {
        Add-DetectedPath -Path $Path -Source "Cartella utente standard"
    }
}

# 3. Ricerca Google Drive Backup & Sync (versione legacy)
try {
    $BackupSyncRegistry = Get-ItemProperty -Path "HKCU:\Software\Google\Drive" -ErrorAction SilentlyContinue
    if ($BackupSyncRegistry -and $BackupSyncRegistry.Path) {
        Add-DetectedPath -Path $BackupSyncRegistry.Path -Source "Google Backup & Sync"
    }
} catch {
    if (-not $Silent) {
        Write-Host "⚠️ Registro Google Backup & Sync non accessibile" -ForegroundColor Yellow
    }
}

# 4. Ricerca percorsi comuni su drive mappati
$CommonDrivePaths = @(
    "G:\Il mio Drive",
    "G:\My Drive", 
    "H:\Il mio Drive",
    "H:\My Drive",
    "I:\Il mio Drive",
    "I:\My Drive"
)

foreach ($Path in $CommonDrivePaths) {
    Add-DetectedPath -Path $Path -Source "Drive mappato comune"
}

# 5. Ricerca nella cartella documenti per cartelle "ISO" o simili
if ($UserProfile) {
    $DocumentsPaths = @(
        "$UserProfile\Documents\ISO",
        "$UserProfile\Documents\Documenti ISO",
        "$UserProfile\Documents\SGI",
        "$UserProfile\Desktop\ISO"
    )
    
    foreach ($Path in $DocumentsPaths) {
        Add-DetectedPath -Path $Path -Source "Cartella documenti ISO"
    }
}

# Rimuovi duplicati dai percorsi validi
$ValidPaths = $ValidPaths | Sort-Object -Unique

if (-not $Silent) {
    Write-Host ""
    Write-Host "📊 RISULTATI RILEVAZIONE:" -ForegroundColor Magenta
    Write-Host "=========================" -ForegroundColor Magenta
    Write-Host "🔍 Percorsi analizzati: $($DetectedPaths.Count)" -ForegroundColor White
    Write-Host "✅ Percorsi validi trovati: $($ValidPaths.Count)" -ForegroundColor Green
    
    if ($ValidPaths.Count -gt 0) {
        Write-Host ""
        Write-Host "📁 PERCORSI VALIDI RILEVATI:" -ForegroundColor Green
        foreach ($Path in $ValidPaths) {
            Write-Host "   • $Path" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "⚠️ NESSUN PERCORSO GOOGLE DRIVE RILEVATO" -ForegroundColor Yellow
        Write-Host "💡 Suggerimenti:" -ForegroundColor Cyan
        Write-Host "   • Verifica che Google Drive sia installato e configurato" -ForegroundColor White
        Write-Host "   • Controlla se Google Drive è in G:\ o H:\" -ForegroundColor White
        Write-Host "   • Aggiungi manualmente i percorsi nell'interfaccia" -ForegroundColor White
    }
}

# Configurazione automatica del servizio Local Opener (se richiesto)
if ($ConfigureService -and $ValidPaths.Count -gt 0) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "🔧 Configurazione automatica Local Opener..." -ForegroundColor Cyan
    }
    
    try {
        # Prova a configurare il servizio locale
        $ConfigUrl = "http://127.0.0.1:17654/auto-configure"
        $ConfigData = @{
            detectedPaths = $ValidPaths
            autoConfigured = $true
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $ConfigUrl -Method POST -Body $ConfigData -ContentType "application/json" -TimeoutSec 10
        
        if ($Response.success) {
            if (-not $Silent) {
                Write-Host "✅ Configurazione servizio completata!" -ForegroundColor Green
            }
        } else {
            if (-not $Silent) {
                Write-Host "⚠️ Configurazione servizio parzialmente riuscita" -ForegroundColor Yellow
            }
        }
    } catch {
        if (-not $Silent) {
            Write-Host "❌ Impossibile configurare il servizio automaticamente: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "💡 Configura manualmente dall'interfaccia web" -ForegroundColor Cyan
        }
    }
}

# Output su file se richiesto
if ($OutputFile) {
    $OutputData = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        DetectedPathsCount = $DetectedPaths.Count
        ValidPathsCount = $ValidPaths.Count
        DetectedPaths = $DetectedPaths
        ValidPaths = $ValidPaths
    } | ConvertTo-Json -Depth 3
    
    $OutputData | Out-File -FilePath $OutputFile -Encoding UTF8
    
    if (-not $Silent) {
        Write-Host ""
        Write-Host "💾 Risultati salvati in: $OutputFile" -ForegroundColor Cyan
    }
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "✅ RILEVAZIONE COMPLETATA!" -ForegroundColor Green
    if ($ValidPaths.Count -eq 0) {
        Write-Host ""
        Read-Host "Premi Invio per uscire"
    }
}

# Ritorna i percorsi per uso programmatico
return @{
    Success = $ValidPaths.Count -gt 0
    ValidPaths = $ValidPaths
    DetectedPaths = $DetectedPaths
    Count = $ValidPaths.Count
}
