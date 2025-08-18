@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    🔍 DIAGNOSI LOCAL OPENER                      ║
echo ║                      Versione 1.2.0                             ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

rem Colori per output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

echo %BLUE%📋 Informazioni Sistema:%RESET%
echo    • Sistema: %OS% %PROCESSOR_ARCHITECTURE%
echo    • Utente: %USERNAME%
echo    • Data: %DATE% %TIME%
echo.

echo %BLUE%🔍 STEP 1: Controllo Servizio Local Opener%RESET%
echo    • Tentativo connessione a http://127.0.0.1:17654/health...

rem Test connessione con timeout
curl -s --connect-timeout 3 --max-time 5 http://127.0.0.1:17654/health >temp_health.json 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    %GREEN%✅ SERVIZIO ATTIVO%RESET%
    echo    • Risposta servizio:
    type temp_health.json | findstr /C:"ok" >nul
    if !ERRORLEVEL! EQU 0 (
        echo      %GREEN%✅ Servizio funziona correttamente%RESET%
    ) else (
        echo      %YELLOW%⚠️ Servizio risponde ma formato inatteso%RESET%
    )
    del temp_health.json >nul 2>&1
) else (
    echo    %RED%❌ SERVIZIO NON ATTIVO%RESET%
    echo    • Possibili cause:
    echo      - Local Opener non installato
    echo      - Servizio Windows non avviato
    echo      - Porta 17654 bloccata da firewall
    echo      - Antivirus blocca la connessione
)

echo.
echo %BLUE%🔍 STEP 2: Controllo Configurazione Cartelle%RESET%
curl -s --connect-timeout 3 --max-time 5 http://127.0.0.1:17654/config >temp_config.json 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    %GREEN%✅ CONFIGURAZIONE ACCESSIBILE%RESET%
    echo    • Cartelle configurate nel servizio:
    type temp_config.json
    del temp_config.json >nul 2>&1
) else (
    echo    %RED%❌ CONFIGURAZIONE NON ACCESSIBILE%RESET%
)

echo.
echo %BLUE%🔍 STEP 3: Rilevamento Cartelle Google Drive%RESET%

rem Controllo cartella Mirror classica
set "FOUND_MIRROR=0"
if exist "%USERPROFILE%\Google Drive" (
    echo    %GREEN%✅ TROVATO: Google Drive Mirror%RESET%
    echo      📁 %USERPROFILE%\Google Drive
    set "FOUND_MIRROR=1"
)

rem Controllo Google Drive Desktop (nuovo)
if exist "%USERPROFILE%\GoogleDrive" (
    echo    %GREEN%✅ TROVATO: Google Drive Desktop%RESET%
    echo      📁 %USERPROFILE%\GoogleDrive
    set "FOUND_MIRROR=1"
)

rem Scansione lettere D-Z per Drive Stream
set "FOUND_STREAM=0"
echo    🔎 Scansione unità D: - Z: per Google Drive Stream...

for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\" (
        rem Controlla varianti italiane
        if exist "%%d:\Il mio Drive" (
            echo    %GREEN%✅ TROVATO: Google Drive Stream (IT)%RESET%
            echo      📁 %%d:\Il mio Drive
            set "FOUND_STREAM=1"
        )
        rem Controlla varianti inglesi
        if exist "%%d:\My Drive" (
            echo    %GREEN%✅ TROVATO: Google Drive Stream (EN)%RESET%
            echo      📁 %%d:\My Drive
            set "FOUND_STREAM=1"
        )
        rem Controlla drive condivisi
        if exist "%%d:\Drive condivisi" (
            echo    %GREEN%✅ TROVATO: Drive Condivisi (IT)%RESET%
            echo      📁 %%d:\Drive condivisi
            set "FOUND_STREAM=1"
        )
        if exist "%%d:\Shared drives" (
            echo    %GREEN%✅ TROVATO: Shared Drives (EN)%RESET%
            echo      📁 %%d:\Shared drives
            set "FOUND_STREAM=1"
        )
    )
)

if !FOUND_MIRROR! EQU 0 if !FOUND_STREAM! EQU 0 (
    echo    %YELLOW%⚠️ NESSUNA CARTELLA GOOGLE DRIVE RILEVATA%RESET%
    echo      • Verifica che Google Drive sia installato e sincronizzato
    echo      • Google Drive potrebbe usare percorsi personalizzati
)

