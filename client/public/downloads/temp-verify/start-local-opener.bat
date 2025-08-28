@echo off
title Local Opener Service - Terminale Visibile
setlocal enabledelayedexpansion

echo ========================================
echo    LOCAL OPENER SERVICE ATTIVO
echo ========================================
echo.
echo Il servizio Local Opener è ora attivo e funzionante.
echo.
echo Caratteristiche:
echo - ✅ Avvio automatico all'avvio di Windows
echo - ✅ Terminale sempre visibile per monitoraggio
echo - ✅ Riavvio automatico in caso di crash
echo - ✅ Log salvati in C:\Logs\LocalOpener
echo - ✅ Task Scheduler per apertura automatica
echo.
echo PER CHIUDERE IL SERVIZIO:
echo 1. Chiudi questa finestra
echo 2. Oppure usa: sc stop LocalOpener
echo.
echo ATTENZIONE: Chiudere questa finestra fermerà il servizio!
echo.
echo Avvio del servizio Local Opener...
echo.

:: Imposta variabili
set "EXE_PATH=%~dp0cruscotto-local-opener-setup.exe"
set "LOG_DIR=C:\Logs\LocalOpener"

:: Crea directory log se non esiste
if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%" >nul 2>&1
)

:: Loop infinito per mantenere il terminale aperto
:loop
echo [%date% %time%] Local Opener Service attivo...
echo.

:: Verifica che l'eseguibile esista
if not exist "%EXE_PATH%" (
    echo ERRORE: File cruscotto-local-opener-setup.exe non trovato!
    echo Percorso: %EXE_PATH%
    echo.
    echo Attendo 30 secondi prima di riprovare...
    timeout /t 30 /nobreak >nul
    goto :loop
)

echo Avvio applicazione principale...
echo Percorso: %EXE_PATH%
echo.

:: Avvia l'applicazione principale e aspetta che termini
start /wait "" "%EXE_PATH%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Applicazione terminata con codice: %EXIT_CODE%
echo.

:: Log dell'evento
echo [%date% %time%] Applicazione terminata con codice %EXIT_CODE% >> "%LOG_DIR%\service-restart.log"

:: Riavvio automatico in caso di crash o terminazione
if %EXIT_CODE% neq 0 (
    echo ⚠️  Applicazione terminata con errore, riavvio immediato...
    echo [%date% %time%] Riavvio immediato per errore %EXIT_CODE% >> "%LOG_DIR%\service-restart.log"
    timeout /t 2 /nobreak >nul
    goto :loop
) else (
    echo ✅ Applicazione terminata normalmente
    echo Riavvio in 5 secondi per mantenere il servizio attivo...
    echo [%date% %time%] Riavvio programmato normale >> "%LOG_DIR%\service-restart.log"
    timeout /t 5 /nobreak >nul
    echo.
    echo Riavvio automatico...
    goto :loop
)
