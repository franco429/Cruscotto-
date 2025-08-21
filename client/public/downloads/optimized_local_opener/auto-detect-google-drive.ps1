# Script PowerShell OTTIMIZZATO per rilevazione automatica percorsi Google Drive locale
# Versione ottimizzata per il Cruscotto Local Opener

param(
    [switch]$Silent = $false,
    [string]$OutputFile = "",
    [switch]$ConfigureService = $false
)

if (-not $Silent) {
    Write-Host "RILEVAZIONE AUTOMATICA PERCORSI GOOGLE DRIVE - OTTIMIZZATA" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
}

$DetectedPaths = @()
$ValidPaths = @()

# Funzione ottimizzata per aggiungere percorsi rilevati
function Add-DetectedPath {
    param([string]$Path, [string]$Source)
    
    if (Test-Path $Path -PathType Container) {
        try {
            # Test accesso rapido alla cartella
            $testAccess = Get-ChildItem $Path -ErrorAction Stop | Select-Object -First 1
            
            $DetectedPaths += @{
                Path = $Path
                Source = $Source
                Exists = $true
                Accessible = $true
            }
            
            # Evita duplicati
            if ($ValidPaths -notcontains $Path) {
                $ValidPaths += $Path
                if (-not $Silent) {
                    Write-Host "OK Trovato: $Path (da $Source)" -ForegroundColor Green
                }
            }
        } catch {
            $DetectedPaths += @{
                Path = $Path
                Source = $Source
                Exists = $true
                Accessible = $false
            }
            if (-not $Silent) {
                Write-Host "ATTENZIONE Non accessibile: $Path (da $Source)" -ForegroundColor Yellow
            }
        }
    } else {
        $DetectedPaths += @{
            Path = $Path
            Source = $Source
            Exists = $false
            Accessible = $false
        }
        if (-not $Silent -and $VerboseOutput) {
            Write-Host "ERRORE Non valido: $Path (da $Source)" -ForegroundColor Red
        }
    }
}

if (-not $Silent) {
    Write-Host "Ricerca intelligente percorsi Google Drive..." -ForegroundColor Cyan
}

# 1. RICERCA REGISTRO WINDOWS - Google Drive Desktop (piu efficiente)
if (-not $Silent) { Write-Host "Controllo registro Windows..." -ForegroundColor Cyan }

