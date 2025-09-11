@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    DEBUG LOCAL OPENER SERVICE
echo    DIAGNOSTICA COMPLETA PROBLEMI
echo ========================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come amministratore!
    echo.
    echo Per eseguire come amministratore:
    echo 1. Tasto destro su questo file
    echo 2. "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Imposta variabili
set SERVICE_NAME=LocalOpener
set TASK_NAME=LocalOpenerTerminal
set NSSM_PATH=%~dp0nssm.exe
set LOG_DIR=C:\Logs\LocalOpener
set EXE_PATH=%~dp0cruscotto-local-opener-setup.exe

echo Debug completo del servizio Local Opener...
echo.

:: Crea file di log per il debug
set DEBUG_LOG=%~dp0debug-local-opener.log
echo ======================================== > "%DEBUG_LOG%"
echo DEBUG LOCAL OPENER - %date% %time% >> "%DEBUG_LOG%"
echo ======================================== >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 1. VERIFICA SISTEMA
echo ========================================
echo    1. VERIFICA SISTEMA
echo ========================================
echo.

echo Informazioni sistema:
echo - Sistema operativo: %OS%
echo - Versione: %OS_VERSION%
echo - Architettura: %PROCESSOR_ARCHITECTURE%
echo - Utente: %USERNAME%
echo - Privilegi amministratore: SÌ
echo.

echo Informazioni sistema: >> "%DEBUG_LOG%"
echo - Sistema operativo: %OS% >> "%DEBUG_LOG%"
echo - Versione: %OS_VERSION% >> "%DEBUG_LOG%"
echo - Architettura: %PROCESSOR_ARCHITECTURE% >> "%DEBUG_LOG%"
echo - Utente: %USERNAME% >> "%DEBUG_LOG%"
echo - Privilegi amministratore: SÌ >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 2. VERIFICA FILE NECESSARI
echo ========================================
echo    2. VERIFICA FILE NECESSARI
echo ========================================
echo.

echo Verifica file necessari:
echo.

:: Verifica eseguibile principale
if exist "%EXE_PATH%" (
    echo  cruscotto-local-opener-setup.exe trovato
    echo   - Percorso: %EXE_PATH%
    echo   - Dimensione: 
    for %%A in ("%EXE_PATH%") do echo     %%~zA bytes
    echo.
) else (
    echo  cruscotto-local-opener-setup.exe NON TROVATO
    echo   - Percorso cercato: %EXE_PATH%
    echo.
)

:: Verifica NSSM
if exist "%NSSM_PATH%" (
    echo  nssm.exe trovato
    echo   - Percorso: %NSSM_PATH%
    echo.
) else (
    echo  nssm.exe NON TROVATO
    echo   - Percorso cercato: %NSSM_PATH%
    echo.
)

echo Verifica file necessari: >> "%DEBUG_LOG%"
if exist "%EXE_PATH%" (
    echo  cruscotto-local-opener-setup.exe trovato >> "%DEBUG_LOG%"
    echo   - Percorso: %EXE_PATH% >> "%DEBUG_LOG%"
    for %%A in ("%EXE_PATH%") do echo     %%~zA bytes >> "%DEBUG_LOG%"
) else (
    echo  cruscotto-local-opener-setup.exe NON TROVATO >> "%DEBUG_LOG%"
    echo   - Percorso cercato: %EXE_PATH% >> "%DEBUG_LOG%"
)
if exist "%NSSM_PATH%" (
    echo  nssm.exe trovato >> "%DEBUG_LOG%"
    echo   - Percorso: %NSSM_PATH% >> "%DEBUG_LOG%"
) else (
    echo  nssm.exe NON TROVATO >> "%DEBUG_LOG%"
    echo   - Percorso cercato: %NSSM_PATH% >> "%DEBUG_LOG%"
)
echo. >> "%DEBUG_LOG%"

:: 3. VERIFICA SERVIZIO WINDOWS
echo ========================================
echo    3. VERIFICA SERVIZIO WINDOWS
echo ========================================
echo.

sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Servizio %SERVICE_NAME% trovato
    echo.
    echo Stato dettagliato del servizio:
    sc query "%SERVICE_NAME%"
    echo.
    
    :: Verifica se il servizio è in esecuzione
    sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
    if %errorLevel% equ 0 (
        echo  Servizio in esecuzione
    ) else (
        echo  Servizio non in esecuzione
        echo Tentativo di avvio...
        sc start "%SERVICE_NAME%"
        timeout /t 5 /nobreak >nul
        sc query "%SERVICE_NAME%" | find "RUNNING" >nul 2>&1
        if %errorLevel% equ 0 (
            echo  Servizio avviato con successo
        ) else (
            echo  Impossibile avviare il servizio
        )
    )
) else (
    echo  Servizio %SERVICE_NAME% NON TROVATO
    echo Il servizio non è installato
    echo.
)

