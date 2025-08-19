@echo off
echo.
echo VERIFICA STATO DISINSTALLAZIONE LOCAL OPENER
echo ============================================
echo.

echo Controllo servizio Windows...
sc query "CruscottoLocalOpener" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PROBLEMA] Servizio ancora presente
) else (
    echo [OK] Servizio rimosso
)

echo.
echo Controllo processi attivi...
tasklist | findstr "local-opener" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PROBLEMA] Processi ancora attivi
) else (
    echo [OK] Nessun processo attivo
)

echo.
echo Controllo porta 17654...
netstat -an | findstr ":17654" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PROBLEMA] Porta ancora in uso
) else (
    echo [OK] Porta libera
)

echo.
echo Controllo file di log...
if exist "%APPDATA%\.local-opener" (
    echo [INFO] File di log ancora presenti
) else (
    echo [OK] File di log rimossi
)

echo.
echo VERIFICA COMPLETATA
echo ===================
echo.
echo Se vedi solo messaggi [OK], la disinstallazione e' riuscita.
echo Se vedi messaggi [PROBLEMA], riavvia il PC e riprova.
echo.
pause
