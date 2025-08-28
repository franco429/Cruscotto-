# Script PowerShell per creare pacchetto MSI per distribuzione enterprise
# Richiede WiX Toolset: https://wixtoolset.org/releases/

param(
    [string]$OutputDir = ".\dist\enterprise",
    [string]$SourceDir = ".\dist",
    [string]$Version = "1.2.0",
    [string]$CompanyName = "",
    [string]$CompanyCode = "",
    [string]$DefaultRootDir = ""
)

# Verifica prerequisiti
function Test-Prerequisites {
    Write-Host "🔍 Verifica prerequisiti..." -ForegroundColor Blue
    
    # Controlla WiX Toolset
    $wixPath = Get-Command "candle.exe" -ErrorAction SilentlyContinue
    if (-not $wixPath) {
        Write-Error "❌ WiX Toolset non trovato. Installa da: https://wixtoolset.org/releases/"
        exit 1
    }
    
    Write-Host "✅ WiX Toolset trovato: $($wixPath.Source)" -ForegroundColor Green
    
    # Controlla file sorgente
    $sourceExe = Join-Path $SourceDir "local-opener.exe"
    if (-not (Test-Path $sourceExe)) {
        Write-Error "❌ File sorgente non trovato: $sourceExe"
        Write-Host "💡 Esegui prima: npm run build:universal" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ File sorgente trovato: $sourceExe" -ForegroundColor Green
}

# Crea directory di output
function Initialize-OutputDirectory {
    Write-Host "📁 Preparazione directory..." -ForegroundColor Blue
    
    if (Test-Path $OutputDir) {
        Remove-Item $OutputDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    
    Write-Host "✅ Directory creata: $OutputDir" -ForegroundColor Green
}

# Genera file WiX (.wxs)
function Generate-WixFile {
    Write-Host "📝 Generazione file WiX..." -ForegroundColor Blue
    
    $wixContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="{A7B9C8D2-3E4F-5A6B-7C8D-9E0F1A2B3C4D}" 
           Name="Cruscotto Local Opener" 
           Language="1040" 
           Version="$Version" 
           Manufacturer="Pannello SGI" 
           UpgradeCode="{B8C9D3E4-4F5A-6B7C-8D9E-0F1A2B3C4D5E}">
    
    <Package InstallerVersion="200" 
             Compressed="yes" 
             InstallScope="perMachine" 
             Platform="x64"
             Description="Servizio per aprire documenti locali da Pannello SGI"
             Comments="Installazione enterprise con configurazione automatica"
             Manufacturer="Pannello SGI" />

    <!-- Supporto major upgrade -->
    <MajorUpgrade DowngradeErrorMessage="Una versione più recente è già installata." />
    
    <!-- Riferimento al media -->
    <MediaTemplate EmbedCab="yes" />

    <!-- Feature principale -->
    <Feature Id="ProductFeature" Title="Cruscotto Local Opener" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
      <ComponentRef Id="ServiceComponent" />
      <ComponentRef Id="ConfigComponent" />
    </Feature>

    <!-- Directory structure -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLFOLDER" Name="CruscottoLocalOpener" />
      </Directory>
      <Directory Id="CommonAppDataFolder">
        <Directory Id="CompanyDataFolder" Name="CruscottoLocalOpener" />
      </Directory>
    </Directory>

    <!-- Componenti del prodotto -->
    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <Component Id="MainExecutable" Guid="{C9D4E5F6-5A6B-7C8D-9E0F-1A2B3C4D5E6F}">
        <File Id="LocalOpenerExe" 
              Source="$SourceDir\local-opener.exe" 
              KeyPath="yes" />
      </Component>
      
      <Component Id="NssmUtility" Guid="{D0E5F6A7-6B7C-8D9E-0F1A-2B3C4D5E6F7A}">
        <File Id="NssmExe" 
              Source="$SourceDir\..\installer\nssm.exe" 
              KeyPath="yes" />
      </Component>
    </ComponentGroup>

    <!-- Servizio Windows -->
    <Component Id="ServiceComponent" Directory="INSTALLFOLDER" Guid="{E1F6A7B8-7C8D-9E0F-1A2B-3C4D5E6F7A8B}">
      <CreateFolder />
      
      <!-- Installa servizio usando NSSM -->
      <CustomAction Id="InstallService" 
                    FileKey="NssmExe" 
                    ExeCommand='install CruscottoLocalOpener "[INSTALLFOLDER]local-opener.exe"' 
                    Execute="deferred" 
                    Impersonate="no" />
      
      <CustomAction Id="ConfigureService" 
                    FileKey="NssmExe" 
                    ExeCommand='set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service"' 
                    Execute="deferred" 
                    Impersonate="no" />
      
      <CustomAction Id="SetServiceAutoStart" 
                    FileKey="NssmExe" 
                    ExeCommand='set CruscottoLocalOpener Start SERVICE_AUTO_START' 
                    Execute="deferred" 
                    Impersonate="no" />
      
      <CustomAction Id="StartService" 
                    FileKey="NssmExe" 
                    ExeCommand='start CruscottoLocalOpener' 
                    Execute="deferred" 
                    Impersonate="no" />
      
      <!-- Rimuovi servizio durante disinstallazione -->
      <CustomAction Id="StopService" 
                    FileKey="NssmExe" 
                    ExeCommand='stop CruscottoLocalOpener' 
                    Execute="deferred" 
                    Impersonate="no" />
      
      <CustomAction Id="RemoveService" 
                    FileKey="NssmExe" 
                    ExeCommand='remove CruscottoLocalOpener confirm' 
                    Execute="deferred" 
                    Impersonate="no" />
    </Component>

    <!-- Configurazione predefinita -->
    <Component Id="ConfigComponent" Directory="CompanyDataFolder" Guid="{F2A7B8C9-8D9E-0F1A-2B3C-4D5E6F7A8B9C}">
      <CreateFolder />
      
      <!-- File di configurazione predefinito -->
      <File Id="DefaultConfig" 
            Source="config-template.json" 
            Name="config.json" />
      
      <!-- Regola Windows Firewall -->
      <CustomAction Id="ConfigureFirewall" 
                    ExeCommand='netsh advfirewall firewall add rule name="Cruscotto Local Opener" dir=in action=allow protocol=TCP localport=17654' 
                    Execute="deferred" 
                    Impersonate="no" />
    </Component>

    <!-- Sequenza di installazione -->
    <InstallExecuteSequence>
      <Custom Action="InstallService" After="InstallFiles">NOT Installed</Custom>
      <Custom Action="ConfigureService" After="InstallService">NOT Installed</Custom>
      <Custom Action="SetServiceAutoStart" After="ConfigureService">NOT Installed</Custom>
      <Custom Action="ConfigureFirewall" After="SetServiceAutoStart">NOT Installed</Custom>
      <Custom Action="StartService" After="ConfigureFirewall">NOT Installed</Custom>
      
      <!-- Disinstallazione -->
      <Custom Action="StopService" Before="RemoveFiles">Installed AND NOT UPGRADINGPRODUCTCODE</Custom>
      <Custom Action="RemoveService" After="StopService">Installed AND NOT UPGRADINGPRODUCTCODE</Custom>
    </InstallExecuteSequence>

    <!-- Proprietà per installazione silent -->
    <Property Id="COMPANY_NAME" Value="$CompanyName" />
    <Property Id="COMPANY_CODE" Value="$CompanyCode" />
    <Property Id="DEFAULT_ROOT_DIR" Value="$DefaultRootDir" />
    
    <!-- Supporto per installazione silent -->
    <Property Id="MSIUSEREALADMINDETECTION" Value="1" />
    
  </Product>
</Wix>
"@

    $wixFile = Join-Path $OutputDir "LocalOpener.wxs"
    $wixContent | Out-File -FilePath $wixFile -Encoding UTF8
    
    Write-Host "✅ File WiX generato: $wixFile" -ForegroundColor Green
    return $wixFile
}

# Crea file di configurazione template
function Create-ConfigTemplate {
    Write-Host "⚙️ Creazione template configurazione..." -ForegroundColor Blue
    
    $configTemplate = @{
        roots = @()
        company = @{
            name = $CompanyName
            code = $CompanyCode
            installedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            version = $Version
            enterpriseInstall = $true
        }
        enterpriseSettings = @{
            autoDetectGoogleDrive = $true
            defaultRootDir = $DefaultRootDir
            telemetryEnabled = $true
            autoUpdateEnabled = $true
        }
    }
    
    $configFile = Join-Path $OutputDir "config-template.json"
    $configTemplate | ConvertTo-Json -Depth 4 | Out-File -FilePath $configFile -Encoding UTF8
    
    Write-Host "✅ Template configurazione creato: $configFile" -ForegroundColor Green
}

# Compila pacchetto MSI
function Build-MsiPackage {
    param([string]$wixFile)
    
    Write-Host "🔨 Compilazione pacchetto MSI..." -ForegroundColor Blue
    
    $objFile = Join-Path $OutputDir "LocalOpener.wixobj"
    $msiFile = Join-Path $OutputDir "CruscottoLocalOpener-$Version-Enterprise.msi"
    
    # Fase 1: Candle (preprocessing)
    Write-Host "   📝 Preprocessing con Candle..." -ForegroundColor Gray
    $candleArgs = @(
        "-out", $objFile,
        $wixFile
    )
    
    & candle.exe @candleArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Errore durante preprocessing WiX"
        exit 1
    }
    
    # Fase 2: Light (linking)
    Write-Host "   🔗 Linking con Light..." -ForegroundColor Gray
    $lightArgs = @(
        "-out", $msiFile,
        "-ext", "WixUIExtension",
        "-ext", "WixUtilExtension",
        $objFile
    )
    
    & light.exe @lightArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Errore durante linking WiX"
        exit 1
    }
    
    Write-Host "✅ Pacchetto MSI creato: $msiFile" -ForegroundColor Green
    return $msiFile
}

