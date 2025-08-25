@echo off
:: INSTALLA-DEFINITIVO.bat
:: Wrapper per installazione con privilegi admin automatici
:: CORREZIONE DEFINITIVA - Gestione percorsi corretta

:: Cambia alla directory dello script
cd /d "%~dp0"

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - INSTALLER
echo   Auto-Config Edition v2.0
echo   MODALITA VERBOSE ABILITATA
echo ========================================
echo.

:: Verifica se siamo già admin
net session >nul 2>&1
if %errorlevel% == 0 (
    :: Siamo admin, esegui PowerShell
    echo ✓ Privilegi amministratore verificati
    echo.
    echo Avvio installer PowerShell...
    echo.
    echo Directory corrente: %CD%
    echo File installer: %CD%installer-definitivo.ps1
    echo.
    
    :: Verifica che il file esista
    if exist "installer-definitivo.ps1" (
        echo ✓ File installer trovato, avvio installazione...
        echo.
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "installer-definitivo.ps1" -Verbose
        set INSTALL_EXIT_CODE=%errorlevel%
    ) else (
        echo ❌ ERRORE: File installer-definitivo.ps1 non trovato!
        echo.
        echo Directory corrente: %CD%
        echo File presenti:
        dir *.ps1
        echo.
        echo Assicurati che tutti i file siano nella stessa cartella.
        set INSTALL_EXIT_CODE=1
    )
) else (
    :: Non siamo admin, richiedi elevazione
    echo ⚠ Privilegi amministratore non sufficienti
    echo Richiesta elevazione privilegi...
    echo.
    powershell.exe -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ========================================
if %INSTALL_EXIT_CODE% == 0 (
    echo ✓ INSTALLAZIONE COMPLETATA CON SUCCESSO!
    echo ✓ Il servizio CruscottoLocalOpener è ora attivo
    echo ✓ Avvio automatico configurato al boot
    echo ✓ Auto-detection Google Drive completato
) else (
    echo ❌ INSTALLAZIONE FALLITA!
    echo ❌ Codice errore: %INSTALL_EXIT_CODE%
    echo.
    echo 🔧 SOLUZIONI:
    echo   1. Verifica che tutti i file siano nella stessa cartella
    echo   2. Esegui 'diagnostica-avanzata.ps1' per identificare problemi
    echo   3. Controlla i log in %APPDATA%\.local-opener\logs\
)
echo ========================================
echo.
echo Premi un tasto per chiudere...
pause >nul
