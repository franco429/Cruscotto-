@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║            🏢 ESEMPI DEPLOYMENT ENTERPRISE                       ║
echo ║                  200+ Aziende Supportate                        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

rem Colori per output
set "GREEN=[92m"
set "BLUE=[94m"
set "YELLOW=[93m"
set "RESET=[0m"

echo %BLUE%🎯 MODALITÀ DI DEPLOYMENT DISPONIBILI:%RESET%
echo.

echo %YELLOW%1. MANIFATTURIERA - ISO 9001/14001/45001%RESET%
echo Comando:
echo cruscotto-local-opener-setup.exe /SILENT /NORESTART ^
echo   /COMPANY="Acme Manufacturing SpA" ^
echo   /COMPANYCODE="MFG001" ^
echo   /ROOTDIR="G:\Il mio Drive\ISO"
echo.

echo %YELLOW%2. SANITARIA - ISO 13485/27001%RESET%
echo Comando:
echo cruscotto-local-opener-setup.exe /SILENT /NORESTART ^
echo   /COMPANY="MedTech Solutions SRL" ^
echo   /COMPANYCODE="MED002" ^
echo   /ROOTDIR="H:\My Drive\Medical"
echo.

echo %YELLOW%3. EDILE - ISO 14001/45001%RESET%
echo Comando:
echo cruscotto-local-opener-setup.exe /SILENT /NORESTART ^
echo   /COMPANY="BuildSafe Construction" ^
echo   /COMPANYCODE="BUILD003" ^
echo   /ROOTDIR="F:\Drive condivisi\Sicurezza"
echo.

echo %YELLOW%4. CONSULENZA IT - Multi-cliente%RESET%
echo Comando:
echo cruscotto-local-opener-setup.exe /SILENT /NORESTART ^
echo   /COMPANY="TechConsult Partners" ^
echo   /COMPANYCODE="TECH004" ^
echo   /ROOTDIR="\\server\clienti\iso"
echo.

echo %YELLOW%5. PICCOLA AZIENDA - Installazione semplice%RESET%
echo Comando:
echo cruscotto-local-opener-setup.exe /SILENT /NORESTART ^
echo   /COMPANY="Piccola Impresa SNC" ^
echo   /COMPANYCODE="SMALL005"
echo (Auto-rileva cartelle Google Drive)
echo.

echo %BLUE%📊 CAPACITÀ SISTEMA:%RESET%
echo • ✅ 200+ aziende supportate simultaneamente
echo • ✅ Deployment distribuito (ogni PC indipendente)
echo • ✅ Installazione silenziosa per IT managers
echo • ✅ Configurazione per-azienda automatica
echo • ✅ Zero impatto performance centrale
echo • ✅ Scalabilità illimitata
echo.

echo %BLUE%🚀 DEPLOYMENT AUTOMATION:%RESET%
echo • Group Policy (Active Directory)
echo • SCCM / Microsoft Intune
echo • PowerShell DSC
echo • Ansible / Puppet
echo • Script PowerShell personalizzati
echo.

echo %GREEN%💡 Per iniziare deployment nella tua azienda:%RESET%
echo 1. Scarica installer: https://cruscotto-sgi.onrender.com/downloads/
echo 2. Personalizza comando con dati azienda
echo 3. Deploya via Group Policy o script
echo 4. Verifica con debug-local-opener.bat
echo.

pause
