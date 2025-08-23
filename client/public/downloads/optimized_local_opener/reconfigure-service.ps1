# Script PowerShell per riconfigurazione automatica Local Opener
# Riconfigura il servizio con tutti i percorsi Google Drive trovati

param([switch]$Silent = $false)

if (-not $Silent) {
    Write-Host "RICONFIGURAZIONE AUTOMATICA LOCAL OPENER" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
}

# 1. TROVA TUTTI I PERCORSI GOOGLE DRIVE
if (-not $Silent) {
    Write-Host "1. Ricerca percorsi Google Drive..." -ForegroundColor Cyan
}

$script:AllPaths = @()
$script:ValidPaths = @()

# Funzione per aggiungere percorsi
function Add-Path {
    param([string]$Path, [string]$Source)
    
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    
    $NormalizedPath = $Path.Trim()
    
    if (Test-Path $NormalizedPath -PathType Container) {
        try {
            $test = Get-ChildItem $NormalizedPath -ErrorAction Stop | Select-Object -First 1
            
            if ($script:ValidPaths -notcontains $NormalizedPath) {
                $script:ValidPaths += $NormalizedPath
                if (-not $Silent) {
                    Write-Host "   [OK] Trovato: $NormalizedPath (da $Source)" -ForegroundColor Green
                }
            }
            
            $script:AllPaths += @{
                Path = $NormalizedPath
                Source = $Source
                Status = "VALIDO"
            }
        } catch {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] Non accessibile: $NormalizedPath (da $Source)" -ForegroundColor Yellow
            }
        }
    }
}

# Ricerca percorsi Google Drive
$DriveLetters = @("G", "H", "I", "J", "K", "L", "M", "N")
foreach ($Letter in $DriveLetters) {
    $DriveRoot = "${Letter}:\"
    
    if (Test-Path $DriveRoot) {
        $GoogleDrivePaths = @(
            "${Letter}:\Il mio Drive",
            "${Letter}:\My Drive",
            "${Letter}:\Drive condivisi",
            "${Letter}:\Shared drives"
        )
        
        foreach ($path in $GoogleDrivePaths) {
            Add-Path -Path $path -Source "Drive $Letter"
        }
        
        # Controlla root se contiene Google Drive
        try {
            $contents = Get-ChildItem $DriveRoot -Directory -ErrorAction SilentlyContinue
            $hasGoogleDrive = $contents | Where-Object { $_.Name -like "*Google*Drive*" -or $_.Name -like "*Drive*" }
            if ($hasGoogleDrive) {
                Add-Path -Path $DriveRoot -Source "Root Drive $Letter"
            }
        } catch {
            # Ignora errori per drive non accessibili
        }
    }
}

# Controllo cartelle business
$UserProfile = $env:USERPROFILE
if ($UserProfile) {
    $BusinessPaths = @(
        "$UserProfile\Desktop\SGI - Copia",
        "$UserProfile\Documents\ISO",
        "$UserProfile\Documents\SGI"
    )
    
    foreach ($path in $BusinessPaths) {
        Add-Path -Path $path -Source "Cartella business"
    }
}

# 2. VERIFICA STATO ATTUALE SERVIZIO
if (-not $Silent) {
    Write-Host ""
    Write-Host "2. Verifica stato attuale servizio..." -ForegroundColor Cyan
}

try {
    $CurrentResponse = Invoke-WebRequest -Uri "http://127.0.0.1:17654/config" -TimeoutSec 10 -UseBasicParsing
    if ($CurrentResponse.StatusCode -eq 200) {
        try {
            $CurrentConfig = $CurrentResponse.Content | ConvertFrom-Json
            $CurrentPaths = $CurrentConfig.roots
            if (-not $Silent) {
                Write-Host "   [INFO] Percorsi attualmente configurati: $($CurrentPaths.Count)" -ForegroundColor White
                foreach ($path in $CurrentPaths) {
                    Write-Host "      - $path" -ForegroundColor Gray
                }
            }
        } catch {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] Configurazione attuale non parsabile" -ForegroundColor Yellow
            }
            $CurrentPaths = @()
        }
    } else {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Servizio non raggiungibile" -ForegroundColor Red
        }
        exit 1
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore connessione servizio: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# 3. RICONFIGURA SERVIZIO CON TUTTI I PERCORSI
if (-not $Silent) {
    Write-Host ""
    Write-Host "3. Riconfigurazione servizio..." -ForegroundColor Cyan
}

