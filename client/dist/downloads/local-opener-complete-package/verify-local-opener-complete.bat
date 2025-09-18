@echo off
setlocal enabledelayedexpansion
color 0A

:: ========================================
::    VERIFICA COMPLETA LOCAL OPENER
::    Test di Funzionamento End-to-End
:: ========================================

echo ========================================
echo    VERIFICA COMPLETA LOCAL OPENER
echo    Test Completo di Funzionamento
echo ========================================
echo.

:: Inizializza contatori
set TESTS_PASSED=0
set TESTS_FAILED=0
set TOTAL_TESTS=10

:: Test 1: Verifica privilegi amministratore
echo [TEST 1/10] Verifica privilegi amministratore...
net session >nul 2>&1
if %errorLevel% equ 0 (
    echo  PASS: Esecuzione come amministratore
    set /a TESTS_PASSED+=1
) else (
    echo  FAIL: Non sei amministratore
    echo    FIX: Esegui questo script come amministratore
    set /a TESTS_FAILED+=1
)
echo.

:: Test 2: Verifica presenza file exe
echo [TEST 2/10] Verifica presenza cruscotto-local-opener-setup.exe...
if exist "%~dp0cruscotto-local-opener-setup.exe" (
    echo  PASS: File exe trovato
    set /a TESTS_PASSED+=1
) else (
    echo  FAIL: File exe non trovato
    echo    FIX: Assicurati che cruscotto-local-opener-setup.exe sia nella stessa cartella
    set /a TESTS_FAILED+=1
)
echo.

:: Test 3: Verifica Task Scheduler
echo [TEST 3/10] Verifica Task Scheduler...
schtasks /query /tn "LocalOpenerAuto" >nul 2>&1
if %errorLevel% equ 0 (
    echo  PASS: Task LocalOpenerAuto trovato
    set /a TESTS_PASSED+=1
    
    :: Mostra dettagli task
    echo    Dettagli task:
    schtasks /query /tn "LocalOpenerAuto" /fo LIST | findstr /i "TaskName Status Last Next"
) else (
    echo  FAIL: Task LocalOpenerAuto non trovato
    echo    FIX: Esegui setup-local-opener-task.bat come amministratore
    set /a TESTS_FAILED+=1
)
echo.

:: Test 4: Verifica servizio attivo
echo [TEST 4/10] Verifica servizio Local Opener attivo...
curl -s http://127.0.0.1:17654/health >nul 2>&1
if %errorLevel% equ 0 (
    echo  PASS: Servizio attivo e risponde
    set /a TESTS_PASSED+=1
) else (
    echo  FAIL: Servizio non risponde
    echo    FIX: Avvia manualmente il task o riavvia il PC
    set /a TESTS_FAILED+=1
)
echo.

:: Test 5: Verifica Google Drive installato
echo [TEST 5/10] Verifica Google Drive Desktop...
set GDRIVE_FOUND=0
if exist "C:\Program Files\Google\Drive File Stream\GoogleDriveFS.exe" set GDRIVE_FOUND=1
if exist "C:\Program Files (x86)\Google\Drive File Stream\GoogleDriveFS.exe" set GDRIVE_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Google\Drive for Desktop\GoogleDriveFS.exe" set GDRIVE_FOUND=1

if %GDRIVE_FOUND% equ 1 (
    echo  PASS: Google Drive Desktop installato
    set /a TESTS_PASSED+=1
) else (
    echo   WARN: Google Drive Desktop non trovato
    echo    FIX: Installa Google Drive Desktop da https://www.google.com/drive/download/
)
echo.

:: Test 6: Verifica rilevamento percorsi Google Drive
echo [TEST 6/10] Verifica rilevamento percorsi Google Drive...
curl -s http://127.0.0.1:17654/detect-drive-paths > temp_paths.json 2>nul
if %errorLevel% equ 0 (
    findstr /i "paths" temp_paths.json >nul 2>&1
    if %errorLevel% equ 0 (
        echo  PASS: API rilevamento percorsi funzionante
        set /a TESTS_PASSED+=1
        echo    Percorsi rilevati:
        type temp_paths.json | findstr /i "Il mio Drive My Drive Google Drive" 2>nul
    ) else (
        echo  FAIL: API non restituisce percorsi validi
        set /a TESTS_FAILED+=1
    )
) else (
    echo  FAIL: Impossibile contattare API rilevamento
    set /a TESTS_FAILED+=1
)
if exist temp_paths.json del temp_paths.json >nul 2>&1
echo.

