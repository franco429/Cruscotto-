# testa-auto-detection.ps1
# Script di test per verificare l'auto-detection completo
# Simula esattamente quello che fa il servizio principale

Write-Host "🧪 TEST AUTO-DETECTION COMPLETO" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host "Simula esattamente il rilevamento del servizio principale" -ForegroundColor Magenta
Write-Host ""

# 1. TEST SCANSIONE DRIVE COMPLETA
Write-Host "1️⃣ TEST SCANSIONE DRIVE COMPLETA" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

$detectedPaths = @()
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 }

Write-Host "Drive disponibili: $($drives.Name -join ', ')" -ForegroundColor Cyan

foreach ($drive in $drives) {
    Write-Host "`n🔍 Scansione drive $($drive.Name):" -ForegroundColor White
    
    # Percorsi Google Drive standard
    $testPaths = @(
        "$($drive.Name):\Il mio Drive",
        "$($drive.Name):\My Drive",
        "$($drive.Name):\Mon Drive",
        "$($drive.Name):\Meine Ablage",
        "$($drive.Name):\Mi unidad",
        "$($drive.Name):\Google Drive",
        "$($drive.Name):\GoogleDrive"
    )
    
    foreach ($testPath in $testPaths) {
        if (Test-Path $testPath) {
            $detectedPaths += $testPath
            Write-Host "  ✅ Trovato: $testPath" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Non trovato: $testPath" -ForegroundColor Gray
        }
    }
    
    # Shortcut targets per Google Drive Desktop
    $shortcutPath = "$($drive.Name):\.shortcut-targets-by-id"
    if (Test-Path $shortcutPath) {
        $detectedPaths += $shortcutPath
        Write-Host "  ✅ Trovato shortcut-targets: $shortcutPath" -ForegroundColor Green
        
        # Scansione sottocartelle shortcut
        try {
            $shortcuts = Get-ChildItem -Path $shortcutPath -Directory -ErrorAction SilentlyContinue
            foreach ($shortcut in $shortcuts) {
                $fullShortcutPath = $shortcut.FullName
                $detectedPaths += $fullShortcutPath
                Write-Host "    ✅ Shortcut: $fullShortcutPath" -ForegroundColor Green
            }
        } catch {
            Write-Host "    ⚠ Errore scansione shortcut: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ Non trovato: $shortcutPath" -ForegroundColor Gray
    }
}

# 2. TEST HOME DIRECTORY UTENTE
Write-Host "`n2️⃣ TEST HOME DIRECTORY UTENTE" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$userPaths = @(
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\GoogleDrive",
    "$env:USERPROFILE\Drive",
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\Downloads"
)

foreach ($userPath in $userPaths) {
    if (Test-Path $userPath) {
        $detectedPaths += $userPath
        Write-Host "  ✅ Trovato: $userPath" -ForegroundColor Green
        
        # Se è Desktop, scansione per cartelle progetto
        if ($userPath -like "*Desktop*") {
            try {
                $desktopItems = Get-ChildItem -Path $userPath -Directory -ErrorAction SilentlyContinue
                foreach ($item in $desktopItems) {
                    $itemPath = $item.FullName
                    # Aggiungi cartelle che potrebbero contenere documenti importanti
                    if ($item.Name -like "*SGI*" -or $item.Name -like "*progetto*" -or $item.Name -like "*lavoro*" -or $item.Name -like "*azienda*" -or $item.Name -like "*ultimissimi*") {
                        $detectedPaths += $itemPath
                        Write-Host "    ✅ Cartella progetto: $itemPath" -ForegroundColor Green
                    }
                }
            } catch {
                Write-Host "    ⚠ Errore scansione Desktop: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ❌ Non trovato: $userPath" -ForegroundColor Gray
    }
}

# 3. TEST REGISTRO WINDOWS
Write-Host "`n3️⃣ TEST REGISTRO WINDOWS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $regPath = Get-ItemProperty -Path "HKCU:\Software\Google\DriveFS" -Name Path -ErrorAction SilentlyContinue
    if ($regPath -and $regPath.Path) {
        if (Test-Path $regPath.Path) {
            $detectedPaths += $regPath.Path
            Write-Host "  ✅ Trovato dal registro: $($regPath.Path)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Percorso registro non accessibile: $($regPath.Path)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ Registro Google Drive non trovato" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Errore lettura registro: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. TEST PROCESSI GOOGLEDRIVEFS
Write-Host "`n4️⃣ TEST PROCESSI GOOGLEDRIVEFS" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

$googleProcess = Get-Process -Name GoogleDriveFS -ErrorAction SilentlyContinue
if ($googleProcess) {
    $processPath = Split-Path $googleProcess.Path -Parent
    $drivePath = Split-Path $processPath -Parent
    if (Test-Path $drivePath) {
        $detectedPaths += $drivePath
        Write-Host "  ✅ Trovato da processo: $drivePath" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Percorso processo non accessibile: $drivePath" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Processo GoogleDriveFS non trovato" -ForegroundColor Gray
}

# 5. TEST ONEDRIVE
Write-Host "`n5️⃣ TEST ONEDRIVE" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$oneDrivePaths = @(
    "$env:USERPROFILE\OneDrive\Google Drive",
    "$env:USERPROFILE\OneDrive - Aziendale\Google Drive",
    "$env:USERPROFILE\OneDrive - Personal\Google Drive",
    "$env:USERPROFILE\OneDrive"
)

foreach ($oneDrivePath in $oneDrivePaths) {
    if (Test-Path $oneDrivePath) {
        $detectedPaths += $oneDrivePath
        Write-Host "  ✅ Trovato in OneDrive: $oneDrivePath" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Non trovato: $oneDrivePath" -ForegroundColor Gray
    }
}

# 6. RISULTATI FINALI
Write-Host "`n🎯 RISULTATI FINALI" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

# Rimuovi duplicati e ordina
$detectedPaths = $detectedPaths | Sort-Object -Unique

Write-Host "📊 Statistiche rilevamento:" -ForegroundColor Cyan
Write-Host "  • Drive scansionati: $($drives.Count)" -ForegroundColor White
Write-Host "  • Percorsi trovati: $($detectedPaths.Count)" -ForegroundColor White
Write-Host "  • Utente corrente: $env:USERNAME" -ForegroundColor White
Write-Host "  • Profilo utente: $env:USERPROFILE" -ForegroundColor White

Write-Host "`n📁 PERCORSI RILEVATI:" -ForegroundColor Cyan
foreach ($path in $detectedPaths) {
    Write-Host "  📁 $path" -ForegroundColor White
}

# 7. VERIFICA CONFIGURAZIONE
Write-Host "`n🔍 VERIFICA CONFIGURAZIONE" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$userConfigDir = "$env:APPDATA\.local-opener"
$userConfigFile = "$userConfigDir\user-config.json"

if (Test-Path $userConfigFile) {
    try {
        $config = Get-Content $userConfigFile | ConvertFrom-Json
        Write-Host "  ✅ Configurazione utente trovata" -ForegroundColor Green
        Write-Host "  📊 Percorsi configurati: $($config.detectedPaths.Count)" -ForegroundColor White
        Write-Host "  🔄 Ultimo aggiornamento: $($config.lastUpdate)" -ForegroundColor White
        
        # Confronta percorsi
        $configPaths = $config.detectedPaths | Sort-Object
        $currentPaths = $detectedPaths | Sort-Object
        
        if (Compare-Object $configPaths $currentPaths) {
            Write-Host "  ⚠ Differenze rilevate tra configurazione e rilevamento corrente" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ Configurazione e rilevamento corrente identici" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ Errore lettura configurazione: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ Configurazione utente non trovata" -ForegroundColor Red
    Write-Host "  💡 Esegui 'configura-avvio-utente.ps1' per creare la configurazione" -ForegroundColor Yellow
}

# 8. SUGGERIMENTI
Write-Host "`n💡 SUGGERIMENTI" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

if ($detectedPaths.Count -eq 0) {
    Write-Host "  ❌ Nessun percorso rilevato!" -ForegroundColor Red
    Write-Host "  🔧 Verifica che Google Drive sia installato e sincronizzato" -ForegroundColor Yellow
    Write-Host "  🔧 Controlla i permessi di accesso ai drive" -ForegroundColor Yellow
} elseif ($detectedPaths.Count -lt 3) {
    Write-Host "  ⚠ Pochi percorsi rilevati" -ForegroundColor Yellow
    Write-Host "  🔧 Verifica che tutti i drive siano accessibili" -ForegroundColor Yellow
    Write-Host "  🔧 Controlla la sincronizzazione Google Drive" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Rilevamento completo e funzionante!" -ForegroundColor Green
    Write-Host "  🚀 Il sistema è pronto per l'uso" -ForegroundColor Green
}

Write-Host "`n🎯 PROSSIMI PASSI:" -ForegroundColor Cyan
Write-Host "  1. Se il rilevamento è corretto, esegui 'configura-avvio-utente.ps1'" -ForegroundColor White
Write-Host "  2. Testa l'avvio con 'avvia-local-opener.ps1'" -ForegroundColor White
Write-Host "  3. Verifica funzionamento: http://127.0.0.1:17654/health" -ForegroundColor White

Write-Host "`n=================================" -ForegroundColor Magenta
Write-Host "Test auto-detection completato!" -ForegroundColor Magenta
Write-Host "Premi INVIO per chiudere..." -ForegroundColor Cyan
Read-Host
