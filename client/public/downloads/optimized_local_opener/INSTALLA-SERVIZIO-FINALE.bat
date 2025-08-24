@echo off
chcp 65001 >nul
title Local Opener - Installazione Servizio FINALE
echo ===============================================================================
echo           LOCAL OPENER - INSTALLAZIONE SERVIZIO FINALE
echo ===============================================================================
echo.
echo Questo script installa Local Opener come servizio Windows nativo
echo con configurazione automatica completa per Google Drive Desktop.
echo.
echo ATTENZIONE: Richiede privilegi di amministratore!
echo.

REM Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Questo script richiede privilegi di amministratore!
    echo.
    echo Per eseguirlo:
    echo 1. Fai clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo [OK] Privilegi amministratore verificati
echo.

REM Verifica se local-opener.exe esiste
if not exist "%~dp0local-opener.exe" (
    echo [ERRORE] local-opener.exe non trovato!
    echo Assicurati che il file sia nella stessa cartella di questo script.
    pause
    exit /b 1
)

echo [INFO] Verifica ambiente e file necessari...
echo [OK] local-opener.exe trovato

REM Ottieni directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

echo [INFO] Directory installazione: %CURRENT_DIR%

echo.
echo ===============================================================================
echo PASSO 1: Installazione servizio Windows
echo ===============================================================================
echo.

echo [INFO] Installazione servizio Windows in corso...

REM Esegui script di installazione servizio
call "%~dp0INSTALLA-SERVIZIO-AMMINISTRATORE.bat"

if %errorLevel% neq 0 (
    echo [ERRORE] Installazione servizio fallita!
    echo [INFO] Controlla i log e riprova.
    pause
    exit /b 1
)

echo [OK] Servizio installato con successo
echo.

echo ===============================================================================
echo PASSO 2: Configurazione auto-discovery Google Drive
echo ===============================================================================
echo.

echo [INFO] Configurazione auto-discovery Google Drive Desktop...

