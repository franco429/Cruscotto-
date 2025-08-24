@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo              AGGIUNTA MANUALE PERCORSI GOOGLE DRIVE
echo ===============================================================================
echo.
echo Questo script aggiunge manualmente i percorsi Google Drive più comuni
echo al servizio Local Opener.
echo.

echo.
echo ===============================================================================
echo PASSO 1: Verifica servizio attivo
echo ===============================================================================
echo.

REM Verifica che il servizio sia attivo
netstat -ano | findstr :17654 >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRORE] Il servizio Local Opener non è attivo!
    echo.
    echo Esegui prima uno di questi script:
    echo - RISOLVI-ERRORE-1069.bat (consigliato)
    echo - installa-servizio-localsystem.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Servizio Local Opener attivo

echo.
echo ===============================================================================
echo PASSO 2: Aggiunta percorsi Google Drive
echo ===============================================================================
echo.

set ADDED=0

REM Prova ad aggiungere percorsi comuni
for %%D in (G H D E F) do (
    echo [INFO] Controllo unità %%D:\...
    
    REM Controlla se l'unità esiste
    if exist "%%D:\" (
        REM Prova ad aggiungere la radice
        curl -X POST http://127.0.0.1:17654/config -H "Content-Type: application/json" -d "{\"addRoot\":\"%%D:\\\"}" >nul 2>&1
        if %errorLevel% == 0 (
            echo [OK] Aggiunto percorso: %%D:\
            set /a ADDED+=1
        )
        
        REM Prova "Il mio Drive"
        if exist "%%D:\Il mio Drive" (
            curl -X POST http://127.0.0.1:17654/config -H "Content-Type: application/json" -d "{\"addRoot\":\"%%D:\\Il mio Drive\"}" >nul 2>&1
            if %errorLevel% == 0 (
                echo [OK] Aggiunto percorso: %%D:\Il mio Drive
                set /a ADDED+=1
            )
        )
        
        REM Prova "My Drive"
        if exist "%%D:\My Drive" (
            curl -X POST http://127.0.0.1:17654/config -H "Content-Type: application/json" -d "{\"addRoot\":\"%%D:\\My Drive\"}" >nul 2>&1
            if %errorLevel% == 0 (
                echo [OK] Aggiunto percorso: %%D:\My Drive
                set /a ADDED+=1
            )
        )
    )
)

echo.
echo ===============================================================================
echo PASSO 3: Verifica configurazione
echo ===============================================================================
echo.

echo [INFO] Percorsi aggiunti: %ADDED%

if %ADDED% == 0 (
    echo.
    echo [ATTENZIONE] Nessun percorso Google Drive trovato!
    echo.
    echo Possibili cause:
    echo - Google Drive Desktop non è installato
    echo - Google Drive è montato su una lettera diversa
    echo - I file non sono sincronizzati
    echo.
    echo SOLUZIONI:
    echo 1. Installa Google Drive Desktop: https://www.google.com/drive/download/
    echo 2. Attendi che la sincronizzazione sia completa
    echo 3. Esegui nuovamente questo script
) else (
    echo.
    echo [OK] Configurazione completata con successo!
)

echo.
echo ===============================================================================
echo VERIFICA FINALE
echo ===============================================================================
echo.

echo Apertura pagina di configurazione...
start http://127.0.0.1:17654/config

echo.
echo Verifica che i percorsi Google Drive siano visibili nella pagina che si aprirà.
echo.
echo Se i percorsi non sono corretti:
echo 1. Usa la pagina Impostazioni del Cruscotto per aggiungere manualmente
echo 2. Oppure modifica direttamente: %APPDATA%\.local-opener\config.json
echo.

pause