:: Test 7: Verifica directory log
echo [TEST 7/10] Verifica directory log...
set LOG_DIR=C:\Logs\LocalOpener
if exist "%LOG_DIR%" (
    echo  PASS: Directory log esistente: %LOG_DIR%
    set /a TESTS_PASSED+=1
    
    :: Controlla se ci sono log
    dir "%LOG_DIR%\*.log" >nul 2>&1
    if %errorLevel% equ 0 (
        echo    Log files trovati:
        :: Mostra solo i primi 5 file
        set count=0
        for /f "tokens=*" %%F in ('dir "%LOG_DIR%\*.log" /b 2^>nul') do (
            if !count! lss 5 (
                echo    - %%F
                set /a count+=1
            )
        )
    )
) else (
    echo   WARN: Directory log non trovata
    echo    FIX: Verrà creata automaticamente al prossimo avvio
)
echo.

:: Test 8: Verifica firewall
echo [TEST 8/10] Verifica regole firewall...
netsh advfirewall firewall show rule name="Local Opener Service" >nul 2>&1
if %errorLevel% equ 0 (
    echo  PASS: Regola firewall configurata
    set /a TESTS_PASSED+=1
) else (
    echo   WARN: Regola firewall non trovata
    echo    FIX: Non critico, ma puoi aggiungerla con:
    echo         netsh advfirewall firewall add rule name="Local Opener Service" dir=in action=allow protocol=TCP localport=17654
)
echo.

:: Test 9: Test apertura file simulata
echo [TEST 9/10] Test apertura file (simulazione)...
:: Crea un file di test
echo Test content > "%TEMP%\test-local-opener.txt"

:: Prova ad aprire via API
curl -s -X POST http://127.0.0.1:17654/open -H "Content-Type: application/json" -d "{\"title\":\"test-local-opener\",\"fileType\":\"txt\",\"candidates\":[\"test-local-opener.txt\"]}" > test_result.json 2>nul

if %errorLevel% equ 0 (
    findstr /i "success" test_result.json >nul 2>&1
    if %errorLevel% equ 0 (
        echo  PASS: API apertura file funzionante
        set /a TESTS_PASSED+=1
    ) else (
        echo   WARN: API risponde ma apertura non riuscita
        echo    Questo è normale se il file non esiste nei percorsi configurati
    )
) else (
    echo  FAIL: API apertura file non risponde
    set /a TESTS_FAILED+=1
)
if exist test_result.json del test_result.json >nul 2>&1
if exist "%TEMP%\test-local-opener.txt" del "%TEMP%\test-local-opener.txt" >nul 2>&1
echo.

:: Test 10: Verifica porta 17654
echo [TEST 10/10] Verifica porta 17654...
netstat -an | findstr ":17654" | findstr "LISTENING" >nul 2>&1
if %errorLevel% equ 0 (
    echo  PASS: Porta 17654 in ascolto
    set /a TESTS_PASSED+=1
) else (
    echo  FAIL: Porta 17654 non in ascolto
    echo    FIX: Il servizio potrebbe non essere attivo
    set /a TESTS_FAILED+=1
)
echo.

:: Riepilogo finale
echo ========================================
echo    RIEPILOGO TEST
echo ========================================
echo.
echo Test superati: %TESTS_PASSED%/%TOTAL_TESTS%
echo Test falliti:  %TESTS_FAILED%/%TOTAL_TESTS%
echo.

:: Valutazione finale
if %TESTS_FAILED% equ 0 (
    color 0A
    echo 🎉 PERFETTO! Tutti i test superati!
    echo Local Opener è configurato correttamente e pronto all'uso.
) else if %TESTS_FAILED% leq 2 (
    color 0E
    echo   QUASI PRONTO! Alcuni test minori falliti.
    echo Local Opener dovrebbe funzionare ma controlla i FIX suggeriti.
) else (
    color 0C
    echo  PROBLEMI RILEVATI! Diversi test falliti.
    echo Segui i FIX suggeriti sopra e riesegui la verifica.
)

echo.
echo ========================================
echo    AZIONI CONSIGLIATE
echo ========================================
echo.

if %TESTS_FAILED% gtr 0 (
    echo 1. Risolvi i problemi segnalati con  FAIL
    echo 2. Riesegui questo script di verifica
    echo 3. Se persistono problemi, esegui debug-local-opener.bat
) else (
    echo 1. Testa l'apertura di un documento da Pannello Di Controllo SGI
    echo 2. Riavvia il PC per verificare l'avvio automatico
    echo 3. Procedi con il deployment ai clienti!
)

echo.
echo Premi un tasto per uscire...
pause >nul