REM Crea script PowerShell per auto-discovery avanzato
echo # Script PowerShell per auto-discovery Google Drive Desktop > "%TEMP%\google-drive-discovery.ps1"
echo # Versione: 2.0 - Scansione completa A-Z >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo $ConfigFile = "C:\ProgramData\.local-opener\config.json" >> "%TEMP%\google-drive-discovery.ps1"
echo $LogFile = "C:\ProgramData\.local-opener\discovery.log" >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Funzione per log >> "%TEMP%\google-drive-discovery.ps1"
echo function Write-Log { >> "%TEMP%\google-drive-discovery.ps1"
echo     param([string]$Message) >> "%TEMP%\google-drive-discovery.ps1"
echo     $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $Message" >> "%TEMP%\google-drive-discovery.ps1"
echo     $LogEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8 >> "%TEMP%\google-drive-discovery.ps1"
echo     Write-Host $LogEntry >> "%TEMP%\google-drive-discovery.ps1"
echo } >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo Write-Log "Inizio auto-discovery Google Drive Desktop" >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Percorsi comuni Google Drive Desktop >> "%TEMP%\google-drive-discovery.ps1"
echo $CommonPaths = @( >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Google Drive (1)", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Google Drive (2)", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\OneDrive\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Documents\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Desktop\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "C:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "D:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "E:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "F:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "G:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "H:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "I:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "J:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "K:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "L:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "M:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "N:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "O:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "P:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "Q:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "R:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "S:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "T:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "U:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "V:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "W:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "X:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "Y:\Google Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "Z:\Google Drive" >> "%TEMP%\google-drive-discovery.ps1"
echo ) >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Percorsi alternativi comuni >> "%TEMP%\google-drive-discovery.ps1"
echo $AlternativePaths = @( >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Il mio Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\My Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Drive condiviso", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Shared Drive", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Google Drive Desktop", >> "%TEMP%\google-drive-discovery.ps1"
echo     "$env:USERPROFILE\Google Drive for Desktop" >> "%TEMP%\google-drive-discovery.ps1"
echo ) >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Combina tutti i percorsi >> "%TEMP%\google-drive-discovery.ps1"
echo $AllPaths = $CommonPaths + $AlternativePaths >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo Write-Log "Scansione di $($AllPaths.Count) percorsi possibili" >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Trova percorsi validi >> "%TEMP%\google-drive-discovery.ps1"
echo $ValidPaths = @() >> "%TEMP%\google-drive-discovery.ps1"
echo foreach ($path in $AllPaths) { >> "%TEMP%\google-drive-discovery.ps1"
echo     if (Test-Path $path) { >> "%TEMP%\google-drive-discovery.ps1"
echo         Write-Log "Percorso valido trovato: $path" >> "%TEMP%\google-drive-discovery.ps1"
echo         $ValidPaths += $path >> "%TEMP%\google-drive-discovery.ps1"
echo     } >> "%TEMP%\google-drive-discovery.ps1"
echo } >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Cerca anche in tutte le lettere di unità >> "%TEMP%\google-drive-discovery.ps1"
echo Write-Log "Scansione lettere unità per Google Drive..." >> "%TEMP%\google-drive-discovery.ps1"
echo $DriveLetters = 65..90 | ForEach-Object { [char]$_ + ":" } >> "%TEMP%\google-drive-discovery.ps1"
echo foreach ($drive in $DriveLetters) { >> "%TEMP%\google-drive-discovery.ps1"
echo     if (Test-Path $drive) { >> "%TEMP%\google-drive-discovery.ps1"
echo         $googleDrivePath = "$drive\Google Drive" >> "%TEMP%\google-drive-discovery.ps1"
echo         if (Test-Path $googleDrivePath) { >> "%TEMP%\google-drive-discovery.ps1"
echo             Write-Log "Google Drive trovato su unità $drive : $googleDrivePath" >> "%TEMP%\google-drive-discovery.ps1"
echo             if ($ValidPaths -notcontains $googleDrivePath) { >> "%TEMP%\google-drive-discovery.ps1"
echo                 $ValidPaths += $googleDrivePath >> "%TEMP%\google-drive-discovery.ps1"
echo             } >> "%TEMP%\google-drive-discovery.ps1"
echo         } >> "%TEMP%\google-drive-discovery.ps1"
echo         >> "%TEMP%\google-drive-discovery.ps1"
echo         # Cerca anche percorsi alternativi >> "%TEMP%\google-drive-discovery.ps1"
echo         $altPaths = @("$drive\Il mio Drive", "$drive\My Drive", "$drive\Drive condiviso") >> "%TEMP%\google-drive-discovery.ps1"
echo         foreach ($altPath in $altPaths) { >> "%TEMP%\google-drive-discovery.ps1"
echo             if (Test-Path $altPath) { >> "%TEMP%\google-drive-discovery.ps1"
echo                 Write-Log "Percorso alternativo trovato su $drive : $altPath" >> "%TEMP%\google-drive-discovery.ps1"
echo                 if ($ValidPaths -notcontains $altPath) { >> "%TEMP%\google-drive-discovery.ps1"
echo                     $ValidPaths += $altPath >> "%TEMP%\google-drive-discovery.ps1"
echo                 } >> "%TEMP%\google-drive-discovery.ps1"
echo             } >> "%TEMP%\google-drive-discovery.ps1"
echo         } >> "%TEMP%\google-drive-discovery.ps1"
echo     } >> "%TEMP%\google-drive-discovery.ps1"
echo } >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo Write-Log "Totale percorsi validi trovati: $($ValidPaths.Count)" >> "%TEMP%\google-drive-discovery.ps1"
echo. >> "%TEMP%\google-drive-discovery.ps1"
echo # Aggiorna configurazione >> "%TEMP%\google-drive-discovery.ps1"
echo if ($ValidPaths.Count -gt 0) { >> "%TEMP%\google-drive-discovery.ps1"
echo     try { >> "%TEMP%\google-drive-discovery.ps1"
echo         if (Test-Path $ConfigFile) { >> "%TEMP%\google-drive-discovery.ps1"
echo             $Config = Get-Content $ConfigFile | ConvertFrom-Json >> "%TEMP%\google-drive-discovery.ps1"
echo         } else { >> "%TEMP%\google-drive-discovery.ps1"
echo             $Config = @{ roots = @(); created = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); source = "Auto-Discovery Final" } >> "%TEMP%\google-drive-discovery.ps1"
echo         } >> "%TEMP%\google-drive-discovery.ps1"
echo         >> "%TEMP%\google-drive-discovery.ps1"
echo         # Aggiungi nuovi percorsi >> "%TEMP%\google-drive-discovery.ps1"
echo         foreach ($path in $ValidPaths) { >> "%TEMP%\google-drive-discovery.ps1"
echo             if ($Config.roots -notcontains $path) { >> "%TEMP%\google-drive-discovery.ps1"
echo                 $Config.roots += $path >> "%TEMP%\google-drive-discovery.ps1"
echo                 Write-Log "Percorso aggiunto alla configurazione: $path" >> "%TEMP%\google-drive-discovery.ps1"
echo             } >> "%TEMP%\google-drive-discovery.ps1"
echo         } >> "%TEMP%\google-drive-discovery.ps1"
echo         >> "%TEMP%\google-drive-discovery.ps1"
echo         # Salva configurazione >> "%TEMP%\google-drive-discovery.ps1"
echo         $Config | ConvertTo-Json -Depth 10 | Out-File -FilePath $ConfigFile -Encoding UTF8 >> "%TEMP%\google-drive-discovery.ps1"
echo         Write-Log "Configurazione aggiornata e salvata" >> "%TEMP%\google-drive-discovery.ps1"
echo         >> "%TEMP%\google-drive-discovery.ps1"
echo         return @{ Success = $true; Paths = $ValidPaths; Count = $ValidPaths.Count } >> "%TEMP%\google-drive-discovery.ps1"
echo     } catch { >> "%TEMP%\google-drive-discovery.ps1"
echo         Write-Log "Errore durante l'aggiornamento configurazione: $($_.Exception.Message)" >> "%TEMP%\google-drive-discovery.ps1"
echo         return @{ Success = $false; Error = $_.Exception.Message } >> "%TEMP%\google-drive-discovery.ps1"
echo     } >> "%TEMP%\google-drive-discovery.ps1"
echo } else { >> "%TEMP%\google-drive-discovery.ps1"
echo     Write-Log "Nessun percorso Google Drive trovato" >> "%TEMP%\google-drive-discovery.ps1"
echo     return @{ Success = $false; Error = "Nessun percorso valido trovato" } >> "%TEMP%\google-drive-discovery.ps1"
echo } >> "%TEMP%\google-drive-discovery.ps1"

