@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    DEBUG LOCAL OPENER SERVICE
echo    DIAGNOSTICA COMPLETA
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
set NSSM_PATH=%~dp0nssm.exe
set LOG_DIR=C:\Logs\LocalOpener
set EXE_PATH=%~dp0cruscotto-local-opener-setup.exe

echo Diagnostica completa del servizio %SERVICE_NAME%
echo.

:: 1. Verifica esistenza file necessari
echo ========================================
echo VERIFICA FILE NECESSARI
echo ========================================
echo.

if exist "%EXE_PATH%" (
    echo ✅ cruscotto-local-opener-setup.exe: TROVATO
    echo    Percorso: %EXE_PATH%
    echo    Dimensione: 
    dir "%EXE_PATH%" | find "cruscotto-local-opener-setup.exe"
) else (
    echo ❌ cruscotto-local-opener-setup.exe: NON TROVATO
)

if exist "%NSSM_PATH%" (
    echo ✅ nssm.exe: TROVATO
    echo    Percorso: %NSSM_PATH%
    echo    Dimensione:
    dir "%NSSM_PATH%" | find "nssm.exe"
) else (
    echo ❌ nssm.exe: NON TROVATO
)

echo.

:: 2. Verifica servizio Windows
echo ========================================
echo VERIFICA SERVIZIO WINDOWS
echo ========================================
echo.

sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Servizio %SERVICE_NAME% esiste in Windows
    echo.
    echo Stato attuale:
    sc query "%SERVICE_NAME%"
    echo.
) else (
    echo ❌ Servizio %SERVICE_NAME% NON esiste in Windows
    echo.
)

:: 3. Verifica configurazione NSSM
echo ========================================
echo VERIFICA CONFIGURAZIONE NSSM
echo ========================================
echo.

if exist "%NSSM_PATH%" (
    echo Configurazione NSSM per %SERVICE_NAME%:
    "%NSSM_PATH%" dump "%SERVICE_NAME%"
    echo.
) else (
    echo ❌ NSSM non disponibile per la verifica
    echo.
)

:: 4. Verifica directory log
echo ========================================
echo VERIFICA DIRECTORY LOG
echo ========================================
echo.

if exist "%LOG_DIR%" (
    echo ✅ Directory log: %LOG_DIR%
    echo.
    echo Contenuto directory log:
    dir "%LOG_DIR%" /b
    echo.
) else (
    echo ❌ Directory log non trovata: %LOG_DIR%
    echo.
)

:: 5. Verifica processi attivi
echo ========================================
echo VERIFICA PROCESSI ATTIVI
echo ========================================
echo.

echo Processi LocalOpener attivi:
tasklist | find /i "LocalOpener"
tasklist | find /i "cruscotto"
echo.

:: 6. Verifica porte di rete
echo ========================================
echo VERIFICA PORTE DI RETE
echo ========================================
echo.

echo Porte in ascolto (potrebbero includere LocalOpener):
netstat -an | find "LISTENING"
echo.

:: 7. Verifica avvio automatico
echo ========================================
echo VERIFICA AVVIO AUTOMATICO
echo ========================================
echo.

echo Chiavi di registro per avvio automatico:
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" | find "LocalOpener"
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" | find "LocalOpener"
echo.

:: 8. Test eseguibile
echo ========================================
echo TEST ESEGUIBILE
echo ========================================
echo.

if exist "%EXE_PATH%" (
    echo Test eseguibile %EXE_PATH%...
    echo.
    echo ATTENZIONE: Questo test avvierà l'eseguibile per verificare il funzionamento.
    echo.
    set /p choice="Vuoi testare l'eseguibile? (S/N): "
    if /i "!choice!"=="S" (
        echo.
        echo Avvio test eseguibile...
        start "" "%EXE_PATH%"
        echo.
        echo Eseguibile avviato. Verifica che si apra correttamente.
        echo.
        echo Per terminare il test, chiudi la finestra dell'eseguibile.
        echo.
    ) else (
        echo Test eseguibile saltato.
    )
) else (
    echo ❌ Impossibile testare l'eseguibile: file non trovato
)

echo.
echo ========================================
echo    DIAGNOSTICA COMPLETATA
echo ========================================
echo.
echo 📋 RIEPILOGO VERIFICHE:
echo - File necessari: Verificati
echo - Servizio Windows: Verificato
echo - Configurazione NSSM: Verificata
echo - Directory log: Verificata
echo - Processi attivi: Verificati
echo - Porte di rete: Verificate
echo - Avvio automatico: Verificato
echo - Test eseguibile: Opzionale
echo.
echo 🔧 PROSSIMI PASSI:
echo 1. Analizza i risultati della diagnostica
echo 2. Identifica eventuali problemi
echo 3. Esegui le correzioni necessarie
echo 4. Riavvia il servizio se necessario
echo.
echo Premere un tasto per chiudere...
pause >nul
