@echo off
title Cruscotto Local Opener - Compatibilità Universale
echo.
echo ==========================================
echo   CRUSCOTTO LOCAL OPENER - Portable
echo ==========================================
echo.

rem Lista eseguibili disponibili
set "available="
if exist "local-opener-x64.exe" set "available=%available% x64"
if exist "local-opener-x86.exe" set "available=%available% x86"
if exist "local-opener-x64-legacy.exe" set "available=%available% legacy"

echo Versioni disponibili:%available%
echo.

rem Selezione automatica intelligente
set "EXE="

rem 1. Prova x64 moderno (più compatibile)
if exist "local-opener-x64.exe" (
    set "EXE=local-opener-x64.exe"
    set "ARCH=x64 (moderno)"
    goto :found
)

rem 2. Prova x86 per sistemi vecchi
if exist "local-opener-x86.exe" (
    set "EXE=local-opener-x86.exe" 
    set "ARCH=x86 (compatibilità)"
    goto :found
)

rem 3. Prova legacy se tutto il resto fallisce
if exist "local-opener-x64-legacy.exe" (
    set "EXE=local-opener-x64-legacy.exe"
    set "ARCH=x64 (legacy)"
    goto :found
)

:found
if "%EXE%"=="" (
    echo ❌ ERRORE: Nessun eseguibile trovato!
    echo.
    echo Contatta il supporto tecnico.
    pause
    exit /b 1
)

echo ✅ Selezionato: %ARCH%
echo ✅ Eseguibile: %EXE%
echo.
echo 🚀 Avvio in corso...

start "" "%EXE%"

echo.
echo ✅ Local Opener avviato!
echo Il servizio è attivo su http://127.0.0.1:17654
echo.
echo Puoi chiudere questa finestra e tornare al browser.
pause
