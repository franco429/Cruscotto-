@echo off
echo.
echo RIMOZIONE FORZATA SERVIZIO LOCAL OPENER
echo =======================================
echo.

echo Tentativo 1: Arresto forzato...
net stop "CruscottoLocalOpener" /y 2>nul
sc stop "CruscottoLocalOpener" 2>nul
timeout /t 3 /nobreak >nul

echo Tentativo 2: Rimozione con SC...
sc delete "CruscottoLocalOpener" 2>nul

echo Tentativo 3: Rimozione con PowerShell...
powershell -Command "Get-Service 'CruscottoLocalOpener' -ErrorAction SilentlyContinue | Stop-Service -Force -ErrorAction SilentlyContinue"
powershell -Command "Get-WmiObject -Class Win32_Service -Filter \"Name='CruscottoLocalOpener'\" | Remove-WmiObject"

echo Tentativo 4: Rimozione dal registro...
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\CruscottoLocalOpener" /f 2>nul

echo.
echo Attendi 5 secondi...
timeout /t 5 /nobreak >nul

echo.
echo VERIFICA FINALE:
sc query "CruscottoLocalOpener" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PROBLEMA] Servizio ANCORA presente - RIAVVIA IL PC
    echo.
    echo AZIONE RICHIESTA:
    echo 1. Riavvia il PC SUBITO
    echo 2. Dopo il riavvio, esegui nuovamente verifica-disinstallazione.bat
    echo 3. Solo se tutto OK, procedi con reinstallazione
) else (
    echo [OK] Servizio RIMOSSO con successo!
    echo.
    echo PRONTO PER REINSTALLAZIONE:
    echo 1. Scarica la nuova versione Local Opener
    echo 2. Estrai in cartella pulita
    echo 3. Esegui INSTALLA-COME-AMMINISTRATORE.bat
)

echo.
pause
