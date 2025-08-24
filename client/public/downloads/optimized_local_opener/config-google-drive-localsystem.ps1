# Configurazione Google Drive per servizio LocalSystem
# Questo script configura i percorsi Google Drive per l'account LocalSystem

param([switch]$Silent = $false)

if (-not $Silent) {
    Write-Host "CONFIGURAZIONE GOOGLE DRIVE PER LOCALSYSTEM" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
}

# Verifica privilegi amministratore
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[ERRORE] Questo script deve essere eseguito come amministratore!" -ForegroundColor Red
    exit 1
}

# Directory di configurazione
$userConfigDir = "$env:APPDATA\.local-opener"
$systemConfigDir = "C:\ProgramData\.local-opener"

# Crea directory se non esistono
if (-not (Test-Path $systemConfigDir)) {
    New-Item -ItemType Directory -Path $systemConfigDir -Force | Out-Null
}

# Trova percorsi Google Drive
$googleDrivePaths = @()

# Metodo 1: Cerca in tutte le unità
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 }
foreach ($drive in $drives) {
    $testPath = "$($drive.Name):\Il mio Drive"
    if (Test-Path $testPath) {
        $googleDrivePaths += "$($drive.Name):\"
        $googleDrivePaths += $testPath
        if (-not $Silent) {
            Write-Host "[OK] Trovato Google Drive: $($drive.Name):\" -ForegroundColor Green
        }
    }
}

# Metodo 2: Cerca percorsi standard
$standardPaths = @("G:\", "G:\Il mio Drive", "H:\", "H:\Il mio Drive")
foreach ($path in $standardPaths) {
    if ((Test-Path $path) -and ($googleDrivePaths -notcontains $path)) {
        $googleDrivePaths += $path
        if (-not $Silent) {
            Write-Host "[OK] Trovato percorso standard: $path" -ForegroundColor Green
        }
    }
}

# Metodo 3: Leggi dal registro per trovare il percorso di Google Drive
try {
    $googleDriveReg = Get-ItemProperty -Path "HKCU:\Software\Google\Drive" -ErrorAction SilentlyContinue
    if ($googleDriveReg -and $googleDriveReg.Path) {
        $gdPath = $googleDriveReg.Path
        if ((Test-Path $gdPath) -and ($googleDrivePaths -notcontains $gdPath)) {
            $googleDrivePaths += $gdPath
            if (-not $Silent) {
                Write-Host "[OK] Trovato da registro: $gdPath" -ForegroundColor Green
            }
        }
    }
} catch {
    # Ignora errori registro
}

# Se non trova nulla, usa percorsi predefiniti
if ($googleDrivePaths.Count -eq 0) {
    $googleDrivePaths = @("C:\", "D:\", "E:\", "F:\", "G:\", "H:\")
    if (-not $Silent) {
        Write-Host "[INFO] Nessun Google Drive trovato, uso percorsi predefiniti" -ForegroundColor Yellow
    }
}

# Crea configurazione
$config = @{
    roots = $googleDrivePaths
    created = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    source = "LocalSystem Configuration"
}

# Salva configurazione in formato JSON
$configJson = $config | ConvertTo-Json -Depth 10

# Salva in entrambe le directory
try {
    # Directory utente
    if (-not (Test-Path $userConfigDir)) {
        New-Item -ItemType Directory -Path $userConfigDir -Force | Out-Null
    }
    $configJson | Out-File -FilePath "$userConfigDir\config.json" -Encoding UTF8 -Force
    
    # Directory sistema
    $configJson | Out-File -FilePath "$systemConfigDir\config.json" -Encoding UTF8 -Force
    
    # Imposta permessi per LocalSystem
    $acl = Get-Acl "$systemConfigDir\config.json"
    $permission = "NT AUTHORITY\SYSTEM","FullControl","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl "$systemConfigDir\config.json" $acl
    
    if (-not $Silent) {
        Write-Host "[OK] Configurazione salvata con successo!" -ForegroundColor Green
        Write-Host "     - Utente: $userConfigDir\config.json" -ForegroundColor Gray
        Write-Host "     - Sistema: $systemConfigDir\config.json" -ForegroundColor Gray
    }
} catch {
    if (-not $Silent) {
        Write-Host "[ERRORE] Impossibile salvare configurazione: $_" -ForegroundColor Red
    }
    exit 1
}

# Verifica servizio
try {
    $service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            # Riavvia servizio per applicare nuova configurazione
            if (-not $Silent) {
                Write-Host ""
                Write-Host "[INFO] Riavvio servizio per applicare configurazione..." -ForegroundColor Yellow
            }
            Restart-Service -Name "CruscottoLocalOpener" -Force
            Start-Sleep -Seconds 5
            
            if (-not $Silent) {
                Write-Host "[OK] Servizio riavviato!" -ForegroundColor Green
            }
        }
    }
} catch {
    # Ignora errori servizio
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "CONFIGURAZIONE COMPLETATA!" -ForegroundColor Green
    Write-Host "=========================" -ForegroundColor Green
    Write-Host "Percorsi configurati: $($googleDrivePaths.Count)" -ForegroundColor White
    foreach ($path in $googleDrivePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Il servizio Local Opener può ora accedere a Google Drive!" -ForegroundColor Green
}

# Ritorna risultato
return @{
    Success = $true
    Paths = $googleDrivePaths
    ConfigPath = "$systemConfigDir\config.json"
}
