@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo           CONFIGURAZIONE FORZATA PERCORSI GOOGLE DRIVE
echo ===============================================================================
echo.
echo Questo script forza la configurazione dei percorsi Google Drive
echo per il servizio Local Opener già attivo.
echo.

pause

echo.
echo ===============================================================================
echo PASSO 1: Verifica privilegi amministratore
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privilegi amministratore confermati
) else (
    echo [ERRORE] Eseguire come amministratore!
    echo.
    echo ISTRUZIONI:
    echo 1. Clic destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo PASSO 2: Ricerca percorsi Google Drive
echo ===============================================================================
echo.

REM Directory corrente
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

echo [INFO] Esecuzione auto-discovery Google Drive...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CURRENT_DIR%\config-google-drive-localsystem.ps1" -Silent

echo.
echo ===============================================================================
echo PASSO 3: Creazione configurazione manuale
echo ===============================================================================
echo.

REM Crea configurazione con percorsi comuni Google Drive
echo [INFO] Creazione configurazione con percorsi standard...

REM Crea directory se non esistono
if not exist "%APPDATA%\.local-opener" mkdir "%APPDATA%\.local-opener"
if not exist "C:\ProgramData\.local-opener" mkdir "C:\ProgramData\.local-opener"

REM Crea file di configurazione JSON con percorsi comuni
echo { > "%TEMP%\local-opener-config.json"
echo   "roots": [ >> "%TEMP%\local-opener-config.json"

REM Flag per virgola
set FIRST=1

REM Aggiungi percorso esistente
echo     "C:\\Users\\teoni\\Desktop\\SGI - Copia" >> "%TEMP%\local-opener-config.json"
set FIRST=0

REM Controlla percorsi Google Drive comuni
for %%D in (G H D E F) do (
    if exist "%%D:\" (
        echo     , "%%D:\\" >> "%TEMP%\local-opener-config.json"
        echo [OK] Aggiunto percorso: %%D:\
        
        if exist "%%D:\Il mio Drive" (
            echo     , "%%D:\\Il mio Drive" >> "%TEMP%\local-opener-config.json"
            echo [OK] Aggiunto percorso: %%D:\Il mio Drive
        )
        
        if exist "%%D:\My Drive" (
            echo     , "%%D:\\My Drive" >> "%TEMP%\local-opener-config.json"
            echo [OK] Aggiunto percorso: %%D:\My Drive
        )
    )
)

REM Chiudi JSON
echo   ] >> "%TEMP%\local-opener-config.json"
echo } >> "%TEMP%\local-opener-config.json"

REM Copia in entrambe le directory
copy /Y "%TEMP%\local-opener-config.json" "%APPDATA%\.local-opener\config.json" >nul 2>&1
copy /Y "%TEMP%\local-opener-config.json" "C:\ProgramData\.local-opener\config.json" >nul 2>&1

echo [OK] Configurazione salvata

echo.
echo ===============================================================================
echo PASSO 4: Riavvio servizio
echo ===============================================================================
echo.

echo [INFO] Riavvio servizio per applicare nuova configurazione...
net stop CruscottoLocalOpener >nul 2>&1
timeout /t 3 /nobreak >nul
net start CruscottoLocalOpener

echo.
echo ===============================================================================
echo PASSO 5: Verifica configurazione
echo ===============================================================================
echo.

timeout /t 5 /nobreak >nul

echo [INFO] Apertura browser per verifica...
start http://127.0.0.1:17654/config

echo.
echo ===============================================================================
echo CONFIGURAZIONE COMPLETATA!
echo ===============================================================================
echo.
echo Verifica che ora http://127.0.0.1:17654/config mostri tutti i percorsi!
echo.
echo Se Google Drive è montato su una lettera diversa da G:
echo 1. Modifica manualmente il file: %APPDATA%\.local-opener\config.json
echo 2. Aggiungi il percorso corretto nell'array "roots"
echo 3. Riavvia il servizio con: net stop CruscottoLocalOpener && net start CruscottoLocalOpener
echo.

pause
