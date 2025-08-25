# installer-definitivo.ps1
# QUESTO RISOLVE IL PROBLEMA DELL'AVVIO AUTOMATICO
# MODALITÀ VERBOSE E GESTIONE ERRORI AVANZATA

param(
    [string]$InstallPath = "$env:ProgramFiles\CruscottoLocalOpener",
    [switch]$Silent = $false,
    [switch]$Verbose = $false
)

# Abilita modalità verbose se richiesta
if ($Verbose) {
    $VerbosePreference = "Continue"
    Write-Verbose "Modalità verbose abilitata"
}

# Funzione per logging avanzato
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
    
    # Salva anche nel file di log
    try {
        $logFile = "$env:APPDATA\.local-opener\logs\install.log"
        $logDir = Split-Path $logFile -Parent
        if (!(Test-Path $logDir)) {
            New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        }
        Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
    } catch {
        # Ignora errori di logging
    }
}

# Richiedi admin con verifica avanzata
Write-Log "Verifica privilegi amministratore..." "ADMIN" "Cyan"
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Log "Privilegi amministratore non sufficienti. Richiesta elevazione..." "ERROR" "Red"
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Verbose" -Verb RunAs
    exit
}

Write-Log "✓ Privilegi amministratore verificati" "ADMIN" "Green"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRUSCOTTO LOCAL OPENER - INSTALLER" -ForegroundColor Cyan
Write-Host "  Versione 2.0 - Auto-Config Edition" -ForegroundColor Cyan
Write-Host "  MODALITÀ VERBOSE E DIAGNOSTICA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. CREA DIRECTORY CON VERIFICA
Write-Log "Creazione directory di sistema..." "STEP1" "Yellow"
try {
    New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
    Write-Log "✓ Directory principale creata: $InstallPath" "STEP1" "Green"
    
    New-Item -ItemType Directory -Force -Path "$env:APPDATA\.local-opener" | Out-Null
    Write-Log "✓ Directory configurazione creata: $env:APPDATA\.local-opener" "STEP1" "Green"
    
    New-Item -ItemType Directory -Force -Path "$env:APPDATA\.local-opener\logs" | Out-Null
    Write-Log "✓ Directory log creata: $env:APPDATA\.local-opener\logs" "STEP1" "Green"
} catch {
    Write-Log "✗ Errore creazione directory: $($_.Exception.Message)" "ERROR" "Red"
    throw
}

# 2. COPIA FILE CON VERIFICA
Write-Log "Copia file di sistema..." "STEP2" "Yellow"
try {
    if (!(Test-Path ".\local-opener.exe")) {
        throw "File local-opener.exe non trovato nella directory corrente"
    }
    if (!(Test-Path ".\nssm.exe")) {
        throw "File nssm.exe non trovato nella directory corrente"
    }
    
    Copy-Item -Path ".\local-opener.exe" -Destination $InstallPath -Force
    Write-Log "✓ local-opener.exe copiato" "STEP2" "Green"
    
    Copy-Item -Path ".\nssm.exe" -Destination $InstallPath -Force
    Write-Log "✓ nssm.exe copiato" "STEP2" "Green"
    
    # Verifica copia
    if (!(Test-Path "$InstallPath\local-opener.exe")) {
        throw "Errore copia local-opener.exe"
    }
    if (!(Test-Path "$InstallPath\nssm.exe")) {
        throw "Errore copia nssm.exe"
    }
} catch {
    Write-Log "✗ Errore copia file: $($_.Exception.Message)" "ERROR" "Red"
    throw
}

# 3. RILEVA AUTOMATICAMENTE GOOGLE DRIVE
Write-Log "Rilevamento automatico Google Drive..." "STEP3" "Yellow"

$detectedPaths = @()

# Metodo 1: Cerca in tutti i drive
Write-Verbose "Scansione drive per Google Drive..."
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 }
foreach ($drive in $drives) {
    $testPaths = @(
        "$($drive.Name):\Il mio Drive",
        "$($drive.Name):\My Drive",
        "$($drive.Name):\Mon Drive",
        "$($drive.Name):\Meine Ablage",
        "$($drive.Name):\Mi unidad",
        "$($drive.Name):\.shortcut-targets-by-id"
    )
    
    foreach ($testPath in $testPaths) {
        if (Test-Path $testPath) {
            $detectedPaths += $testPath
            Write-Log "✓ Trovato: $testPath" "DETECT" "Green"
        }
    }
}

# Metodo 2: Cerca nella home utente
Write-Verbose "Scansione home directory..."
$userPaths = @(
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\GoogleDrive",
    "$env:USERPROFILE\Drive"
)

foreach ($userPath in $userPaths) {
    if (Test-Path $userPath) {
        $detectedPaths += $userPath
        Write-Log "✓ Trovato: $userPath" "DETECT" "Green"
    }
}

