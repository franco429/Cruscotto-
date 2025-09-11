@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    CONFIGURAZIONE AUTOMATICA
echo    PERCORSI GOOGLE DRIVE DESKTOP
echo    LOCAL OPENER SERVICE
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    echo.
    echo Per eseguire come amministratore:
    echo 1. Tasto destro su questo file
    echo 2. "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set LOG_DIR=C:\Logs\LocalOpener
set CONFIG_DIR=C:\Logs\LocalOpener\google-drive-config

echo Configurazione automatica percorsi Google Drive Desktop...
echo.

:: Crea directory di configurazione
if not exist "%CONFIG_DIR%" (
    echo - Creazione directory configurazione...
    mkdir "%CONFIG_DIR%" >nul 2>&1
)

:: Verifica se il servizio è attivo
sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Il servizio %SERVICE_NAME% non è attivo!
    echo Avvia prima il servizio con: sc start %SERVICE_NAME%
    pause
    exit /b 1
)

echo Servizio LocalOpener attivo
echo.

:: 1. SCANSIONE AUTOMATICA PERCORSI GOOGLE DRIVE
echo ========================================
echo    1. SCANSIONE AUTOMATICA PERCORSI
echo ========================================
echo.

echo - Rilevamento percorsi Google Drive Desktop...
echo   Questo processo potrebbe richiedere alcuni secondi...
echo.