echo Verifica servizio Windows: >> "%DEBUG_LOG%"
sc query "%SERVICE_NAME%" >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 4. VERIFICA CONFIGURAZIONE NSSM
echo ========================================
echo    4. VERIFICA CONFIGURAZIONE NSSM
echo ========================================
echo.

if exist "%NSSM_PATH%" (
    echo  NSSM disponibile, verifica configurazione...
    echo.
    
    sc query "%SERVICE_NAME%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo Configurazione NSSM del servizio:
        "%NSSM_PATH%" dump "%SERVICE_NAME%"
        echo.
        
        :: Verifica configurazioni critiche
        echo Verifica configurazioni critiche:
        echo - Modalità interattiva:
        "%NSSM_PATH%" get "%SERVICE_NAME%" AppType
        echo - Percorso applicazione:
        "%NSSM_PATH%" get "%SERVICE_NAME%" Application
        echo - Avvio automatico:
        "%NSSM_PATH%" get "%SERVICE_NAME%" Start
        echo.
    ) else (
        echo  Servizio non installato, impossibile verificare NSSM
    )
) else (
    echo  NSSM non disponibile
)

echo Verifica configurazione NSSM: >> "%DEBUG_LOG%"
if exist "%NSSM_PATH%" (
    sc query "%SERVICE_NAME%" >nul 2>&1
    if %errorLevel% equ 0 (
        "%NSSM_PATH%" dump "%SERVICE_NAME%" >> "%DEBUG_LOG%"
        echo. >> "%DEBUG_LOG%"
        echo Configurazioni critiche: >> "%DEBUG_LOG%"
        "%NSSM_PATH%" get "%SERVICE_NAME%" AppType >> "%DEBUG_LOG%"
        "%NSSM_PATH%" get "%SERVICE_NAME%" Application >> "%DEBUG_LOG%"
        "%NSSM_PATH%" get "%SERVICE_NAME%" Start >> "%DEBUG_LOG%"
    )
)
echo. >> "%DEBUG_LOG%"

:: 5. VERIFICA TASK SCHEDULER
echo ========================================
echo    5. VERIFICA TASK SCHEDULER
echo ========================================
echo.

echo Verifica task scheduler per apertura automatica:
echo.

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Task scheduler %TASK_NAME% trovato
    echo.
    echo Configurazione task scheduler:
    schtasks /query /tn "%TASK_NAME%" /fo table
    echo.
    
    :: Verifica trigger e condizioni
    echo Trigger e condizioni:
    schtasks /query /tn "%TASK_NAME%" /fo list
    echo.
) else (
    echo  Task scheduler %TASK_NAME% NON TROVATO
    echo Il task scheduler per apertura automatica non è configurato
    echo.
)

echo Verifica task scheduler: >> "%DEBUG_LOG%"
schtasks /query /tn "%TASK_NAME%" /fo table >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"
schtasks /query /tn "%TASK_NAME%" /fo list >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 6. VERIFICA SCRIPT E FILE DI SUPPORTO
echo ========================================
echo    6. VERIFICA SCRIPT E FILE DI SUPPORTO
echo ========================================
echo.

echo Verifica script di supporto:
echo.

set STARTUP_SCRIPT=%~dp0start-local-opener.bat
set TASK_SCRIPT=%~dp0auto-open-terminal.bat

if exist "%STARTUP_SCRIPT%" (
    echo  Script di avvio trovato: %STARTUP_SCRIPT%
    echo   - Dimensione: 
    for %%A in ("%STARTUP_SCRIPT%") do echo     %%~zA bytes
    echo.
) else (
    echo  Script di avvio NON TROVATO: %STARTUP_SCRIPT%
    echo.
)

if exist "%TASK_SCRIPT%" (
    echo  Script task scheduler trovato: %TASK_SCRIPT%
    echo   - Dimensione: 
    for %%A in ("%TASK_SCRIPT%") do echo     %%~zA bytes
    echo.
) else (
    echo  Script task scheduler NON TROVATO: %TASK_SCRIPT%
    echo.
)

