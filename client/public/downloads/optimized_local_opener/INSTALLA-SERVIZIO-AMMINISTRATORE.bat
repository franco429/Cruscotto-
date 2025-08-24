@echo off
chcp 65001 >nul
title Local Opener - Installazione Servizio Amministratore
echo ===============================================================================
echo           LOCAL OPENER - INSTALLAZIONE SERVIZIO AMMINISTRATORE
echo ===============================================================================
echo.
echo Questo script installa Local Opener come servizio Windows nativo
echo che si avvia automaticamente al boot del sistema.
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

REM Crea directory di configurazione sistema
if not exist "C:\ProgramData\.local-opener" mkdir "C:\ProgramData\.local-opener"
echo [OK] Directory configurazione sistema creata

REM Crea configurazione iniziale se non esiste
if not exist "C:\ProgramData\.local-opener\config.json" (
    echo [INFO] Creazione configurazione iniziale...
    echo { > "C:\ProgramData\.local-opener\config.json"
    echo   "roots": [], >> "C:\ProgramData\.local-opener\config.json"
    echo   "created": "%date% %time%", >> "C:\ProgramData\.local-opener\config.json"
    echo   "source": "System Service Configuration" >> "C:\ProgramData\.local-opener\config.json"
    echo } >> "C:\ProgramData\.local-opener\config.json"
    echo [OK] Configurazione iniziale creata
)

echo.
echo ===============================================================================
echo PASSO 1: Rimozione servizio esistente (se presente)
echo ===============================================================================
echo.

REM Rimuovi servizio esistente se presente
sc query "CruscottoLocalOpener" >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Servizio esistente trovato, rimozione in corso...
    sc stop "CruscottoLocalOpener" >nul 2>&1
    timeout /t 3 >NUL
    sc delete "CruscottoLocalOpener" >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Servizio esistente rimosso
    ) else (
        echo [ATTENZIONE] Impossibile rimuovere servizio esistente
    )
) else (
    echo [INFO] Nessun servizio esistente trovato
)

echo.
echo ===============================================================================
echo PASSO 2: Creazione script PowerShell per il servizio
echo ===============================================================================
echo.

