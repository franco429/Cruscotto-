@echo off
echo ========================================
echo    TEST SINTASSI BATCH FILES
echo ========================================
echo.

echo Test 1: Verifica sintassi setup-local-opener-task.bat
call setup-local-opener-task.bat --test 2>nul
if %errorLevel% neq 0 (
    echo ERRORE: Problemi di sintassi in setup-local-opener-task.bat
) else (
    echo OK: Sintassi corretta
)

echo.
echo Test 2: Verifica presenza file exe
if exist "cruscotto-local-opener-setup.exe" (
    echo OK: File exe presente
) else (
    echo ERRORE: File exe mancante
)

echo.
echo Test 3: Verifica sintassi verify-local-opener-complete.bat
call verify-local-opener-complete.bat --test 2>nul
if %errorLevel% neq 0 (
    echo ERRORE: Problemi di sintassi in verify-local-opener-complete.bat
) else (
    echo OK: Sintassi corretta
)

echo.
echo ========================================
echo Test completati
echo ========================================
pause
