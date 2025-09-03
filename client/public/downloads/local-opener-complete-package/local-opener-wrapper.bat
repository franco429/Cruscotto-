@echo off 
title Local Opener - Running 
setlocal enabledelayedexpansion 
 
:loop 
echo [03/09/2025 12:22:26,61] Starting Local Opener... 
"C:\Users\teoni\Desktop\SGI-Cruscotto-main\client\public\downloads\cruscotto-local-opener-setup.exe" >> "C:\Logs\LocalOpener\LocalOpener.log" 2>> "C:\Logs\LocalOpener\LocalOpener-error.log" 
if %errorlevel% neq 0 ( 
    echo [03/09/2025 12:22:26,62] Error occurred, restarting in 5 seconds... 
    timeout /t 5 /nobreak >nul 
) 
goto :loop 
