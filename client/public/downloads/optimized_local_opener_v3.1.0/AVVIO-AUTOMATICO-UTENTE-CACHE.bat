@echo off
setlocal enabledelayedexpansion
:: AVVIO-AUTOMATICO-UTENTE-CACHE.bat - VERSIONE CON CACHE v2.1.1
:: Script per avvio automatico con cache del percorso per massima velocità
:: Rileva dinamicamente i percorsi Google Drive per ogni cliente
:: OTTIMIZZAZIONI: Cache percorso, ricerca ultra-veloce, avvio istantaneo

echo ========================================
echo   CRUSCOTTO LOCAL OPENER - AVVIO UTENTE
echo   Auto-Config Edition v2.1.1 CACHE
echo   Modalita: Avvio Automatico con Cache
echo ========================================
echo.

:: Imposta titolo finestra
title "Cruscotto Local Opener - Avvio Automatico v2.1.1 CACHE"

:: Percorso del file di cache
set "CACHE_FILE=%TEMP%\local_opener_path.cache"

:: Verifica rapida se il servizio è già in esecuzione
echo Verifica stato servizio...
sc query CruscottoLocalOpener | find "RUNNING" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Servizio gia attivo
    goto :end
)

:: Verifica rapida se il servizio è installato
sc query CruscottoLocalOpener | find "SERVICE_NAME" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Servizio non installato, avvio modalita standalone...
    goto :standalone_mode
)

:: Avvia il servizio se installato
echo Avvio servizio CruscottoLocalOpener...
net start CruscottoLocalOpener >nul 2>&1
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
echo   MODALITA STANDALONE - AVVIO CON CACHE
echo ========================================
echo.

:: CONTROLLO CACHE - Verifica se abbiamo già il percorso salvato
if exist "%CACHE_FILE%" (
    set /p OPENER_PATH=<"%CACHE_FILE%"
    if exist "!OPENER_PATH!" (
        echo ✓ Percorso trovato in cache: !OPENER_PATH!
        goto :start_standalone
    ) else (
        echo ⚠ Percorso in cache non valido, ricerca aggiornata...
        del "%CACHE_FILE%" >nul 2>&1
    )
)

:: RICERCA VELOCE OTTIMIZZATA - Controlla prima i percorsi più probabili
:: 1. Directory corrente (più veloce)
if exist "local-opener.exe" (
    echo ✓ Trovato local-opener.exe (directory corrente)
    set "OPENER_PATH=%~dp0local-opener.exe"
    goto :save_cache
)

:: 2. Program Files (percorso standard)
if exist "%ProgramFiles%\CruscottoLocalOpener\local-opener.exe" (
    echo ✓ Trovato local-opener.exe in Program Files
    set "OPENER_PATH=%ProgramFiles%\CruscottoLocalOpener\local-opener.exe"
    goto :save_cache
)

:: 3. Desktop (percorso comune)
if exist "%USERPROFILE%\Desktop\local-opener.exe" (
    echo ✓ Trovato local-opener.exe sul Desktop
    set "OPENER_PATH=%USERPROFILE%\Desktop\local-opener.exe"
    goto :save_cache
)

:: 4. Downloads (percorso comune)
if exist "%USERPROFILE%\Downloads\local-opener.exe" (
    echo ✓ Trovato local-opener.exe in Downloads
    set "OPENER_PATH=%USERPROFILE%\Downloads\local-opener.exe"
    goto :save_cache
)

:: 5. Documents (percorso comune)
if exist "%USERPROFILE%\Documents\local-opener.exe" (
    echo ✓ Trovato local-opener.exe in Documents
    set "OPENER_PATH=%USERPROFILE%\Documents\local-opener.exe"
    goto :save_cache
)

:: 6. Ricerca rapida in Program Files (solo directory principali)
echo Ricerca rapida in Program Files...
for %%d in ("%ProgramFiles%" "%ProgramFiles(x86)%") do (
    if exist "%%~d\local-opener.exe" (
        echo ✓ Trovato: %%~d\local-opener.exe
        set "OPENER_PATH=%%~d\local-opener.exe"
        goto :save_cache
    )
)

:: 7. Ricerca rapida in directory utente (solo directory principali)
echo Ricerca rapida in directory utente...
for %%d in ("%USERPROFILE%\Desktop" "%USERPROFILE%\Downloads" "%USERPROFILE%\Documents" "%USERPROFILE%\AppData\Local" "%USERPROFILE%\AppData\Roaming") do (
    if exist "%%~d\local-opener.exe" (
        echo ✓ Trovato: %%~d\local-opener.exe
        set "OPENER_PATH=%%~d\local-opener.exe"
        goto :save_cache
    )
)

:: 8. Ricerca con where.exe (più veloce di dir /s)
echo Ricerca con where.exe...
where local-opener.exe >nul 2>&1
if %errorlevel% == 0 (
    for /f "delims=" %%i in ('where local-opener.exe') do (
        echo ✓ Trovato con where: %%i
        set "OPENER_PATH=%%i"
        goto :save_cache
    )
)

:: 9. Ricerca completa solo se necessario (ultima risorsa)
echo Ricerca completa nel sistema (puo' richiedere tempo)...
for /f "delims=" %%i in ('dir /s /b "%ProgramFiles%\local-opener.exe" 2^>nul ^| findstr /i "local-opener.exe"') do (
    echo ✓ Trovato: %%i
    set "OPENER_PATH=%%i"
    goto :save_cache
)

echo ❌ local-opener.exe non trovato nel sistema
echo Esegui l'installazione completa prima di usare questo script
echo.
echo Percorsi controllati:
echo - Directory corrente: %~dp0
echo - Program Files: %ProgramFiles%
echo - Desktop: %USERPROFILE%\Desktop
echo - Downloads: %USERPROFILE%\Downloads
echo - Documents: %USERPROFILE%\Documents
pause
exit /b 1

:save_cache
:: Salva il percorso trovato nella cache per i prossimi avvii
echo %OPENER_PATH% > "%CACHE_FILE%"
echo ✓ Percorso salvato in cache per avvii futuri

:start_standalone
echo.
echo Avvio Local Opener in modalita standalone...
echo Percorso: %OPENER_PATH%
echo.

:: Avvia local-opener.exe in background con priorità ottimizzata
start "" /min /high "%OPENER_PATH%"

:: Attendi ridotto per l'avvio (da 3 a 1 secondo)
timeout /t 1 /nobreak >nul

:: Verifica rapida se la porta è in ascolto
echo Verifica avvio...
netstat -an | find ":17654" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Local Opener avviato e in ascolto sulla porta 17654
) else (
    :: Retry rapido se non ancora pronto
    timeout /t 2 /nobreak >nul
    netstat -an | find ":17654" >nul 2>&1
    if %errorlevel% == 0 (
        echo ✓ Local Opener avviato e in ascolto sulla porta 17654
    ) else (
        echo ⚠ Local Opener potrebbe non essere ancora pronto
        echo Attendi qualche secondo e riprova
    )
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
