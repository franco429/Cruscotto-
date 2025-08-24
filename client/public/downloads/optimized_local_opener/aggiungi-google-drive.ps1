# Script per aggiungere i percorsi Google Drive alla configurazione esistente

Write-Host "AGGIUNTA PERCORSI GOOGLE DRIVE" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Funzione per trovare tutti i percorsi Google Drive
function Find-GoogleDrivePaths {
    $paths = @()
    
    # Metodo 1: Cerca in tutte le unità
    Write-Host "Ricerca Google Drive su tutte le unità..." -ForegroundColor Cyan
    
    $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 }
    foreach ($drive in $drives) {
        $driveLetter = $drive.Name
        
        # Controlla radice unità
        $rootPath = "${driveLetter}:\"
        if (Test-Path $rootPath) {
            # Cerca cartelle Google Drive comuni
            $googleDriveFolders = @("Il mio Drive", "My Drive", "Google Drive", "Drive condivisi", "Shared drives")
            
            foreach ($folder in $googleDriveFolders) {
                $testPath = Join-Path $rootPath $folder
                if (Test-Path $testPath) {
                    $paths += $rootPath
                    $paths += $testPath
                    Write-Host "[OK] Trovato: $testPath" -ForegroundColor Green
                }
            }
            
            # Controlla se l'unità stessa è Google Drive (per esempio G:\)
            try {
                $items = Get-ChildItem $rootPath -ErrorAction SilentlyContinue | Select-Object -First 5
                $googleDriveFiles = $items | Where-Object { $_.Name -match "\.gdoc$|\.gsheet$|\.gslides$|\.gform$" }
                if ($googleDriveFiles) {
                    if ($paths -notcontains $rootPath) {
                        $paths += $rootPath
                        Write-Host "[OK] Unità Google Drive rilevata: $rootPath" -ForegroundColor Green
                    }
                }
            } catch {
                # Ignora errori di accesso
            }
        }
    }
    
    # Metodo 2: Cerca nel registro
    try {
        $googleDriveReg = Get-ItemProperty -Path "HKCU:\Software\Google\Drive" -ErrorAction SilentlyContinue
        if ($googleDriveReg -and $googleDriveReg.Path) {
            $gdPath = $googleDriveReg.Path
            if ((Test-Path $gdPath) -and ($paths -notcontains $gdPath)) {
                $paths += $gdPath
                Write-Host "[OK] Trovato da registro: $gdPath" -ForegroundColor Green
            }
        }
    } catch {
        # Ignora errori registro
    }
    
    # Rimuovi duplicati
    $paths = $paths | Select-Object -Unique
    
    return $paths
}

# Determina quale file di configurazione usare
$userConfigFile = "$env:APPDATA\.local-opener\config.json"
$systemConfigFile = "C:\ProgramData\.local-opener\config.json"
$configFile = $null

# Cerca file esistente
if (Test-Path $systemConfigFile) {
    $configFile = $systemConfigFile
    Write-Host "Uso configurazione sistema: $configFile" -ForegroundColor Yellow
} elseif (Test-Path $userConfigFile) {
    $configFile = $userConfigFile
    Write-Host "Uso configurazione utente: $configFile" -ForegroundColor Yellow
} else {
    # Crea nuovo file
    $configFile = $userConfigFile
    $configDir = Split-Path -Parent $configFile
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    Write-Host "Creazione nuova configurazione: $configFile" -ForegroundColor Yellow
}

# Leggi configurazione esistente
$existingRoots = @()
if (Test-Path $configFile) {
    try {
        $config = Get-Content $configFile | ConvertFrom-Json
        if ($config.roots) {
            $existingRoots = $config.roots
            Write-Host "Percorsi esistenti: $($existingRoots.Count)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Errore lettura configurazione esistente" -ForegroundColor Red
    }
}

# Trova nuovi percorsi Google Drive
Write-Host ""
$newPaths = Find-GoogleDrivePaths

# Combina percorsi esistenti e nuovi
$allPaths = @()
$allPaths += $existingRoots
foreach ($path in $newPaths) {
    if ($allPaths -notcontains $path) {
        $allPaths += $path
    }
}

# Rimuovi duplicati finali
$allPaths = $allPaths | Select-Object -Unique | Where-Object { $_ -ne $null -and $_ -ne "" }

# Crea nuova configurazione
$newConfig = @{
    roots = $allPaths
    updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

# Salva configurazione
try {
    $newConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $configFile -Encoding UTF8 -Force
    
    # Se stiamo usando il file sistema, copia anche in quello utente
    if ($configFile -eq $systemConfigFile -and -not (Test-Path $userConfigFile)) {
        $userConfigDir = Split-Path -Parent $userConfigFile
        if (-not (Test-Path $userConfigDir)) {
            New-Item -ItemType Directory -Path $userConfigDir -Force | Out-Null
        }
        $newConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $userConfigFile -Encoding UTF8 -Force
    }
    
    Write-Host ""
    Write-Host "CONFIGURAZIONE AGGIORNATA!" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    Write-Host "Totale percorsi: $($allPaths.Count)" -ForegroundColor White
    Write-Host ""
    Write-Host "Percorsi configurati:" -ForegroundColor Cyan
    $allPaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    
} catch {
    Write-Host "ERRORE salvataggio configurazione: $_" -ForegroundColor Red
    exit 1
}

# Riavvia servizio se in esecuzione
try {
    $service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host ""
        Write-Host "Riavvio servizio per applicare modifiche..." -ForegroundColor Yellow
        Restart-Service -Name "CruscottoLocalOpener" -Force
        Start-Sleep -Seconds 3
        Write-Host "Servizio riavviato!" -ForegroundColor Green
    }
} catch {
    Write-Host "Impossibile riavviare servizio: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verifica su: http://127.0.0.1:17654/config" -ForegroundColor Cyan