echo Verifica script di supporto: >> "%DEBUG_LOG%"
if exist "%STARTUP_SCRIPT%" (
    echo  Script di avvio trovato: %STARTUP_SCRIPT% >> "%DEBUG_LOG%"
    for %%A in ("%STARTUP_SCRIPT%") do echo     %%~zA bytes >> "%DEBUG_LOG%"
) else (
    echo  Script di avvio NON TROVATO: %STARTUP_SCRIPT% >> "%DEBUG_LOG%"
)
if exist "%TASK_SCRIPT%" (
    echo  Script task scheduler trovato: %TASK_SCRIPT% >> "%DEBUG_LOG%"
    for %%A in ("%TASK_SCRIPT%") do echo     %%~zA bytes >> "%DEBUG_LOG%"
) else (
    echo  Script task scheduler NON TROVATO: %TASK_SCRIPT% >> "%DEBUG_LOG%"
)
echo. >> "%DEBUG_LOG%"

:: 7. VERIFICA DIRECTORY LOG
echo ========================================
echo    7. VERIFICA DIRECTORY LOG
echo ========================================
echo.

echo Verifica directory log:
echo.

if exist "%LOG_DIR%" (
    echo  Directory log trovata: %LOG_DIR%
    echo.
    echo Contenuto directory log:
    dir "%LOG_DIR%" /b
    echo.
    
    :: Verifica file di log specifici
    if exist "%LOG_DIR%\LocalOpener.log" (
        echo  File log principale trovato
        echo   - Dimensione: 
        for %%A in ("%LOG_DIR%\LocalOpener.log") do echo     %%~zA bytes
        echo.
        echo Ultime 10 righe del log:
        echo ----------------------------------------
        powershell "Get-Content '%LOG_DIR%\LocalOpener.log' | Select-Object -Last 10"
        echo ----------------------------------------
        echo.
    ) else (
        echo  File log principale NON TROVATO
    )
    
    if exist "%LOG_DIR%\LocalOpener-error.log" (
        echo  File log errori trovato
        echo   - Dimensione: 
        for %%A in ("%LOG_DIR%\LocalOpener-error.log") do echo     %%~zA bytes
        echo.
        echo Ultime 10 righe del log errori:
        echo ----------------------------------------
        powershell "Get-Content '%LOG_DIR%\LocalOpener-error.log' | Select-Object -Last 10"
        echo ----------------------------------------
        echo.
    ) else (
        echo  File log errori NON TROVATO
    )
) else (
    echo  Directory log NON TROVATA: %LOG_DIR%
    echo.
)

echo Verifica directory log: >> "%DEBUG_LOG%"
if exist "%LOG_DIR%" (
    echo  Directory log trovata: %LOG_DIR% >> "%DEBUG_LOG%"
    dir "%LOG_DIR%" /b >> "%DEBUG_LOG%"
    echo. >> "%DEBUG_LOG%"
    if exist "%LOG_DIR%\LocalOpener.log" (
        echo  File log principale trovato >> "%DEBUG_LOG%"
        for %%A in ("%LOG_DIR%\LocalOpener.log") do echo     %%~zA bytes >> "%DEBUG_LOG%"
        echo. >> "%DEBUG_LOG%"
        echo Ultime 10 righe del log: >> "%DEBUG_LOG%"
        powershell "Get-Content '%LOG_DIR%\LocalOpener.log' | Select-Object -Last 10" >> "%DEBUG_LOG%"
    )
    if exist "%LOG_DIR%\LocalOpener-error.log" (
        echo  File log errori trovato >> "%DEBUG_LOG%"
        for %%A in ("%LOG_DIR%\LocalOpener-error.log") do echo     %%~zA bytes >> "%DEBUG_LOG%"
        echo. >> "%DEBUG_LOG%"
        echo Ultime 10 righe del log errori: >> "%DEBUG_LOG%"
        powershell "Get-Content '%LOG_DIR%\LocalOpener-error.log' | Select-Object -Last 10" >> "%DEBUG_LOG%"
    )
) else (
    echo  Directory log NON TROVATA: %LOG_DIR% >> "%DEBUG_LOG%"
)
echo. >> "%DEBUG_LOG%"

:: 8. TEST FUNZIONAMENTO
echo ========================================
echo    8. TEST FUNZIONAMENTO
echo ========================================
echo.

echo Test funzionamento servizio:
echo.

:: Test avvio manuale dell'eseguibile
echo - Test avvio manuale dell'eseguibile...
echo   Avvio in background per test...
start /b "" "%EXE_PATH%"
timeout /t 3 /nobreak >nul