:: Crea script PowerShell per il rilevamento avanzato
set PS_SCRIPT=%TEMP%\detect-google-drive.ps1
(
echo # Script PowerShell per rilevamento Google Drive Desktop
echo $ErrorActionPreference = 'SilentlyContinue'
echo.
echo Write-Host "Rilevamento percorsi Google Drive Desktop in corso..." -ForegroundColor Yellow
echo.
echo $drivePaths = @^(^)
echo.
echo # 1. Scansione COMPLETA tutte le unità (A: a Z:)
echo Write-Host "Scansione COMPLETA tutte le unità (A: a Z:)..." -ForegroundColor Cyan
echo $allDrives = @('A:', 'B:', 'C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'L:', 'M:', 'N:', 'O:', 'P:', 'Q:', 'R:', 'S:', 'T:', 'U:', 'V:', 'W:', 'X:', 'Y:', 'Z:'^)
echo foreach ($drive in $allDrives^) {
echo     Write-Host "  Scansione unità $drive..." -ForegroundColor Gray
echo     $commonPaths = @(
echo         "$drive\IL MIO DRIVE",
echo         "$drive\MY DRIVE", 
echo         "$drive\Google Drive",
echo         "$drive\GoogleDrive",
echo         "$drive\My Drive",
echo         "$drive\Shared drives",
echo         "$drive\",
echo         "$drive\Google",
echo         "$drive\Drive",
echo         "$drive\GDriveFS",
echo         "$drive\GoogleDriveFS",
echo         "$drive\Google Drive File Stream",
echo         "$drive\Google Drive for Desktop",
echo         "$drive\Google Drive Desktop",
echo         "$drive\Google Drive Stream",
echo         "$drive\Google Drive Sync",
echo         "$drive\Google Drive Backup",
echo         "$drive\Google Drive Mirror",
echo         "$drive\Google Drive Clone",
echo         "$drive\Google Drive Copy",
echo         "$drive\Google Drive Archive",
echo         "$drive\Google Drive Storage",
echo         "$drive\Google Drive Data",
echo         "$drive\Google Drive Files",
echo         "$drive\Google Drive Documents",
echo         "$drive\Google Drive Media",
echo         "$drive\Google Drive Photos",
echo         "$drive\Google Drive Videos",
echo         "$drive\Google Drive Music",
echo         "$drive\Google Drive Downloads",
echo         "$drive\Google Drive Uploads"
echo     ^)
echo.
echo     # Percorsi specifici per unità principali (C:, D:, E:, F:)
echo     if ($drive -in @('C:', 'D:', 'E:', 'F:'^)^) {
echo         $username = $env:USERNAME
echo         $userSpecificPaths = @(
echo             "$drive\Users\$username\Google Drive",
echo             "$drive\Users\$username\GoogleDrive",
echo             "$drive\Users\$username\My Drive",
echo             "$drive\Users\$username\IL MIO DRIVE",
echo             "$drive\Users\$username\Google Drive File Stream",
echo             "$drive\Users\$username\GDrive",
echo             "$drive\Users\$username\Documents\Google Drive",
echo             "$drive\Users\$username\Documents\GoogleDrive",
echo             "$drive\Users\$username\Documents\My Drive",
echo             "$drive\Users\$username\Documents\IL MIO DRIVE",
echo             "$drive\Users\$username\Desktop\Google Drive",
echo             "$drive\Users\$username\Desktop\GoogleDrive",
echo             "$drive\Users\$username\Desktop\My Drive",
echo             "$drive\Users\$username\Desktop\IL MIO DRIVE",
echo             "$drive\Users\$username\Downloads\Google Drive",
echo             "$drive\Users\$username\Downloads\GoogleDrive",
echo             "$drive\Users\$username\Downloads\My Drive",
echo             "$drive\Users\$username\Downloads\IL MIO DRIVE"
echo         ^)
echo         $commonPaths += $userSpecificPaths
echo     }
echo.
echo     # Scansione di tutti i percorsi per questa unità
echo     foreach ($path in $commonPaths^) {
echo         if (Test-Path $path^) {
echo             try {
echo                 $files = Get-ChildItem $path -ErrorAction SilentlyContinue
echo                 if ($files -and $files.Count -gt 0^) {
echo                     $hasGoogleDriveFiles = $files | Where-Object { 
echo                         $_.Name -like "*Google*" -or 
echo                         $_.Name -like "*Drive*" -or 
echo                         $_.Name -like "*My Drive*" -or
echo                         $_.Name -like "*IL MIO DRIVE*" -or
echo                         $_.Name -like "*GDrive*" -or
echo                         $_.Name -like "*DriveFS*" -or
echo                         $_.Name -like "*File Stream*" -or
echo                         $_.Name -like "*Desktop*" -or
echo                         $_.Name -like "*Sync*" -or
echo                         $_.Name -like "*Backup*" -or
echo                         $_.Name -like "*Mirror*" -or
echo                         $_.Name -like "*Clone*" -or
echo                         $_.Name -like "*Copy*" -or
echo                         $_.Name -like "*Archive*" -or
echo                         $_.Name -like "*Storage*" -or
echo                         $_.Name -like "*Data*" -or
echo                         $_.Name -like "*Files*" -or
echo                         $_.Name -like "*Documents*" -or
echo                         $_.Name -like "*Media*" -or
echo                         $_.Name -like "*Photos*" -or
echo                         $_.Name -like "*Videos*" -or
echo                         $_.Name -like "*Music*" -or
echo                         $_.Name -like "*Downloads*" -or
echo                         $_.Name -like "*Uploads*"
echo                     }
echo                     if ($hasGoogleDriveFiles -or $path -eq "$drive\"^) {
echo                         $drivePaths += $path
echo                         Write-Host "    ✓ Trovato: $path" -ForegroundColor Green
echo                     }
echo                 }
echo             } catch {
echo                 Write-Host "    ⚠ Non leggibile: $path" -ForegroundColor Yellow
echo             }
echo         }
echo     }
echo }
echo.
echo # 2. Scansione registro Windows
echo Write-Host "Scansione registro Windows..." -ForegroundColor Cyan
echo $registryQueries = @(
echo     'HKCU:\Software\Google\DriveFS',
echo     'HKCU:\Software\Google\Drive for Desktop',
echo     'HKCU:\Software\Google\Drive File Stream',
echo     'HKLM:\SOFTWARE\Google\DriveFS',
echo     'HKLM:\SOFTWARE\Google\Drive for Desktop',
echo     'HKLM:\SOFTWARE\Google\Drive File Stream'
echo ^)
echo foreach ($regPath in $registryQueries^) {
echo     try {
echo         $dataPath = Get-ItemProperty -Path $regPath -Name "DataPath" -ErrorAction SilentlyContinue
echo         if ($dataPath -and $dataPath.DataPath^) {
echo             if (Test-Path $dataPath.DataPath^) {
echo                 $drivePaths += $dataPath.DataPath
echo                 Write-Host "  ✓ Trovato via registro: $($dataPath.DataPath^)" -ForegroundColor Green
echo             }
echo         }
echo     } catch {
echo         Write-Host "  ⚠ Registro non accessibile: $regPath" -ForegroundColor Yellow
echo     }
echo }
echo.
echo # 3. Risultati
echo Write-Host "`nRisultati rilevamento:" -ForegroundColor Yellow
echo if ($drivePaths.Count -eq 0^) {
echo     Write-Host "  Nessun percorso Google Drive rilevato" -ForegroundColor Red
echo } else {
echo     Write-Host "  Trovati $($drivePaths.Count^) percorsi:" -ForegroundColor Green
echo     foreach ($path in $drivePaths^) {
echo         Write-Host "     • $path" -ForegroundColor White
echo     }
echo }
echo.
echo # 4. Salva risultati in file
echo $results = @{
echo     timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
echo     paths = $drivePaths
echo     count = $drivePaths.Count
echo     username = $env:USERNAME
echo     computername = $env:COMPUTERNAME
echo     scanInfo = "Scansione completa unità A: a Z: con tutti i percorsi possibili"
echo }
echo.
echo $configFile = "%CONFIG_DIR%\google-drive-paths.json"
echo $results | ConvertTo-Json -Depth 3 | Out-File -FilePath $configFile -Encoding UTF8
echo Write-Host "`nConfigurazione salvata in: $configFile" -ForegroundColor Cyan
echo.
echo # 5. Test connessione Local Opener
echo Write-Host "Test connessione Local Opener..." -ForegroundColor Cyan
echo try {
echo     $response = Invoke-RestMethod -Uri "http://127.0.0.1:17654/health" -Method Get -TimeoutSec 5
echo     Write-Host "  Local Opener raggiungibile" -ForegroundColor Green
echo } catch {
echo     Write-Host "  Local Opener non raggiungibile" -ForegroundColor Red
echo     Write-Host "     Verifica che il servizio sia attivo" -ForegroundColor Yellow
echo }
echo.
echo # 6. Test rilevamento via API
echo Write-Host "Test rilevamento via API Local Opener..." -ForegroundColor Cyan
echo try {
echo     $apiResponse = Invoke-RestMethod -Uri "http://127.0.0.1:17654/detect-drive-paths-with-retry?retries=3&delay=1000" -Method Get -TimeoutSec 30
echo     if ($apiResponse.paths -and $apiResponse.paths.Count -gt 0^) {
echo         Write-Host "  API rilevamento funzionante" -ForegroundColor Green
echo         Write-Host "     Percorsi rilevati via API: $($apiResponse.paths.Count^)" -ForegroundColor White
echo         foreach ($apiPath in $apiResponse.paths^) {
echo             Write-Host "       • $apiPath" -ForegroundColor Gray
echo         }
echo     } else {
echo         Write-Host "  ⚠ API rilevamento non ha trovato percorsi" -ForegroundColor Yellow
echo     }
echo } catch {
echo     Write-Host "  Errore API rilevamento" -ForegroundColor Red
echo     Write-Host "     $($_.Exception.Message^)" -ForegroundColor Yellow
echo }
echo.
echo Write-Host "`nConfigurazione completata!" -ForegroundColor Green
echo Write-Host "Percorsi rilevati: $($drivePaths.Count^)" -ForegroundColor White
echo Write-Host "File configurazione: $configFile" -ForegroundColor Cyan
echo Write-Host "Scansione completata: Tutte le unità da A: a Z: controllate" -ForegroundColor Cyan
echo.
echo if ($drivePaths.Count -gt 0^) {
echo     Write-Host "`n🎯 PROSSIMI PASSI:" -ForegroundColor Yellow
echo     Write-Host "1. Apri la web app Pannello Di Controllo SGI" -ForegroundColor White
echo     Write-Host "2. Vai su Impostazioni → Apertura File Locali" -ForegroundColor White
echo     Write-Host "3. Clicca 'Rileva Percorsi Google Drive'" -ForegroundColor White
echo     Write-Host "4. Clicca 'Aggiungi Tutti' per configurare automaticamente" -ForegroundColor White
echo } else {
echo     Write-Host "`n PROBLEMI RILEVATI:" -ForegroundColor Red
echo     Write-Host "• Google Drive Desktop potrebbe non essere installato" -ForegroundColor Yellow
echo     Write-Host "• Google Drive potrebbe non essere montato" -ForegroundColor Yellow
echo     Write-Host "• Verifica che Google Drive sia attivo e sincronizzato" -ForegroundColor Yellow
echo     Write-Host "• Controlla che le unità siano accessibili" -ForegroundColor Yellow
echo }
echo.
echo pause
) > "%PS_SCRIPT%"

:: Esegui script PowerShell
echo - Esecuzione script PowerShell per rilevamento avanzato...
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

:: Pulisci file temporaneo
del "%PS_SCRIPT%" >nul 2>&1

echo.
echo ========================================
echo    CONFIGURAZIONE COMPLETATA
echo ========================================
echo.

:: Verifica risultati
if exist "%CONFIG_DIR%\google-drive-paths.json" (
    echo File configurazione creato
    echo   Percorso: %CONFIG_DIR%\google-drive-paths.json
    echo.
    echo Contenuto file configurazione:
    echo ----------------------------------------
    type "%CONFIG_DIR%\google-drive-paths.json"
    echo ----------------------------------------
    echo.
) else (
    echo File configurazione non creato
    echo.
)

echo 📋 INFORMAZIONI IMPORTANTI:
echo - I percorsi Google Drive sono stati rilevati automaticamente
echo - La configurazione è stata salvata in: %CONFIG_DIR%
echo - Usa la web app per aggiungere i percorsi rilevati
echo.
echo 🚀 PROSSIMI PASSI:
echo 1. Apri la web app Pannello Di Controllo SGI
echo 2. Vai su Impostazioni → Apertura File Locali
echo 3. Clicca "Rileva Percorsi Google Drive"
echo 4. Clicca "Aggiungi Tutti" per configurare automaticamente
echo.
echo 🔧 VERIFICA CONFIGURAZIONE:
echo - File configurazione: %CONFIG_DIR%\google-drive-paths.json
echo - Log servizio: %LOG_DIR%
echo - Stato servizio: sc query %SERVICE_NAME%
echo.

echo Premere un tasto per chiudere...
pause >nul