REM Crea script PowerShell per il servizio
echo # Script PowerShell per servizio Local Opener > "%TEMP%\local-opener-service.ps1"
echo # Versione: 1.0 >> "%TEMP%\local-opener-service.ps1"
echo # Data creazione: %date% %time% >> "%TEMP%\local-opener-service.ps1"
echo. >> "%TEMP%\local-opener-service.ps1"
echo $ServiceName = "CruscottoLocalOpener" >> "%TEMP%\local-opener-service.ps1"
echo $ServiceDisplayName = "Cruscotto Local Opener" >> "%TEMP%\local-opener-service.ps1"
echo $ServiceDescription = "Servizio per apertura documenti locali e integrazione Google Drive" >> "%TEMP%\local-opener-service.ps1"
echo $ServicePath = "%CURRENT_DIR%\local-opener.exe" >> "%TEMP%\local-opener-service.ps1"
echo $ServiceWorkingDir = "%CURRENT_DIR%" >> "%TEMP%\local-opener-service.ps1"
echo. >> "%TEMP%\local-opener-service.ps1"
echo # Verifica se il servizio esiste già >> "%TEMP%\local-opener-service.ps1"
echo $ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue >> "%TEMP%\local-opener-service.ps1"
echo if ($ExistingService) { >> "%TEMP%\local-opener-service.ps1"
echo     Write-Host "Servizio $ServiceName già esistente" >> "%TEMP%\local-opener-service.ps1"
echo     exit 0 >> "%TEMP%\local-opener-service.ps1"
echo } >> "%TEMP%\local-opener-service.ps1"
echo. >> "%TEMP%\local-opener-service.ps1"
echo # Crea il servizio >> "%TEMP%\local-opener-service.ps1"
echo try { >> "%TEMP%\local-opener-service.ps1"
echo     $Service = New-Service -Name $ServiceName -DisplayName $ServiceDisplayName -Description $ServiceDescription -BinaryPathName $ServicePath -StartupType Automatic >> "%TEMP%\local-opener-service.ps1"
echo     Write-Host "Servizio $ServiceName creato con successo" >> "%TEMP%\local-opener-service.ps1"
echo     >> "%TEMP%\local-opener-service.ps1"
echo     # Imposta directory di lavoro >> "%TEMP%\local-opener-service.ps1"
echo     $ServiceConfig = Get-WmiObject -Class Win32_Service -Filter "Name='$ServiceName'" >> "%TEMP%\local-opener-service.ps1"
echo     $ServiceConfig.Change($null, $null, $null, $null, $null, $null, $null, $ServiceWorkingDir, $null, $null, $null) >> "%TEMP%\local-opener-service.ps1"
echo     >> "%TEMP%\local-opener-service.ps1"
echo     # Avvia il servizio >> "%TEMP%\local-opener-service.ps1"
echo     Start-Service -Name $ServiceName >> "%TEMP%\local-opener-service.ps1"
echo     Write-Host "Servizio $ServiceName avviato con successo" >> "%TEMP%\local-opener-service.ps1"
echo     >> "%TEMP%\local-opener-service.ps1"
echo     # Verifica stato >> "%TEMP%\local-opener-service.ps1"
echo     $ServiceStatus = Get-Service -Name $ServiceName >> "%TEMP%\local-opener-service.ps1"
echo     Write-Host "Stato servizio: $($ServiceStatus.Status)" >> "%TEMP%\local-opener-service.ps1"
echo     >> "%TEMP%\local-opener-service.ps1"
echo     # Log del successo >> "%TEMP%\local-opener-service.ps1"
echo     $LogMessage = "Servizio installato e avviato: $(Get-Date)" >> "%TEMP%\local-opener-service.ps1"
echo     $LogMessage | Out-File -FilePath "C:\ProgramData\.local-opener\service-install.log" -Append -Encoding UTF8 >> "%TEMP%\local-opener-service.ps1"
echo     >> "%TEMP%\local-opener-service.ps1"
echo     return @{ Success = $true; Message = "Servizio installato e avviato con successo" } >> "%TEMP%\local-opener-service.ps1"
echo } catch { >> "%TEMP%\local-opener-service.ps1"
echo     Write-Host "Errore durante l'installazione: $($_.Exception.Message)" >> "%TEMP%\local-opener-service.ps1"
echo     $LogMessage = "ERRORE installazione: $($_.Exception.Message) - $(Get-Date)" >> "%TEMP%\local-opener-service.ps1"
echo     $LogMessage | Out-File -FilePath "C:\ProgramData\.local-opener\service-install-error.log" -Append -Encoding UTF8 >> "%TEMP%\local-opener-service.ps1"
echo     return @{ Success = $false; Error = $_.Exception.Message } >> "%TEMP%\local-opener-service.ps1"
echo } >> "%TEMP%\local-opener-service.ps1"

echo [OK] Script PowerShell per servizio creato

echo.
echo ===============================================================================
echo PASSO 3: Installazione servizio Windows
echo ===============================================================================
echo.

echo [INFO] Installazione servizio Windows in corso...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\local-opener-service.ps1"

if %errorLevel% == 0 (
    echo [OK] Servizio installato con successo
) else (
    echo [ERRORE] Installazione servizio fallita
    echo [INFO] Controlla i log in: C:\ProgramData\.local-opener\
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 4: Configurazione firewall
echo ===============================================================================
echo.

echo [INFO] Configurazione firewall per porta 17654...

REM Rimuovi regola esistente
netsh advfirewall firewall delete rule name="Local Opener Service" >nul 2>&1

REM Aggiungi regola firewall per servizio sistema
netsh advfirewall firewall add rule name="Local Opener Service" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Firewall configurato per porta 17654
) else (
    echo [ATTENZIONE] Configurazione firewall fallita
)

