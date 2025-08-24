@echo off
echo Creazione optimized_local_opener.zip...

REM Usa PowerShell per creare il file ZIP
powershell -NoProfile -Command "Compress-Archive -Path '%~dp0*' -DestinationPath '%~dp0..\optimized_local_opener.zip' -Force"

if %errorLevel% == 0 (
    echo.
    echo [OK] File ZIP creato con successo!
    echo Percorso: %~dp0..\optimized_local_opener.zip
    echo.
    echo Il file è pronto per il download dal browser!
) else (
    echo.
    echo [ERRORE] Creazione ZIP fallita!
)

pause