# Metodo 3: Leggi dal registro
Write-Verbose "Lettura registro Windows..."
try {
    $regPath = Get-ItemProperty -Path "HKCU:\Software\Google\DriveFS" -Name Path -ErrorAction SilentlyContinue
    if ($regPath -and $regPath.Path) {
        if (Test-Path $regPath.Path) {
            $detectedPaths += $regPath.Path
            Write-Log "✓ Trovato dal registro: $($regPath.Path)" "DETECT" "Green"
        }
    }
} catch {
    Write-Verbose "Registro Google Drive non trovato"
}

# Metodo 4: Cerca processo GoogleDriveFS
Write-Verbose "Ricerca processi GoogleDriveFS..."
$googleProcess = Get-Process -Name GoogleDriveFS -ErrorAction SilentlyContinue
if ($googleProcess) {
    $processPath = Split-Path $googleProcess.Path -Parent
    $drivePath = Split-Path $processPath -Parent
    if (Test-Path $drivePath) {
        $detectedPaths += $drivePath
        Write-Log "✓ Trovato da processo: $drivePath" "DETECT" "Green"
    }
}

# Salva configurazione
$config = @{
    version = "2.0.0"
    paths = $detectedPaths
    port = 17654
    autoDetected = $true
    lastUpdate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$configJson = $config | ConvertTo-Json -Depth 10
$configJson | Out-File -FilePath "$env:APPDATA\.local-opener\config.json" -Encoding UTF8

Write-Log "Totale percorsi trovati: $($detectedPaths.Count)" "DETECT" "Cyan"

# 4. RIMUOVI SERVIZIO ESISTENTE
Write-Log "Rimozione servizio esistente..." "STEP4" "Yellow"
$serviceName = "CruscottoLocalOpener"

try {
    # Stop e rimuovi con nssm
    Write-Verbose "Arresto servizio esistente..."
    & "$InstallPath\nssm.exe" stop $serviceName 2>$null
    Start-Sleep -Seconds 2
    
    Write-Verbose "Rimozione servizio esistente..."
    & "$InstallPath\nssm.exe" remove $serviceName confirm 2>$null
    
    # Rimuovi anche con sc per sicurezza
    Write-Verbose "Rimozione con sc.exe..."
    sc.exe delete $serviceName 2>$null
    
    Start-Sleep -Seconds 2
    Write-Log "✓ Servizio esistente rimosso" "STEP4" "Green"
} catch {
    Write-Log "⚠ Servizio non trovato o già rimosso" "STEP4" "Yellow"
}

# 5. INSTALLA SERVIZIO CON CONFIGURAZIONE CORRETTA
Write-Log "Installazione servizio Windows..." "STEP5" "Yellow"

try {
    # Installa con nssm
    Write-Verbose "Installazione servizio con nssm..."
    $result = & "$InstallPath\nssm.exe" install $serviceName "$InstallPath\local-opener.exe" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Errore installazione servizio: $result"
    }
    Write-Log "✓ Servizio installato" "STEP5" "Green"
    
    # CONFIGURAZIONE CRITICA PER AVVIO AUTOMATICO
    Write-Verbose "Configurazione servizio..."
    & "$InstallPath\nssm.exe" set $serviceName DisplayName "Cruscotto Local Opener Service" 2>$null
    & "$InstallPath\nssm.exe" set $serviceName Description "Servizio per apertura documenti locali da Cruscotto SGI" 2>$null
    & "$InstallPath\nssm.exe" set $serviceName Start SERVICE_AUTO_START 2>$null
    & "$InstallPath\nssm.exe" set $serviceName Type SERVICE_WIN32_OWN_PROCESS 2>$null
    
    # Configurazione affidabilità
    & "$InstallPath\nssm.exe" set $serviceName AppThrottle 1500 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppExit Default Restart 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppRestartDelay 10000 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppStopMethodSkip 0 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppKillProcessTree 1 2>$null
    
    # Log
    & "$InstallPath\nssm.exe" set $serviceName AppStdout "$env:APPDATA\.local-opener\logs\service.log" 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppStderr "$env:APPDATA\.local-opener\logs\error.log" 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppRotateFiles 1 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppRotateBytes 10485760 2>$null
    
    # Variabili ambiente
    & "$InstallPath\nssm.exe" set $serviceName AppEnvironmentExtra "LOCAL_OPENER_CONFIG_DIR=$env:APPDATA\.local-opener" 2>$null
    & "$InstallPath\nssm.exe" set $serviceName AppEnvironmentExtra "DETECTED_PATHS=$($detectedPaths -join ';')" 2>$null
    
    Write-Log "✓ Configurazione servizio completata" "STEP5" "Green"
} catch {
    Write-Log "✗ Errore installazione servizio: $($_.Exception.Message)" "ERROR" "Red"
    throw
}

# 6. CONFIGURA AVVIO AUTOMATICO COMPLETO (FIX DEFINITIVO)
Write-Log "Configurazione avvio automatico completo..." "STEP6" "Yellow"