echo.
echo ===============================================================================
echo PASSO 5: Verifica installazione
echo ===============================================================================
echo.

echo [INFO] Verifica stato servizio...

REM Verifica che il servizio sia attivo
sc query "CruscottoLocalOpener" | find "RUNNING" >nul
if %errorLevel% == 0 (
    echo [OK] Servizio attivo e in esecuzione
) else (
    echo [ATTENZIONE] Servizio non attivo, tentativo di avvio...
    sc start "CruscottoLocalOpener" >nul 2>&1
    timeout /t 5 >NUL
    
    sc query "CruscottoLocalOpener" | find "RUNNING" >nul
    if %errorLevel% == 0 (
        echo [OK] Servizio avviato con successo
    ) else (
        echo [ERRORE] Impossibile avviare il servizio
        echo [INFO] Controlla i log in: C:\ProgramData\.local-opener\
    )
)

echo.
echo ===============================================================================
echo PASSO 6: Test connessione
echo ===============================================================================
echo.

echo [INFO] Test connessione al servizio...
timeout /t 3 >NUL

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
echo PASSO 7: Configurazione avvio automatico
echo ===============================================================================
echo.

echo [INFO] Verifica configurazione avvio automatico...

REM Verifica che il servizio sia configurato per avvio automatico
sc qc "CruscottoLocalOpener" | find "AUTO_START" >nul
if %errorLevel% == 0 (
    echo [OK] Servizio configurato per avvio automatico
) else (
    echo [ATTENZIONE] Configurazione avvio automatico non corretta
    echo [INFO] Correzione configurazione...
    sc config "CruscottoLocalOpener" start= auto >nul 2>&1
    if %errorLevel% == 0 (
        echo [OK] Avvio automatico configurato
    ) else (
        echo [ERRORE] Impossibile configurare avvio automatico
    )
)

echo.
echo ===============================================================================
echo INSTALLAZIONE COMPLETATA!
echo ===============================================================================
echo.

echo 📊 STATO FINALE:
echo ✅ Servizio Windows installato
echo ✅ Avvio automatico configurato
echo ✅ Firewall configurato
echo ✅ Porta 17654 in ascolto
echo ✅ Configurazione sistema in C:\ProgramData\.local-opener\
echo.

echo 🌐 URL servizio: http://127.0.0.1:17654
echo 📁 Configurazione: C:\ProgramData\.local-opener\
echo 📝 Log servizio: C:\ProgramData\.local-opener\service-install.log
echo.

echo 🔧 GESTIONE SERVIZIO:
echo - Avvia servizio: sc start CruscottoLocalOpener
echo - Ferma servizio: sc stop CruscottoLocalOpener
echo - Riavvia servizio: sc stop CruscottoLocalOpener && sc start CruscottoLocalOpener
echo - Verifica stato: sc query CruscottoLocalOpener
echo.

echo 💡 VANTAGGI DEL SERVIZIO WINDOWS:
echo - Si avvia automaticamente al boot del sistema
echo - Continua a funzionare anche se chiudi la sessione utente
echo - Gestione automatica da parte di Windows
echo - Logging integrato nel sistema
echo - Riavvio automatico in caso di crash
echo - Privilegi di sistema per accesso completo
echo.

echo 🔧 PROSSIMI PASSI:
echo 1. Riavvia il PC per testare l'avvio automatico
echo 2. Apri http://127.0.0.1:17654 nel browser
echo 3. Verifica che il servizio sia attivo dopo il riavvio
echo 4. Se necessario, esegui: diagnostica-servizio.bat
echo.

echo Per disinstallare il servizio:
echo - Esegui: DISINSTALLA-SERVIZIO.bat
echo - Oppure: sc delete CruscottoLocalOpener
echo.

REM Pulisci file temporanei
del "%TEMP%\local-opener-service.ps1" >NUL 2>&1

echo Premi un tasto per chiudere...
pause >NUL