try {
    $ConfigUrl = "http://127.0.0.1:17654/reconfigure-paths"
    $ConfigData = @{
        forcedPaths = $script:ValidPaths
    } | ConvertTo-Json
    
    if (-not $Silent) {
        Write-Host "   [INFO] Invio configurazione con $($script:ValidPaths.Count) percorsi..." -ForegroundColor White
    }
    
    $Response = Invoke-RestMethod -Uri $ConfigUrl -Method POST -Body $ConfigData -ContentType "application/json" -TimeoutSec 15
    
    if ($Response.success) {
        if (-not $Silent) {
            Write-Host "   [OK] Riconfigurazione completata!" -ForegroundColor Green
            Write-Host "   [INFO] Percorsi configurati: $($Response.configuredPaths.Count)" -ForegroundColor White
        }
    } else {
        if (-not $Silent) {
            Write-Host "   [ATTENZIONE] Riconfigurazione parzialmente riuscita" -ForegroundColor Yellow
        }
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] ERRORE riconfigurazione: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# 4. VERIFICA CONFIGURAZIONE FINALE
if (-not $Silent) {
    Write-Host ""
    Write-Host "4. Verifica configurazione finale..." -ForegroundColor Cyan
}

Start-Sleep -Seconds 2  # Attendi che il servizio si riavvii

try {
    $FinalResponse = Invoke-WebRequest -Uri "http://127.0.0.1:17654/config" -TimeoutSec 10 -UseBasicParsing
    if ($FinalResponse.StatusCode -eq 200) {
        try {
            $FinalConfig = $FinalResponse.Content | ConvertFrom-Json
            $FinalPaths = $FinalConfig.roots
            if (-not $Silent) {
                Write-Host "   [INFO] Configurazione finale:" -ForegroundColor Green
                Write-Host "      Percorsi configurati: $($FinalPaths.Count)" -ForegroundColor White
                foreach ($path in $FinalPaths) {
                    Write-Host "      - $path" -ForegroundColor White
                }
            }
        } catch {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] Configurazione finale non parsabile" -ForegroundColor Yellow
            }
        }
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore verifica finale: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. RISULTATO FINALE
if (-not $Silent) {
    Write-Host ""
    Write-Host "RICONFIGURAZIONE COMPLETATA!" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host "Percorsi trovati: $($script:ValidPaths.Count)" -ForegroundColor White
    Write-Host "Percorsi configurati nel servizio: $($FinalPaths.Count)" -ForegroundColor White
    
    if ($FinalPaths.Count -eq $script:ValidPaths.Count) {
        Write-Host "[OK] SUCCESSO: Tutti i percorsi sono ora configurati!" -ForegroundColor Green
    } else {
        Write-Host "[ATTENZIONE] ATTENZIONE: Alcuni percorsi potrebbero non essere configurati" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Verifica finale:" -ForegroundColor Cyan
    Write-Host "  - Health: http://127.0.0.1:17654/health" -ForegroundColor White
    Write-Host "  - Config: http://127.0.0.1:17654/config" -ForegroundColor White
}

# Output programmatico
return @{
    Success = $FinalPaths.Count -eq $script:ValidPaths.Count
    FoundPaths = $script:ValidPaths
    ConfiguredPaths = $FinalPaths
    FoundCount = $script:ValidPaths.Count
    ConfiguredCount = $FinalPaths.Count
}