# Genera script di distribuzione
function Generate-DeploymentScript {
    param([string]$msiFile)
    
    Write-Host "📋 Generazione script di distribuzione..." -ForegroundColor Blue
    
    $deployScript = @"
@echo off
REM Script di distribuzione enterprise per Cruscotto Local Opener
REM Versione: $Version
REM Generato: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

echo.
echo ═══════════════════════════════════════════════════════════════
echo    Distribuzione Enterprise - Cruscotto Local Opener v$Version
echo ═══════════════════════════════════════════════════════════════
echo.

REM Controlla privilegi amministratore
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRORE: Questo script richiede privilegi di amministratore
    echo.
    echo Clic destro sul file e seleziona "Esegui come amministratore"
    pause
    exit /b 1
)

echo ✅ Privilegi amministratore confermati
echo.

REM Installazione silent con logging
echo 🚀 Avvio installazione silent...
echo.

msiexec /i "$([System.IO.Path]::GetFileName($msiFile))" /quiet /norestart /l*v "installation.log" COMPANY_NAME="$CompanyName" COMPANY_CODE="$CompanyCode" DEFAULT_ROOT_DIR="$DefaultRootDir"

if %errorlevel% equ 0 (
    echo ✅ Installazione completata con successo
    echo.
    echo 📋 Prossimi passi:
    echo    1. Il servizio è stato avviato automaticamente
    echo    2. Porta 17654 configurata nel firewall
    echo    3. Configurazione enterprise applicata
    echo.
    echo 🔍 Per verificare il funzionamento:
    echo    - Apri browser e vai su http://127.0.0.1:17654/health
    echo    - Dovrebbe mostrare "ok": true
    echo.
) else (
    echo ❌ Errore durante l'installazione (codice: %errorlevel%)
    echo.
    echo 📋 Controlla il file installation.log per dettagli
    echo.
)