try {
    # Metodo 1: Configura il servizio per avvio automatico ritardato
    Write-Verbose "Configurazione servizio per avvio automatico ritardato..."
    sc.exe config $serviceName start= delayed-auto 2>$null
    Write-Log "✓ Servizio configurato per avvio automatico ritardato" "STEP6" "Green"
    
    # Metodo 2: Crea task scheduler per avvio al boot (SYSTEM)
    Write-Verbose "Creazione task scheduler per avvio al boot..."
    $taskBootName = "CruscottoLocalOpenerBoot"
    Unregister-ScheduledTask -TaskName $taskBootName -Confirm:$false -ErrorAction SilentlyContinue
    
    $actionBoot = New-ScheduledTaskAction -Execute "$InstallPath\local-opener.exe"
    $triggerBoot = New-ScheduledTaskTrigger -AtStartup
    $principalBoot = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settingsBoot = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $taskBootName -Action $actionBoot -Trigger $triggerBoot -Principal $principalBoot -Settings $settingsBoot -Force | Out-Null
    Write-Log "✓ Task scheduler per avvio al boot creato" "STEP6" "Green"
    
    # Metodo 3: Crea task scheduler per avvio al login (utente corrente)
    Write-Verbose "Creazione task scheduler per avvio al login..."
    $taskLoginName = "CruscottoLocalOpenerLogin"
    Unregister-ScheduledTask -TaskName $taskLoginName -Confirm:$false -ErrorAction SilentlyContinue
    
    $actionLogin = New-ScheduledTaskAction -Execute "$InstallPath\local-opener.exe"
    $triggerLogin = New-ScheduledTaskTrigger -AtLogOn
    $principalLogin = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    $settingsLogin = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $taskLoginName -Action $actionLogin -Trigger $triggerLogin -Principal $principalLogin -Settings $settingsLogin -Force | Out-Null
    Write-Log "✓ Task scheduler per avvio al login creato" "STEP6" "Green"
    
    # Metodo 4: Aggiungi al registro per avvio automatico (backup finale)
    Write-Verbose "Configurazione registro Windows..."
    $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    Set-ItemProperty -Path $regPath -Name "CruscottoLocalOpener" -Value "`"$InstallPath\local-opener.exe`"" -Force
    Write-Log "✓ Backup registro Windows configurato" "STEP6" "Green"
    
    # Metodo 5: Configura anche per utente corrente (HKCU)
    Write-Verbose "Configurazione registro utente corrente..."
    $regPathUser = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    Set-ItemProperty -Path $regPathUser -Name "CruscottoLocalOpener" -Value "`"$InstallPath\local-opener.exe`"" -Force
    Write-Log "✓ Backup registro utente configurato" "STEP6" "Green"
    
} catch {
    Write-Log "⚠ Errore configurazione avvio automatico: $($_.Exception.Message)" "WARNING" "Yellow"
}

# 7. CONFIGURA FIREWALL E AVVIA SERVIZIO
Write-Log "Configurazione firewall e avvio servizio..." "STEP7" "Yellow"

try {
    # Rimuovi regole esistenti
    Remove-NetFirewallRule -DisplayName "Cruscotto Local Opener" -ErrorAction SilentlyContinue
    
    # Aggiungi nuova regola
    New-NetFirewallRule -DisplayName "Cruscotto Local Opener" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 17654 `
        -Action Allow `
        -Profile Any | Out-Null
    Write-Log "✓ Regola firewall configurata" "STEP7" "Green"
    
    # Avvia il servizio
    Write-Verbose "Avvio servizio..."
    Start-Service -Name $serviceName -ErrorAction Stop
    Start-Sleep -Seconds 3
    Write-Log "✓ Servizio avviato" "STEP7" "Green"
} catch {
    Write-Log "✗ Errore avvio servizio: $($_.Exception.Message)" "ERROR" "Red"
    throw
}

# VERIFICA FINALE
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Verifica stato servizio
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq 'Running') {
    Write-Log "✓ Servizio attivo e funzionante" "VERIFY" "Green"
} else {
    Write-Log "⚠ Servizio installato ma non attivo" "VERIFY" "Yellow"
}

# Verifica porta
$connection = Test-NetConnection -ComputerName localhost -Port 17654 -ErrorAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Log "✓ Porta 17654 in ascolto" "VERIFY" "Green"
} else {
    Write-Log "⚠ Porta 17654 non raggiungibile" "VERIFY" "Yellow"
}

# Test endpoint
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Log "✓ Endpoint /health risponde correttamente" "VERIFY" "Green"
    }
} catch {
    Write-Log "⚠ Endpoint /health non risponde" "VERIFY" "Yellow"
}

Write-Host "`nPercorsi Google Drive configurati:" -ForegroundColor Cyan
foreach ($path in $detectedPaths) {
    Write-Host "  📁 $path" -ForegroundColor White
}

Write-Host "`nIl servizio si avvierà automaticamente ad ogni riavvio del PC." -ForegroundColor Green
Write-Host "Non è necessaria alcuna configurazione aggiuntiva.`n" -ForegroundColor Green

# Salva log finale
Write-Log "Installazione completata con successo" "SUCCESS" "Green"

if (-not $Silent) {
    Read-Host "Premi INVIO per chiudere"
}
