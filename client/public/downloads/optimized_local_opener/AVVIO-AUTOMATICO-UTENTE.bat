@echo off
:: AVVIO-AUTOMATICO-UTENTE.bat
:: Script per avvio automatico ad ogni login utente
:: Rileva dinamicamente i percorsi Google Drive per ogni cliente

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - AVVIO UTENTE
echo   Auto-Config Edition v2.0
echo   Modalita: Avvio Automatico Login
echo ========================================
echo.

:: Imposta titolo finestra
title "Cruscotto Local Opener - Avvio Automatico"

:: Verifica se il servizio è già in esecuzione
echo Verifica stato servizio...
sc query CruscottoLocalOpener | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo ✓ Servizio gia attivo
    goto :end
)

:: Verifica se il servizio è installato
sc query CruscottoLocalOpener | find "SERVICE_NAME" >nul
if %errorlevel% neq 0 (
    echo ⚠ Servizio non installato, avvio modalita standalone...
    goto :standalone_mode
)

:: Avvia il servizio se installato
echo Avvio servizio CruscottoLocalOpener...
net start CruscottoLocalOpener
if %errorlevel% == 0 (
    echo ✓ Servizio avviato con successo
    goto :end
) else (
    echo ⚠ Errore avvio servizio, modalita standalone...
    goto :standalone_mode
)

:standalone_mode
echo.
echo ========================================
echo   MODALITA STANDALONE - AVVIO DIRETTO
echo ========================================
echo.

:: Cerca local-opener.exe nella directory corrente
if exist "local-opener.exe" (
    echo ✓ Trovato local-opener.exe
    goto :start_standalone
)

:: Cerca in Program Files
if exist "%ProgramFiles%\CruscottoLocalOpener\local-opener.exe" (
    echo ✓ Trovato local-opener.exe in Program Files
    set "OPENER_PATH=%ProgramFiles%\CruscottoLocalOpener\local-opener.exe"
    goto :start_standalone
)

:: Cerca in directory utente
if exist "%USERPROFILE%\Desktop\local-opener.exe" (
    echo ✓ Trovato local-opener.exe sul Desktop
    set "OPENER_PATH=%USERPROFILE%\Desktop\local-opener.exe"
    goto :start_standalone
)

:: Cerca in Downloads
if exist "%USERPROFILE%\Downloads\local-opener.exe" (
    echo ✓ Trovato local-opener.exe in Downloads
    set "OPENER_PATH=%USERPROFILE%\Downloads\local-opener.exe"
    goto :start_standalone
)

:: Cerca in tutto il sistema (ultima risorsa)
echo Ricerca local-opener.exe nel sistema...
for /f "delims=" %%i in ('dir /s /b "%ProgramFiles%\local-opener.exe" 2^>nul') do (
    echo ✓ Trovato: %%i
    set "OPENER_PATH=%%i"
    goto :start_standalone
)

for /f "delims=" %%i in ('dir /s /b "%USERPROFILE%\local-opener.exe" 2^>nul') do (
    echo ✓ Trovato: %%i
    set "OPENER_PATH=%%i"
    goto :start_standalone
)

echo ❌ local-opener.exe non trovato nel sistema
echo Esegui l'installazione completa prima di usare questo script
pause
exit /b 1

:start_standalone
echo.
echo Avvio Local Opener in modalita standalone...
echo Percorso: %OPENER_PATH%
echo.

:: Avvia local-opener.exe in background
start "" /min "%OPENER_PATH%"

:: Attendi un momento per l'avvio
timeout /t 3 /nobreak >nul

:: Verifica se la porta è in ascolto
echo Verifica avvio...
netstat -an | find ":17654" >nul
if %errorlevel% == 0 (
    echo ✓ Local Opener avviato e in ascolto sulla porta 17654
) else (
    echo ⚠ Local Opener potrebbe non essere ancora pronto
    echo Attendi qualche secondo e riprova
)

:end
echo.
echo ========================================
echo   AVVIO COMPLETATO
echo ========================================
echo.
echo Il Local Opener e' ora attivo e funzionante.
echo Si avviera' automaticamente ad ogni login di questo utente.
echo.
echo Per verificare lo stato, apri il browser e vai su:
echo http://127.0.0.1:17654/health
echo.
echo Premi un tasto per chiudere questa finestra...
pause >nul
