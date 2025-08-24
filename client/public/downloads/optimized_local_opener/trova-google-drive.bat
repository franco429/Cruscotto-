@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo                    RICERCA PERCORSI GOOGLE DRIVE
echo ===============================================================================
echo.
echo Questo script cerca tutti i possibili percorsi Google Drive sul tuo PC
echo.

echo Ricerca in corso...
echo.

REM Controlla tutte le unità da C a Z
echo UNITÀ TROVATE CON GOOGLE DRIVE:
echo --------------------------------
set FOUND=0

for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%D:\" (
        REM Controlla se esiste "Il mio Drive"
        if exist "%%D:\Il mio Drive" (
            echo ✅ %%D:\Il mio Drive
            set FOUND=1
        )
        
        REM Controlla se esiste "My Drive"
        if exist "%%D:\My Drive" (
            echo ✅ %%D:\My Drive
            set FOUND=1
        )
        
        REM Controlla se la radice contiene file Google
        if exist "%%D:\*.gdoc" (
            echo ✅ %%D:\ (contiene file Google)
            set FOUND=1
        )
    )
)

if %FOUND%==0 (
    echo ❌ Nessun percorso Google Drive trovato!
    echo.
    echo POSSIBILI CAUSE:
    echo - Google Drive Desktop non è installato
    echo - Google Drive non è sincronizzato
    echo - Google Drive è montato su un percorso diverso
)

echo.
echo ===============================================================================
echo                    CONFIGURAZIONE ATTUALE
echo ===============================================================================
echo.

REM Mostra configurazione attuale
if exist "%APPDATA%\.local-opener\config.json" (
    echo Configurazione utente trovata in:
    echo %APPDATA%\.local-opener\config.json
    echo.
    echo Contenuto:
    type "%APPDATA%\.local-opener\config.json"
) else (
    echo Nessuna configurazione utente trovata
)

echo.

if exist "C:\ProgramData\.local-opener\config.json" (
    echo Configurazione sistema trovata in:
    echo C:\ProgramData\.local-opener\config.json
    echo.
    echo Contenuto:
    type "C:\ProgramData\.local-opener\config.json"
) else (
    echo Nessuna configurazione sistema trovata
)

echo.
echo ===============================================================================
echo                    COSA FARE ORA?
echo ===============================================================================
echo.
echo Se Google Drive non è stato trovato:
echo.
echo 1. Assicurati che Google Drive Desktop sia installato e in esecuzione
echo 2. Verifica che i file siano sincronizzati (icona Google Drive nella system tray)
echo 3. Esegui come AMMINISTRATORE: FORZA-PERCORSI-GOOGLE-DRIVE.bat
echo 4. Oppure esegui: powershell -ExecutionPolicy Bypass .\aggiungi-google-drive.ps1
echo.

pause
