@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🔄 Ricreazione file ZIP aggiornato...
echo 📁 Directory corrente: %CD%

REM Verifica che siamo nella directory corretta
if not exist "package.json" (
    echo ❌ Script deve essere eseguito dalla directory optimized_local_opener
    pause
    exit /b 1
)

REM Verifica versione attuale
for /f "tokens=*" %%i in ('powershell -Command "Get-Content 'package.json' | ConvertFrom-Json | Select-Object -ExpandProperty version"') do set VERSION=%%i
for /f "tokens=*" %%i in ('powershell -Command "Get-Content 'package.json' | ConvertFrom-Json | Select-Object -ExpandProperty buildVersion"') do set BUILD_VERSION=%%i

echo 📦 Versione attuale: %VERSION%
echo 🏷️ Build Version: %BUILD_VERSION%

REM Rimuovi ZIP esistente se presente
set OUTPUT_PATH=..\optimized_local_opener_v2.0.2.zip
if exist "%OUTPUT_PATH%" (
    echo 🗑️ Rimozione ZIP esistente...
    del "%OUTPUT_PATH%" /q
)

REM Lista file da includere
echo 🔍 Verifica presenza file...
set FILES=package.json VERSION.txt CHANGELOG-v2.0.md README-INSTALLAZIONE.md auto-config.js AVVIO-AUTOMATICO-UTENTE.bat INSTALLA-DEFINITIVO.bat DISINSTALLA-SERVIZIO.bat installer-definitivo.ps1 verifica-installazione.ps1 STRUTTURA-FINALE.txt VERIFICA-DOWNLOAD.txt nssm.exe local-opener.exe

for %%f in (%FILES%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ %%f (MANCANTE)
    )
)

echo.
echo 📦 Creazione ZIP aggiornato...
echo ⚠️  Utilizzo PowerShell per creazione ZIP...

REM Usa PowerShell per creare ZIP
powershell -ExecutionPolicy Bypass -Command "& { Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory((Get-Location), (Resolve-Path '%OUTPUT_PATH%'), [System.IO.Compression.CompressionLevel]::Optimal, $false) }"

if %ERRORLEVEL% EQU 0 (
    echo ✅ ZIP creato con successo: %OUTPUT_PATH%
    
    REM Verifica dimensione
    for /f "tokens=*" %%i in ('powershell -Command "Get-Item '%OUTPUT_PATH%' | Select-Object -ExpandProperty Length | ForEach-Object { [math]::Round($_ / 1MB, 2) }"') do set SIZE=%%i
    echo 📊 Dimensione ZIP: %SIZE% MB
    
    echo.
    echo 🎉 ZIP aggiornato creato con successo!
    echo 📁 Percorso: %OUTPUT_PATH%
    echo 🔍 Per verificare: controlla VERSION.txt nel ZIP
    echo 💡 Questo dovrebbe risolvere i problemi di cache browser
) else (
    echo ❌ Errore nella creazione ZIP
)

echo.
pause