try {
    # Google Drive Desktop (metodo principale)
    $GoogleDriveRegistry = Get-ItemProperty -Path "HKCU:\Software\Google\DriveFS" -ErrorAction SilentlyContinue
    if ($GoogleDriveRegistry) {
        if (-not $Silent) { Write-Host "   OK Google Drive Desktop rilevato nel registro" -ForegroundColor Green }
        
        # Rileva drive letters dal registro se disponibile
        $DriveLetters = @("G", "H", "I", "J", "K", "L", "M", "N")
        foreach ($Letter in $DriveLetters) {
            $StandardPaths = @(
                "${Letter}:\Il mio Drive",
                "${Letter}:\My Drive",
                "${Letter}:\Drive condivisi",
                "${Letter}:\Shared drives"
            )
            
            foreach ($path in $StandardPaths) {
                Add-DetectedPath -Path $path -Source "Google Drive Desktop ($Letter)"
            }
        }
    }
    
    # Google Backup & Sync (legacy)
    $BackupSyncRegistry = Get-ItemProperty -Path "HKCU:\Software\Google\Drive" -ErrorAction SilentlyContinue
    if ($BackupSyncRegistry -and $BackupSyncRegistry.Path) {
        Add-DetectedPath -Path $BackupSyncRegistry.Path -Source "Google Backup & Sync"
    }
    
} catch {
    if (-not $Silent) {
        Write-Host "   ATTENZIONE Errore accesso registro: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 2. RICERCA CARTELLE UTENTE STANDARD (ottimizzata)
if (-not $Silent) { Write-Host "Controllo cartelle utente..." -ForegroundColor Cyan }

$UserProfile = $env:USERPROFILE
if ($UserProfile) {
    $StandardUserPaths = @(
        "$UserProfile\Google Drive",
        "$UserProfile\GoogleDrive", 
        "$UserProfile\Documents\Google Drive",
        "$UserProfile\Desktop\Google Drive",
        "$UserProfile\OneDrive\Google Drive"
    )
    
    foreach ($Path in $StandardUserPaths) {
        Add-DetectedPath -Path $Path -Source "Cartella utente standard"
    }
}

# 3. SCANSIONE INTELLIGENTE UTENTI (solo utenti principali)
if (-not $Silent) { Write-Host "Scansione utenti sistema..." -ForegroundColor Cyan }

try {
    $UsersDir = "C:\Users"
    if (Test-Path $UsersDir) {
        $UserFolders = Get-ChildItem $UsersDir -Directory -ErrorAction SilentlyContinue | 
                      Where-Object { 
                          $_.Name -notin @('Public', 'Default', 'All Users', 'defaultuser0', 'WDAGUtilityAccount') -and
                          -not $_.Name.StartsWith('.') -and 
                          -not $_.Name.StartsWith('$')
                      } | Select-Object -First 5  # Limita a 5 utenti per performance
        
        foreach ($userFolder in $UserFolders) {
            $userPath = $userFolder.FullName
            
            $userGooglePaths = @(
                "$userPath\Google Drive",
                "$userPath\GoogleDrive", 
                "$userPath\Documents\Google Drive",
                "$userPath\Desktop\Google Drive"
            )
            
            foreach ($path in $userGooglePaths) {
                Add-DetectedPath -Path $path -Source "Utente $($userFolder.Name)"
            }
        }
    }
} catch {
    if (-not $Silent) {
        Write-Host "   ATTENZIONE Errore scansione utenti: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. RICERCA DRIVE MAPPATI (efficiente)
if (-not $Silent) { Write-Host "Controllo drive mappati..." -ForegroundColor Cyan }

# Test solo le lettere piu comuni per Google Drive
$CommonDriveLetters = @("G", "H", "I", "J")
foreach ($Letter in $CommonDriveLetters) {
    $DriveRoot = "${Letter}:\"
    
    if (Test-Path $DriveRoot) {
        $CommonPatterns = @(
            "Il mio Drive",
            "My Drive", 
            "Drive condivisi",
            "Shared drives",
            "Google Drive"
        )
        
        foreach ($pattern in $CommonPatterns) {
            $fullPath = Join-Path $DriveRoot $pattern
            Add-DetectedPath -Path $fullPath -Source "Drive mappato $Letter"
        }
        
        # Aggiungi anche la root se contiene pattern Google Drive
        try {
            $rootContents = Get-ChildItem $DriveRoot -Directory -ErrorAction SilentlyContinue | 
                           Where-Object { $_.Name -like "*Google*Drive*" -or $_.Name -like "*Drive*" }
            
            if ($rootContents) {
                Add-DetectedPath -Path $DriveRoot -Source "Root Drive $Letter"
            }
        } catch {}
    }
}

# 5. CONTROLLO VARIABILI AMBIENTE
if (-not $Silent) { Write-Host "Controllo variabili ambiente..." -ForegroundColor Cyan }

$EnvVarsToCheck = @(
    'GOOGLE_DRIVE_PATH',
    'GOOGLEDRIVE_PATH', 
    'GDRIVE_PATH'
)

foreach ($envVar in $EnvVarsToCheck) {
    $envValue = [Environment]::GetEnvironmentVariable($envVar)
    if ($envValue) {
        Add-DetectedPath -Path $envValue -Source "Variabile ambiente $envVar"
    }
}

# 6. RICERCA DOCUMENTI ISO/SGI (specifica per Cruscotto)
if (-not $Silent) { Write-Host "Controllo cartelle documenti aziendali..." -ForegroundColor Cyan }

if ($UserProfile) {
    $BusinessPaths = @(
        "$UserProfile\Documents\ISO",
        "$UserProfile\Documents\Documenti ISO",
        "$UserProfile\Documents\SGI",
        "$UserProfile\Desktop\ISO",
        "$UserProfile\Desktop\Documenti",
        "$UserProfile\OneDrive\ISO"
    )
    
    foreach ($Path in $BusinessPaths) {
        Add-DetectedPath -Path $Path -Source "Cartella documenti aziendali"
    }
}

# Rimuovi duplicati e ordina
$ValidPaths = $ValidPaths | Sort-Object -Unique

# RISULTATI
if (-not $Silent) {
    Write-Host ""
    Write-Host "RISULTATI RILEVAZIONE:" -ForegroundColor Magenta
    Write-Host "=========================" -ForegroundColor Magenta
    Write-Host "Percorsi analizzati: $($DetectedPaths.Count)" -ForegroundColor White
    Write-Host "Percorsi validi trovati: $($ValidPaths.Count)" -ForegroundColor Green
    
    if ($ValidPaths.Count -gt 0) {
        Write-Host ""
        Write-Host "PERCORSI VALIDI RILEVATI:" -ForegroundColor Green
        foreach ($Path in $ValidPaths) {
            Write-Host "   - $Path" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "ATTENZIONE NESSUN PERCORSO GOOGLE DRIVE RILEVATO" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SUGGERIMENTI:" -ForegroundColor Cyan
        Write-Host "   - Verifica che Google Drive sia installato e configurato" -ForegroundColor White
        Write-Host "   - Controlla se Google Drive e montato su lettere G:\, H:\, ecc." -ForegroundColor White
        Write-Host "   - Aggiungi manualmente i percorsi dal pannello Local Opener" -ForegroundColor White
        Write-Host "   - Esegui Google Drive e attendi la sincronizzazione completa" -ForegroundColor White
    }
}

# CONFIGURAZIONE AUTOMATICA SERVIZIO
if ($ConfigureService -and $ValidPaths.Count -gt 0) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Configurazione automatica Local Opener..." -ForegroundColor Cyan
    }
    
    try {
        $ConfigUrl = "http://127.0.0.1:17654/reconfigure-paths"
        $ConfigData = @{
            forcedPaths = $ValidPaths
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $ConfigUrl -Method POST -Body $ConfigData -ContentType "application/json" -TimeoutSec 15
        
        if ($Response.success) {
            if (-not $Silent) {
                Write-Host "Configurazione servizio completata automaticamente!" -ForegroundColor Green
                Write-Host "   Percorsi configurati: $($Response.configuredPaths.Count)" -ForegroundColor White
            }
        } else {
            if (-not $Silent) {
                Write-Host "ATTENZIONE Configurazione servizio parzialmente riuscita" -ForegroundColor Yellow
            }
        }
    } catch {
        if (-not $Silent) {
            Write-Host "ERRORE Impossibile configurare il servizio automaticamente: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "INFO Configura manualmente dal pannello web: http://127.0.0.1:17654" -ForegroundColor Cyan
        }
    }
}

# OUTPUT SU FILE
if ($OutputFile) {
    $OutputData = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        DetectedPathsCount = $DetectedPaths.Count
        ValidPathsCount = $ValidPaths.Count
        DetectedPaths = $DetectedPaths
        ValidPaths = $ValidPaths
        SystemInfo = @{
            OS = (Get-WmiObject Win32_OperatingSystem).Caption
            User = $env:USERNAME
            ComputerName = $env:COMPUTERNAME
        }
    } | ConvertTo-Json -Depth 4
    
    try {
        $OutputData | Out-File -FilePath $OutputFile -Encoding UTF8
        if (-not $Silent) {
            Write-Host ""
            Write-Host "Risultati salvati in: $OutputFile" -ForegroundColor Cyan
        }
    } catch {
        if (-not $Silent) {
            Write-Host "ERRORE salvataggio file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "RILEVAZIONE COMPLETATA!" -ForegroundColor Green
    
    if ($ValidPaths.Count -eq 0) {
        Write-Host ""
        Write-Host "Per ulteriore assistenza, esegui diagnostica-servizio.bat" -ForegroundColor Cyan
        Read-Host "Premi Invio per uscire"
    }
}

# OUTPUT PROGRAMMATICO
return @{
    Success = $ValidPaths.Count -gt 0
    ValidPaths = $ValidPaths
    DetectedPaths = $DetectedPaths
    Count = $ValidPaths.Count
    SystemInfo = @{
        OS = (Get-WmiObject Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
        User = $env:USERNAME
        ComputerName = $env:COMPUTERNAME
    }
}
