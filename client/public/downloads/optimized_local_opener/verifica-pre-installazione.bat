@echo off
:: verifica-pre-installazione.bat
:: Verifica che tutti i file necessari siano presenti PRIMA dell'installazione

echo ========================================
echo   VERIFICA PRE-INSTALLAZIONE
echo   CRUSCOTTO LOCAL OPENER v2.0.0
echo ========================================
echo.

:: Cambia alla directory dello script
cd /d "%~dp0"

echo 📁 Directory corrente: %CD%
echo.

:: Verifica file essenziali
echo 🔍 VERIFICA FILE ESSENZIALI:
echo =============================

set MISSING_FILES=0

:: File principali
if exist "local-opener.exe" (
    echo ✓ local-opener.exe
) else (
    echo ❌ local-opener.exe - MANCANTE!
    set /a MISSING_FILES+=1
)

if exist "nssm.exe" (
    echo ✓ nssm.exe
) else (
    echo ❌ nssm.exe - MANCANTE!
    set /a MISSING_FILES+=1
)

if exist "installer-definitivo.ps1" (
    echo ✓ installer-definitivo.ps1
) else (
    echo ❌ installer-definitivo.ps1 - MANCANTE!
    set /a MISSING_FILES+=1
)

if exist "INSTALLA-DEFINITIVO.bat" (
    echo ✓ INSTALLA-DEFINITIVO.bat
) else (
    echo ❌ INSTALLA-DEFINITIVO.bat - MANCANTE!
    set /a MISSING_FILES+=1
)

echo.

:: Verifica file di supporto
echo 🔍 VERIFICA FILE DI SUPPORTO:
echo =============================

if exist "diagnostica-avanzata.ps1" (
    echo ✓ diagnostica-avanzata.ps1
) else (
    echo ⚠ diagnostica-avanzata.ps1 - MANCANTE (opzionale)
)

if exist "verifica-installazione.ps1" (
    echo ✓ verifica-installazione.ps1
) else (
    echo ⚠ verifica-installazione.ps1 - MANCANTE (opzionale)
)

if exist "configura-avvio-utente.ps1" (
    echo ✓ configura-avvio-utente.ps1
) else (
    echo ⚠ configura-avvio-utente.ps1 - MANCANTE (opzionale)
)

if exist "testa-auto-detection.ps1" (
    echo ✓ testa-auto-detection.ps1
) else (
    echo ⚠ testa-auto-detection.ps1 - MANCANTE (opzionale)
)

echo.

:: Verifica documentazione
echo 🔍 VERIFICA DOCUMENTAZIONE:
echo ===========================

if exist "README-INSTALLAZIONE.md" (
    echo ✓ README-INSTALLAZIONE.md
) else (
    echo ⚠ README-INSTALLAZIONE.md - MANCANTE (opzionale)
)

if exist "CHANGELOG-v2.0.md" (
    echo ✓ CHANGELOG-v2.0.md
) else (
    echo ⚠ CHANGELOG-v2.0.md - MANCANTE (opzionale)
)

echo.

:: Risultato finale
echo ========================================
if %MISSING_FILES% == 0 (
    echo ✅ VERIFICA COMPLETATA CON SUCCESSO!
    echo ✅ Tutti i file essenziali sono presenti
    echo.
    echo 🚀 Puoi procedere con l'installazione:
    echo    1. CLIC DESTRO su INSTALLA-DEFINITIVO.bat
    echo    2. Seleziona "Esegui come amministratore"
    echo.
    echo 💡 Alternativa (modalità utente):
    echo    1. CLIC DESTRO su configura-avvio-utente.ps1
    echo    2. Seleziona "Esegui con PowerShell"
) else (
    echo ❌ VERIFICA FALLITA!
    echo ❌ File mancanti: %MISSING_FILES%
    echo.
    echo 🔧 SOLUZIONI:
    echo   1. Assicurati di aver estratto TUTTI i file dal ZIP
    echo   2. Verifica che la cartella contenga tutti i file
    echo   3. Scarica nuovamente il pacchetto se necessario
    echo.
    echo 📁 File presenti nella directory:
    dir /b
)
echo ========================================
echo.
echo Premi un tasto per chiudere...
pause >nul
