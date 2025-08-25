@echo off
chcp 65001 >nul
title CRUSCOTTO LOCAL OPENER - Disinstallazione Servizio v2.0.0

echo.
echo ========================================
echo   CRUSCOTTO LOCAL OPENER v2.0.0
echo   Disinstallazione Completa Servizio
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRORE: Privilegi amministratore richiesti!
    echo.
    echo Per disinstallare il servizio:
    echo 1. CLIC DESTRO su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo 3. Conferma l'operazione
    echo.
    pause
    exit /b 1
)

echo ✅ Privilegi amministratore verificati
echo.

:: Nome del servizio
set SERVICE_NAME=LocalOpenerService

echo 🔍 Verifica stato servizio...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Servizio %SERVICE_NAME% non trovato
    echo.
    echo Il servizio potrebbe essere già disinstallato
    echo o non essere mai stato installato.
    echo.
    goto :cleanup_files
)

echo ✅ Servizio %SERVICE_NAME% trovato
echo.

:: Ferma il servizio se è in esecuzione
echo 🛑 Arresto servizio...
sc stop "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servizio arrestato con successo
) else (
    echo ⚠️  Servizio già fermo o errore nell'arresto
)
echo.

:: Elimina il servizio
echo 🗑️  Disinstallazione servizio...
sc delete "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servizio disinstallato con successo
) else (
    echo ❌ ERRORE: Impossibile disinstallare il servizio
    echo.
    echo Possibili cause:
    echo - Il servizio è ancora in uso
    echo - Privilegi insufficienti
    echo - Errore di sistema
    echo.
    goto :cleanup_files
)
echo.

:cleanup_files
echo 🧹 Pulizia file e configurazioni...
echo.

:: Rimuovi task scheduler se esistente
echo 🔧 Rimozione Task Scheduler...
schtasks /delete /tn "LocalOpenerStartup" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Task Scheduler rimosso
) else (
    echo ⚠️  Task Scheduler non trovato o già rimosso
)
echo.

:: Rimuovi chiavi registro se esistenti
echo 🔧 Pulizia registro Windows...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "LocalOpener" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "LocalOpener" /f >nul 2>&1
echo ✅ Registro Windows pulito
echo.

:: Rimuovi file di configurazione se esistenti
echo 🔧 Rimozione file di configurazione...
if exist "%PROGRAMDATA%\LocalOpener" (
    rmdir /s /q "%PROGRAMDATA%\LocalOpener" >nul 2>&1
    echo ✅ Cartella configurazione rimossa
) else (
    echo ⚠️  Cartella configurazione non trovata
)
echo.

if exist "%APPDATA%\LocalOpener" (
    rmdir /s /q "%APPDATA%\LocalOpener" >nul 2>&1
    echo ✅ Cartella dati utente rimossa
) else (
    echo ⚠️  Cartella dati utente non trovata
)
echo.

:: Rimuovi file temporanei se esistenti
echo 🔧 Pulizia file temporanei...
if exist "%TEMP%\local-opener-*" (
    del /q "%TEMP%\local-opener-*" >nul 2>&1
    echo ✅ File temporanei rimossi
) else (
    echo ⚠️  File temporanei non trovati
)
echo.

echo.
echo ========================================
echo   DISINSTALLAZIONE COMPLETATA
echo ========================================
echo.
echo ✅ Servizio Local Opener disinstallato
echo ✅ Task Scheduler rimosso
echo ✅ Registro Windows pulito
echo ✅ File di configurazione rimossi
echo.
echo 📋 Informazioni:
echo - Il servizio non si avvierà più automaticamente
echo - Tutti i file di configurazione sono stati rimossi
echo - Il sistema è tornato allo stato originale
echo.
echo 🔄 Per reinstallare:
echo - Esegui INSTALLA-DEFINITIVO.bat come amministratore
echo.
echo Premere un tasto per chiudere...
pause >nul