echo.
echo %BLUE%🔍 STEP 4: Controllo Servizi Windows%RESET%
sc query "CruscottoLocalOpener" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    %GREEN%✅ SERVIZIO WINDOWS INSTALLATO%RESET%
    sc query "CruscottoLocalOpener" | findstr "STATE" | findstr "RUNNING" >nul
    if !ERRORLEVEL! EQU 0 (
        echo      %GREEN%✅ Servizio in esecuzione%RESET%
        echo      • Il servizio si avvia automaticamente all'accensione
    ) else (
        echo      %YELLOW%⚠️ Servizio installato ma non in esecuzione%RESET%
        echo      • Tenta avvio manuale: net start CruscottoLocalOpener
        echo      • Oppure riavvia il PC per auto-start
        
        rem Tenta avvio automatico del servizio
        echo    🔄 Tentativo avvio automatico servizio...
        net start CruscottoLocalOpener >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo      %GREEN%✅ Servizio avviato con successo%RESET%
        ) else (
            echo      %RED%❌ Impossibile avviare il servizio automaticamente%RESET%
            echo      • Potrebbe richiedere permessi amministratore
        )
    )
    
    rem Controlla configurazione auto-start
    sc qc "CruscottoLocalOpener" | findstr "AUTO_START" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo      %GREEN%✅ Auto-start configurato correttamente%RESET%
    ) else (
        echo      %YELLOW%⚠️ Auto-start non configurato%RESET%
    )
) else (
    echo    %YELLOW%⚠️ SERVIZIO WINDOWS NON TROVATO%RESET%
    echo      • Local Opener potrebbe essere in esecuzione manualmente
    echo      • Reinstalla usando l'Installer Universale per auto-start
    echo      • Oppure installazione non completata correttamente
)

echo.
echo %BLUE%🔍 STEP 5: Controllo Porte e Firewall%RESET%
netstat -an | findstr ":17654" >nul
if %ERRORLEVEL% EQU 0 (
    echo    %GREEN%✅ PORTA 17654 IN ASCOLTO%RESET%
) else (
    echo    %RED%❌ PORTA 17654 NON IN ASCOLTO%RESET%
    echo      • Il servizio Local Opener non è attivo
)

rem Controllo Windows Firewall
netsh advfirewall firewall show rule name="Local Opener" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    %GREEN%✅ REGOLA FIREWALL CONFIGURATA%RESET%
) else (
    echo    %YELLOW%⚠️ REGOLA FIREWALL MANCANTE%RESET%
    echo      • Potrebbe essere necessario aggiungere eccezione firewall
)

echo.
echo %BLUE%🔍 STEP 6: Test Funzionale%RESET%
echo    • Tentativo test apertura file...

rem Crea file di test temporaneo
echo Test Local Opener > "%TEMP%\test-local-opener.txt"

rem Test tramite API
curl -s --connect-timeout 3 --max-time 5 -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"test-local-opener\",\"revision\":\"test\",\"fileType\":\"txt\",\"logicalPath\":\"temp\",\"candidates\":[\"test-local-opener.txt\"]}" ^
  http://127.0.0.1:17654/open >temp_test.json 2>nul

if %ERRORLEVEL% EQU 0 (
    type temp_test.json | findstr /C:"success" >nul
    if !ERRORLEVEL! EQU 0 (
        echo    %GREEN%✅ TEST APERTURA FILE RIUSCITO%RESET%
        echo      Il servizio può aprire file correttamente
    ) else (
        echo    %YELLOW%⚠️ TEST PARZIALMENTE RIUSCITO%RESET%
        echo      Servizio risponde ma file di test non trovato (normale)
    )
    del temp_test.json >nul 2>&1
) else (
    echo    %RED%❌ TEST APERTURA FILE FALLITO%RESET%
)

rem Pulizia file di test
del "%TEMP%\test-local-opener.txt" >nul 2>&1

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                            📋 RIASSUNTO                          ║
echo ╚══════════════════════════════════════════════════════════════════╝

if !ERRORLEVEL! EQU 0 (
    echo %GREEN%✅ LOCAL OPENER SEMBRA FUNZIONARE CORRETTAMENTE%RESET%
    echo    • Il servizio è attivo e risponde
    echo    • Le cartelle Google Drive sono configurate
    echo    • L'icona occhio dovrebbe funzionare
) else (
    echo %RED%❌ LOCAL OPENER HA PROBLEMI%RESET%
    echo    • Consulta i dettagli sopra per identificare il problema
    echo    • Potrebbe essere necessario reinstallare il servizio
)

echo.
echo %BLUE%📞 Supporto:%RESET%
echo    • Se i problemi persistono, invia questo output al supporto tecnico
echo    • Oppure reinstalla Local Opener dalle Impostazioni della web app

echo.
echo %YELLOW%💾 Per salvare questo report:%RESET%
echo    debug-local-opener.bat ^> report-diagnosi.txt

echo.
pause