echo 📞 Supporto tecnico: support@cruscotto-sgi.com
echo.
pause
"@

    $deployScriptFile = Join-Path $OutputDir "deploy-enterprise.bat"
    $deployScript | Out-File -FilePath $deployScriptFile -Encoding UTF8
    
    Write-Host "✅ Script di distribuzione creato: $deployScriptFile" -ForegroundColor Green
}

# Genera documentazione enterprise
function Generate-Documentation {
    Write-Host "📖 Generazione documentazione enterprise..." -ForegroundColor Blue
    
    $documentation = @"
# Distribuzione Enterprise - Cruscotto Local Opener v$Version

## 📋 Panoramica

Questo pacchetto MSI è progettato per la distribuzione enterprise tramite:
- Group Policy (GPO)
- Microsoft Intune
- System Center Configuration Manager (SCCM)
- PowerShell DSC

## 🚀 Installazione

### Metodo 1: Manuale
``````batch
deploy-enterprise.bat
``````

### Metodo 2: GPO Software Installation
1. Copia il file MSI in una share di rete
2. Apri Group Policy Management Console
3. Crea/modifica una GPO
4. Vai a: Computer Configuration → Policies → Software Settings → Software Installation
5. Aggiungi il pacchetto MSI

### Metodo 3: Intune
1. Carica il file MSI in Microsoft Intune
2. Configura come app Win32
3. Imposta comando di installazione: ``msiexec /i CruscottoLocalOpener-$Version-Enterprise.msi /quiet COMPANY_NAME="[Nome]" COMPANY_CODE="[Codice]"``

### Metodo 4: PowerShell
``````powershell
Start-Process msiexec -ArgumentList "/i CruscottoLocalOpener-$Version-Enterprise.msi /quiet /norestart COMPANY_NAME='Azienda' COMPANY_CODE='ABC123'" -Wait
``````

## ⚙️ Parametri di Configurazione

| Parametro | Descrizione | Esempio |
|-----------|-------------|---------|
| COMPANY_NAME | Nome dell'azienda | "Acme Corporation" |
| COMPANY_CODE | Codice aziendale | "ACME001" |
| DEFAULT_ROOT_DIR | Directory documenti predefinita | "G:\Il mio Drive\ISO" |

## 🔧 Post-Installazione

Il servizio viene configurato automaticamente per:
- ✅ Avvio automatico con Windows
- ✅ Rilevamento Google Drive automatico
- ✅ Configurazione firewall Windows
- ✅ Telemetria abilitata per supporto
- ✅ Auto-aggiornamenti abilitati

## 📊 Monitoraggio

### Health Check
``````
http://127.0.0.1:17654/health
``````

### Log Eventi Windows
- Sorgente: CruscottoLocalOpener
- Categoria: Application

### File di Log
- Configurazione: ``%ALLUSERSPROFILE%\CruscottoLocalOpener\config.json``
- Metriche: ``%USERPROFILE%\.local-opener\metrics.json``

## 🚨 Risoluzione Problemi

### Servizio Non Attivo
``````batch
sc query CruscottoLocalOpener
net start CruscottoLocalOpener
``````

### Diagnostica Automatica
Scarica ed esegui: [debug-local-opener.bat](https://cruscotto-sgi.com/downloads/debug-local-opener.bat)

### Reinstallazione
``````batch
msiexec /x {A7B9C8D2-3E4F-5A6B-7C8D-9E0F1A2B3C4D} /quiet
msiexec /i CruscottoLocalOpener-$Version-Enterprise.msi /quiet
``````

## 📞 Supporto

- **Email**: support@cruscotto-sgi.com
- **Documentazione**: https://docs.cruscotto-sgi.com
- **Telemetria**: Automatica per diagnostica migliorata

---

**Generato**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Versione**: $Version
"@

    $docFile = Join-Path $OutputDir "README-Enterprise.md"
    $documentation | Out-File -FilePath $docFile -Encoding UTF8
    
    Write-Host "✅ Documentazione enterprise creata: $docFile" -ForegroundColor Green
}

# Funzione principale
function Main {
    Write-Host "🏢 Creazione Pacchetto MSI Enterprise" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Prerequisites
    Initialize-OutputDirectory
    Create-ConfigTemplate
    
    $wixFile = Generate-WixFile
    $msiFile = Build-MsiPackage -wixFile $wixFile
    
    Generate-DeploymentScript -msiFile $msiFile
    Generate-Documentation
    
    Write-Host ""
    Write-Host "🎉 Pacchetto Enterprise completato!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host "📦 File MSI: $msiFile" -ForegroundColor White
    Write-Host "🚀 Script Deploy: $(Join-Path $OutputDir 'deploy-enterprise.bat')" -ForegroundColor White
    Write-Host "📖 Documentazione: $(Join-Path $OutputDir 'README-Enterprise.md')" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Per distribuire:" -ForegroundColor Yellow
    Write-Host "   - Manuale: Esegui deploy-enterprise.bat come Admin" -ForegroundColor Yellow
    Write-Host "   - GPO: Configura Software Installation" -ForegroundColor Yellow
    Write-Host "   - Intune: Carica come Win32 App" -ForegroundColor Yellow
    Write-Host ""
}

# Esegui script
Main
