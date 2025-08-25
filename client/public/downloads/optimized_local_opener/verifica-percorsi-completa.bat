@echo off
:: verifica-percorsi-completa.bat
:: Verifica completa dei percorsi e delle directory per diagnosticare problemi
:: Versione 2.0.0 - Diagnostica avanzata percorsi

echo ========================================
echo   VERIFICA PERCORSI COMPLETA
echo   CRUSCOTTO LOCAL OPENER v2.0.0
echo   Diagnostica percorsi e directory
echo ========================================
echo.

:: Ottieni informazioni complete sui percorsi
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "CURRENT_DIR=%CD%"
set "SYSTEM32_DIR=%SystemRoot%\System32"

echo 📊 INFORMAZIONI PERCORSI:
echo ===========================
echo.
echo 🔍 Directory script (%~dp0): %SCRIPT_DIR%
echo 🔍 Directory corrente (CD): %CURRENT_DIR%
echo 🔍 Directory sistema (System32): %SYSTEM32_DIR%
echo.

:: Verifica se siamo nella directory corretta
if "%SCRIPT_DIR%"=="%CURRENT_DIR%" (
    echo ✅ PERCORSO CORRETTO: Siamo nella directory dello script
) else (
    echo ❌ PERCORSO ERRATO: Siamo in %CURRENT_DIR% invece che in %SCRIPT_DIR%
    echo.
    echo 🔧 PROBLEMA IDENTIFICATO:
    echo    Il batch file esegue dalla directory %CURRENT_DIR%
    echo    invece che dalla directory %SCRIPT_DIR%
    echo.
    echo 💡 SOLUZIONE:
    echo    Cambio automatico alla directory corretta...
    echo.
    cd /d "%SCRIPT_DIR%"
    echo ✅ Directory cambiata a: %CD%
)

echo.
echo ========================================
echo   VERIFICA FILE ESSENZIALI
echo ========================================
echo.

set MISSING_FILES=0
set TOTAL_FILES=0

:: Verifica file principali con percorsi completi
echo 🔍 VERIFICA FILE PRINCIPALI:
echo =============================

set "FILES_TO_CHECK=local-opener.exe nssm.exe installer-definitivo.ps1 INSTALLA-DEFINITIVO.bat"

for %%f in (%FILES_TO_CHECK%) do (
    set /a TOTAL_FILES+=1
    set "FILE_PATH=%SCRIPT_DIR%\%%f"
    
    if exist "!FILE_PATH!" (
        echo ✅ %%f - TROVATO
        echo    📁 Percorso: !FILE_PATH!
        echo    📊 Dimensione: 
        for %%s in ("!FILE_PATH!") do echo       %%~zs bytes
    ) else (
        echo ❌ %%f - MANCANTE
        echo    📁 Percorso cercato: !FILE_PATH!
        set /a MISSING_FILES+=1
    )
    echo.
)

:: Verifica file di supporto
echo 🔍 VERIFICA FILE DI SUPPORTO:
echo =============================

set "SUPPORT_FILES=verifica-pre-installazione.bat diagnostica-avanzata.ps1 verifica-installazione.ps1 configura-avvio-utente.ps1 testa-auto-detection.ps1 avvia-local-opener.ps1 AVVIO-AUTOMATICO-UTENTE.bat DISINSTALLA-SERVIZIO.bat disinstalla-avanzata.ps1"

for %%f in (%SUPPORT_FILES%) do (
    set "FILE_PATH=%SCRIPT_DIR%\%%f"
    
    if exist "!FILE_PATH!" (
        echo ✅ %%f - TROVATO
    ) else (
        echo ⚠ %%f - MANCANTE (opzionale)
    )
)

echo.
echo ========================================
echo   VERIFICA PERMESSI E ACCESSO
echo ========================================
echo.

:: Verifica permessi di lettura
echo 🔍 VERIFICA PERMESSI:
echo =====================

set "TEST_FILE=%SCRIPT_DIR%\local-opener.exe"
if exist "%TEST_FILE%" (
    echo 📁 Test accesso file: %TEST_FILE%
    
    :: Prova a leggere il file
    dir "%TEST_FILE%" >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ Accesso in lettura: OK
    ) else (
        echo ❌ Accesso in lettura: NEGATO
        set /a MISSING_FILES+=1
    )
    
    :: Prova a eseguire il file
    "%TEST_FILE%" --help >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ Esecuzione file: OK
    ) else (
        echo ⚠ Esecuzione file: Non testabile (normale)
    )
) else (
    echo ❌ File di test non trovato
    set /a MISSING_FILES+=1
)

echo.
echo ========================================
echo   VERIFICA DIRECTORY E STRUTTURA
echo ========================================
echo.

:: Verifica struttura directory
echo 📁 Contenuto directory corrente:
echo ================================
dir /b "%SCRIPT_DIR%"
echo.

:: Verifica sottodirectory
if exist "%SCRIPT_DIR%\assets" (
    echo 📁 Contenuto sottodirectory assets:
    echo ===================================
    dir /b "%SCRIPT_DIR%\assets"
    echo.
) else (
    echo ⚠ Sottodirectory assets non trovata
)

echo ========================================
echo   RISULTATO VERIFICA
echo ========================================
echo.

if %MISSING_FILES% == 0 (
    echo ✅ VERIFICA COMPLETATA CON SUCCESSO!
    echo ✅ Tutti i file essenziali sono presenti e accessibili
    echo ✅ La directory di lavoro è corretta
    echo.
    echo 🚀 Puoi procedere con l'installazione:
    echo    1. CLIC DESTRO su INSTALLA-DEFINITIVO.bat
    echo    2. Seleziona "Esegui come amministratore"
) else (
    echo ❌ VERIFICA FALLITA!
    echo ❌ File mancanti: %MISSING_FILES% su %TOTAL_FILES%
    echo.
    echo 🔧 PROBLEMI IDENTIFICATI:
    if "%SCRIPT_DIR%"=="%CURRENT_DIR%" (
        echo    ✅ Directory di lavoro: CORRETTA
    ) else (
        echo    ❌ Directory di lavoro: ERRATA
        echo       Dovrebbe essere: %SCRIPT_DIR%
        echo       Attualmente è: %CURRENT_DIR%
    )
    echo.
    echo 💡 SOLUZIONI:
    echo   1. Assicurati di aver estratto TUTTI i file dal ZIP
    echo   2. Verifica che la cartella contenga tutti i file
    echo   3. Scarica nuovamente il pacchetto se necessario
    echo   4. Esegui questo script dalla directory corretta
)

echo.
echo ========================================
echo   INFORMAZIONI TECNICHE
echo ========================================
echo.
echo 📊 Statistiche:
echo    • File totali verificati: %TOTAL_FILES%
echo    • File mancanti: %MISSING_FILES%
echo    • Directory script: %SCRIPT_DIR%
echo    • Directory corrente: %CD%
echo    • Sistema operativo: %OS%
echo    • Architettura: %PROCESSOR_ARCHITECTURE%
echo.
echo 🔧 Prossimi passi:
echo    • Se la verifica è OK: procedi con l'installazione
echo    • Se ci sono problemi: scarica nuovamente il pacchetto
echo    • Per troubleshooting: usa diagnostica-avanzata.ps1
echo.
echo Premi un tasto per chiudere...
pause >nul