:: Verifica se il processo è attivo
tasklist /fi "imagename eq cruscotto-local-opener-setup.exe" | find "cruscotto-local-opener-setup.exe" >nul 2>&1
if %errorLevel% equ 0 (
    echo  Eseguibile avviato con successo
    echo   Processo attivo nel task manager
    echo.
    echo   Terminazione processo di test...
    taskkill /f /im "cruscotto-local-opener-setup.exe" >nul 2>&1
) else (
    echo  Eseguibile non si avvia correttamente
    echo   Possibili cause:
    echo   - File corrotto
    echo   - Antivirus che blocca l'esecuzione
    echo   - Dipendenze mancanti
    echo.
)

echo Test funzionamento: >> "%DEBUG_LOG%"
tasklist /fi "imagename eq cruscotto-local-opener-setup.exe" >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 9. DIAGNOSI PROBLEMI COMUNI
echo ========================================
echo    9. DIAGNOSI PROBLEMI COMUNI
echo ========================================
echo.

echo Diagnosi problemi comuni:
echo.

:: Verifica antivirus
echo - Verifica possibili blocchi antivirus...
echo   Controlla se l'antivirus blocca l'esecuzione
echo   Aggiungi eccezioni per la cartella del Local Opener
echo.

:: Verifica permessi
echo - Verifica permessi file...
echo   Controlla che l'utente abbia accesso completo ai file
echo   Verifica che non ci siano restrizioni di sicurezza
echo.

:: Verifica dipendenze
echo - Verifica dipendenze sistema...
echo   Controlla che .NET Framework sia installato
echo   Verifica che Visual C++ Redistributable sia presente
echo.

echo Diagnosi problemi comuni: >> "%DEBUG_LOG%"
echo - Verifica possibili blocchi antivirus >> "%DEBUG_LOG%"
echo - Verifica permessi file >> "%DEBUG_LOG%"
echo - Verifica dipendenze sistema >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 10. RACCOMANDAZIONI
echo ========================================
echo    10. RACCOMANDAZIONI
echo ========================================
echo.

echo RACCOMANDAZIONI PER RISOLVERE I PROBLEMI:
echo.

echo 1. SE IL SERVIZIO NON SI INSTALLA:
echo    - Esegui install-local-opener.bat come amministratore
echo    - Verifica che tutti i file siano presenti
echo    - Controlla i log di errore
echo.

echo 2. SE IL TERMINALE NON SI APRE AUTOMATICAMENTE:
echo    - Esegui configure-terminal-mode.bat
echo    - Verifica che il task scheduler sia configurato
echo    - Riavvia il computer per testare l'avvio automatico
echo.

echo 3. SE IL SERVIZIO NON SI AVVIA:
echo    - Controlla i log in C:\Logs\LocalOpener\
echo    - Verifica la configurazione NSSM
echo    - Prova a riavviare il servizio manualmente
echo.

echo 4. SE L'ESEGUIBILE NON FUNZIONA:
echo    - Verifica che il file non sia corrotto
echo    - Controlla che l'antivirus non lo blocchi
echo    - Verifica le dipendenze del sistema
echo.

echo RACCOMANDAZIONI: >> "%DEBUG_LOG%"
echo 1. SE IL SERVIZIO NON SI INSTALLA >> "%DEBUG_LOG%"
echo 2. SE IL TERMINALE NON SI APRE AUTOMATICAMENTE >> "%DEBUG_LOG%"
echo 3. SE IL SERVIZIO NON SI AVVIA >> "%DEBUG_LOG%"
echo 4. SE L'ESEGUIBILE NON FUNZIONA >> "%DEBUG_LOG%"
echo. >> "%DEBUG_LOG%"

:: 11. SALVATAGGIO LOG
echo ========================================
echo    11. SALVATAGGIO LOG
echo ========================================
echo.

echo Log di debug salvato in: %DEBUG_LOG%
echo.
echo Per analizzare i problemi:
echo 1. Controlla il file di log per dettagli tecnici
echo 2. Condividi il log con il supporto tecnico
echo 3. Usa i comandi di verifica forniti
echo.

echo ========================================
echo    DEBUG COMPLETATO
echo ========================================
echo.

echo Se hai problemi:
echo 1. Controlla il log di debug: %DEBUG_LOG%
echo 2. Esegui test-terminal-mode.bat per verifiche
echo 3. Contatta il supporto tecnico con il log
echo.

echo Premere un tasto per chiudere...
pause >nul