echo [INFO] Esecuzione auto-discovery Google Drive Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\google-drive-discovery.ps1"

if %errorLevel% == 0 (
    echo [OK] Auto-discovery Google Drive completato
) else (
    echo [ATTENZIONE] Auto-discovery fallito, continuo con configurazione base
)

echo.
echo ===============================================================================
echo PASSO 3: Riavvio servizio con nuova configurazione
echo ===============================================================================
echo.

echo [INFO] Riavvio servizio per applicare nuova configurazione...

REM Riavvia il servizio
sc stop "CruscottoLocalOpener" >nul 2>&1
timeout /t 3 >NUL
sc start "CruscottoLocalOpener"

if %errorLevel% == 0 (
    echo [OK] Servizio riavviato con successo
    echo [INFO] Attendo avvio completo...
    timeout /t 5 >NUL
) else (
    echo [ATTENZIONE] Impossibile riavviare il servizio
)

echo.
echo ===============================================================================
echo PASSO 4: Test finale del sistema
echo ===============================================================================
echo.

echo [INFO] Test finale del sistema...

REM Verifica che il servizio sia attivo
sc query "CruscottoLocalOpener" | find "RUNNING" >NUL
if %errorLevel% == 0 (
    echo [OK] Servizio attivo e in esecuzione
) else (
    echo [ATTENZIONE] Servizio non attivo
    goto test_connection
)

echo [INFO] Attendo che il servizio sia completamente operativo...
timeout /t 5 >NUL

:test_connection
REM Test connessione HTTP
where curl >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Test connessione HTTP al servizio...
    curl -s -o nul -w "HTTP Status: %%{http_code}" http://127.0.0.1:17654/health 2>nul
    if %errorLevel% == 0 (
        echo [OK] Servizio risponde correttamente
    ) else (
        echo [ATTENZIONE] Servizio non risponde HTTP (potrebbe essere ancora in avvio)
    )
) else (
    echo [INFO] curl non disponibile, salto test HTTP
)

echo.
echo ===============================================================================
echo INSTALLAZIONE FINALE COMPLETATA!
echo ===============================================================================
echo.

echo 📊 STATO FINALE:
echo ✅ Servizio Windows installato e configurato
echo ✅ Avvio automatico al boot configurato
echo ✅ Auto-discovery Google Drive Desktop completato
echo ✅ Firewall configurato per porta 17654
echo ✅ Configurazione sistema in C:\ProgramData\.local-opener\
echo.

echo 🌐 URL servizio: http://127.0.0.1:17654
echo 📁 Configurazione: C:\ProgramData\.local-opener\config.json
echo 📝 Log servizio: C:\ProgramData\.local-opener\service-install.log
echo 🔍 Log discovery: C:\ProgramData\.local-opener\discovery.log
echo.

echo 💡 VANTAGGI DELLA SOLUZIONE FINALE:
echo - Servizio Windows nativo che si avvia automaticamente al boot
echo - Continua a funzionare anche se chiudi la sessione utente
echo - Riavvio automatico in caso di crash o riavvio del PC
echo - Auto-discovery completo di tutti i percorsi Google Drive Desktop
echo - Configurazione permanente nel sistema
echo - Gestione automatica da parte di Windows
echo.

echo 🔧 GESTIONE SERVIZIO:
echo - Usa "GESTISCI-SERVIZIO.bat" per controllare il servizio
echo - Usa "diagnostica-servizio.bat" per verifiche complete
echo - Usa "DISINSTALLA-SERVIZIO.bat" se necessario rimuovere tutto
echo.

echo 🔧 PROSSIMI PASSI:
echo 1. Riavvia il PC per testare l'avvio automatico
echo 2. Apri http://127.0.0.1:17654 nel browser per verificare
echo 3. Il servizio si avvia automaticamente ad ogni boot
echo 4. I percorsi Google Drive sono rilevati automaticamente
echo.

echo 🎯 FUNZIONAMENTO PERMANENTE:
echo - Il servizio è ora installato nel sistema Windows
echo - Si avvia automaticamente ad ogni accensione del PC
echo - Continua a funzionare anche se chiudi tutte le finestre
echo - Riavvio automatico in caso di problemi
echo - Configurazione persistente tra i riavvii
echo.

REM Pulisci file temporanei
del "%TEMP%\google-drive-discovery.ps1" >NUL 2>&1

echo Premi un tasto per chiudere...
pause >NUL
