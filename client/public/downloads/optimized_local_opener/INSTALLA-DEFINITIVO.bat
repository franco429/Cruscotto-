@echo off
:: INSTALLA-DEFINITIVO.bat
:: Wrapper per installazione con privilegi admin automatici
:: CORREZIONE DEFINITIVA - Gestione percorsi corretta

:: Ottieni il percorso assoluto dello script
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Cambia alla directory dello script
cd /d "%SCRIPT_DIR%"

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - INSTALLER
echo   Auto-Config Edition v2.0
echo   MODALITA VERBOSE ABILITATA
echo ========================================
echo.

echo 📁 Directory script: %SCRIPT_DIR%
echo 📁 Directory corrente: %CD%
echo.

:: Verifica se siamo già admin
net session >nul 2>&1
if %errorlevel% == 0 (
    :: Siamo admin, esegui PowerShell
    echo ✓ Privilegi amministratore verificati
    echo.
    echo Avvio installer PowerShell...
    echo.
    
    :: Verifica che il file installer esista
    set "INSTALLER_PATH=%SCRIPT_DIR%\installer-definitivo.ps1"
    echo 🔍 Verifica file installer...
    echo 📁 Percorso completo: %INSTALLER_PATH%
    echo.
    
    if exist "%INSTALLER_PATH%" (
        echo ✅ File installer trovato!
        echo.
        echo 🚀 Avvio installazione...
        echo.
        
        :: Esegui PowerShell con percorso assoluto
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER_PATH%" -Verbose
        set INSTALL_EXIT_CODE=%errorlevel%
        
        echo.
        echo 📊 Codice di uscita PowerShell: %INSTALL_EXIT_CODE%
    ) else (
        echo ❌ ERRORE CRITICO: File installer non trovato!
        echo.
        echo 🔍 VERIFICA FILE:
        echo    Directory script: %SCRIPT_DIR%
        echo    File cercato: installer-definitivo.ps1
        echo.
        echo 📁 File presenti nella directory:
        dir /b "*.ps1"
        echo.
        echo 🔧 SOLUZIONI:
        echo   1. Assicurati che tutti i file siano nella stessa cartella
        echo   2. Esegui 'verifica-pre-installazione.bat' per diagnosticare
        echo   3. Scarica nuovamente il pacchetto se necessario
        echo.
        set INSTALL_EXIT_CODE=1
    )
) else (
    :: Non siamo admin, richiedi elevazione
    echo ⚠ Privilegi amministratore non sufficienti
    echo Richiesta elevazione privilegi...
    echo.
    echo 📁 Percorso script: %SCRIPT_DIR%
    echo 📁 File da elevare: %SCRIPT_DIR%\INSTALLA-DEFINITIVO.bat
    echo.
    
    :: Richiedi elevazione con percorso assoluto
    powershell.exe -Command "Start-Process '%SCRIPT_DIR%\INSTALLA-DEFINITIVO.bat' -Verb RunAs"
    exit /b
)

echo.
echo ========================================
if %INSTALL_EXIT_CODE% == 0 (
    echo ✅ INSTALLAZIONE COMPLETATA CON SUCCESSO!
    echo ✅ Il servizio CruscottoLocalOpener è ora attivo
    echo ✅ Avvio automatico configurato al boot
    echo ✅ Auto-detection Google Drive completato
) else (
    echo ❌ INSTALLAZIONE FALLITA!
    echo ❌ Codice errore: %INSTALL_EXIT_CODE%
    echo.
    echo 🔧 SOLUZIONI:
    echo   1. Verifica che tutti i file siano nella stessa cartella
    echo   2. Esegui 'verifica-pre-installazione.bat' per identificare problemi
    echo   3. Esegui 'diagnostica-avanzata.ps1' per troubleshooting avanzato
    echo   4. Controlla i log in %APPDATA%\.local-opener\logs\
    echo.
    echo 📁 Directory script: %SCRIPT_DIR%
    echo 📁 File installer: %INSTALLER_PATH%
)
echo ========================================
echo.
echo Premi un tasto per chiudere...
pause >nul
