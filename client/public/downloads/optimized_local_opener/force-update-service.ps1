# Script PowerShell ULTRA-ROBUSTO per aggiornamento completo Local Opener
# Forza aggiornamento codice e riconfigurazione percorsi

param([switch]$Silent = $false)

if (-not $Silent) {
    Write-Host "AGGIORNAMENTO COMPLETO LOCAL OPENER - CODICE FORZATO" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Green
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

# 2. FERMA COMPLETAMENTE IL SERVIZIO
if (-not $Silent) {
    Write-Host ""
    Write-Host "2. Fermo completo servizio..." -ForegroundColor Cyan
}

try {
    # Verifica se il servizio esiste
    $Service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
    
    if ($Service) {
        if (-not $Silent) {
            Write-Host "   [INFO] Servizio trovato, stato: $($Service.Status)" -ForegroundColor White
        }
        
        # Ferma servizio se in esecuzione
        if ($Service.Status -eq "Running") {
            if (-not $Silent) {
                Write-Host "   [INFO] Fermo servizio..." -ForegroundColor Yellow
            }
            Stop-Service -Name "CruscottoLocalOpener" -Force
            Start-Sleep -Seconds 5  # Attendi fermata completa
        }
        
        if (-not $Silent) {
            Write-Host "   [OK] Servizio fermato!" -ForegroundColor Green
        }
    } else {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Servizio CruscottoLocalOpener non trovato!" -ForegroundColor Red
        }
        exit 1
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore fermata servizio: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# 3. AGGIORNA CODICE DEL SERVIZIO
if (-not $Silent) {
    Write-Host ""
    Write-Host "3. Aggiornamento codice servizio..." -ForegroundColor Cyan
}

try {
    # Trova la directory del servizio
    $ServiceInfo = Get-WmiObject -Class Win32_Service -Filter "Name='CruscottoLocalOpener'"
    $ServicePath = $ServiceInfo.PathName
    
    if (-not $ServicePath) {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Impossibile trovare percorso servizio!" -ForegroundColor Red
        }
        exit 1
    }
    
    # Estrai directory del servizio
    $ServiceDir = Split-Path -Parent $ServicePath
    if (-not $ServiceDir) {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Impossibile estrarre directory servizio!" -ForegroundColor Red
        }
        exit 1
    }
    
    if (-not $Silent) {
        Write-Host "   [INFO] Directory servizio: $ServiceDir" -ForegroundColor White
    }
    
    # Copia nuovo codice nella directory del servizio
    $CurrentDir = Get-Location
    $SourceFiles = @("index.js", "package.json")
    
    foreach ($file in $SourceFiles) {
        $SourcePath = Join-Path $CurrentDir $file
        $DestPath = Join-Path $ServiceDir $file
        
        if (Test-Path $SourcePath) {
            try {
                Copy-Item -Path $SourcePath -Destination $DestPath -Force
                if (-not $Silent) {
                    Write-Host "   [OK] Aggiornato: $file" -ForegroundColor Green
                }
            } catch {
                if (-not $Silent) {
                    Write-Host "   [ATTENZIONE] Errore copia $($file): $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
        } else {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] File sorgente non trovato: $file" -ForegroundColor Yellow
            }
        }
    }
    
    if (-not $Silent) {
        Write-Host "   [OK] Codice servizio aggiornato!" -ForegroundColor Green
    }
    
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore aggiornamento codice: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# 4. RIAVVIA SERVIZIO CON CODICE AGGIORNATO
if (-not $Silent) {
    Write-Host ""
    Write-Host "4. Riavvio servizio con codice aggiornato..." -ForegroundColor Cyan
}

try {
    if (-not $Silent) {
        Write-Host "   [INFO] Avvio servizio..." -ForegroundColor Yellow
    }
    
    Start-Service -Name "CruscottoLocalOpener"
    Start-Sleep -Seconds 8  # Attendi avvio completo
    
    if (-not $Silent) {
        Write-Host "   [OK] Servizio riavviato con codice aggiornato!" -ForegroundColor Green
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore riavvio servizio: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# 5. ATTENDI CHE IL SERVIZIO SIA ATTIVO
if (-not $Silent) {
    Write-Host ""
    Write-Host "5. Attendo attivazione servizio..." -ForegroundColor Cyan
}

$MaxWait = 30
$WaitCount = 0
$ServiceReady = $false

while (-not $ServiceReady -and $WaitCount -lt $MaxWait) {
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            $ServiceReady = $true
            if (-not $Silent) {
                Write-Host "   [OK] Servizio attivo e risponde!" -ForegroundColor Green
            }
        }
    } catch {
        # Servizio non ancora pronto
    }
    
    if (-not $ServiceReady) {
        $WaitCount++
        if (-not $Silent) {
            Write-Host "   [INFO] Attendo... ($WaitCount/$MaxWait)" -ForegroundColor Yellow
        }
        Start-Sleep -Seconds 1
    }
}

if (-not $ServiceReady) {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Servizio non attivo dopo $MaxWait secondi!" -ForegroundColor Red
    }
    exit 1
}

# 6. VERIFICA STATO ATTUALE SERVIZIO
if (-not $Silent) {
    Write-Host ""
    Write-Host "6. Verifica stato attuale servizio..." -ForegroundColor Cyan
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

# 7. RICONFIGURA SERVIZIO CON TUTTI I PERCORSI
if (-not $Silent) {
    Write-Host ""
    Write-Host "7. Riconfigurazione servizio con codice aggiornato..." -ForegroundColor Cyan
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
        Write-Host "   [INFO] Il servizio potrebbe non avere ancora l'endpoint aggiornato" -ForegroundColor Yellow
    }
}

# 8. VERIFICA CONFIGURAZIONE FINALE
if (-not $Silent) {
    Write-Host ""
    Write-Host "8. Verifica configurazione finale..." -ForegroundColor Cyan
}

Start-Sleep -Seconds 3  # Attendi che il servizio si stabilizzi

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

# 9. RISULTATO FINALE
if (-not $Silent) {
    Write-Host ""
    Write-Host "AGGIORNAMENTO COMPLETO COMPLETATO!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "Percorsi trovati: $($script:ValidPaths.Count)" -ForegroundColor White
    Write-Host "Percorsi configurati nel servizio: $($FinalPaths.Count)" -ForegroundColor White
    
    if ($FinalPaths.Count -eq $script:ValidPaths.Count) {
        Write-Host "[OK] SUCCESSO: Tutti i percorsi sono ora configurati!" -ForegroundColor Green
    } else {
        Write-Host "[ATTENZIONE] ATTENZIONE: Alcuni percorsi potrebbero non essere configurati" -ForegroundColor Yellow
        Write-Host "[INFO] Il servizio potrebbe richiedere un riavvio manuale per applicare le modifiche" -ForegroundColor Yellow
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
