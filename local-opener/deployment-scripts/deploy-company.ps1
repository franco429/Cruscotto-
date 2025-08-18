# 🏢 Script PowerShell per Deployment Aziendale Local Opener
# Uso: .\deploy-company.ps1 -CompanyName "SGI Solutions" -CompanyCode "SGI001" -RootPath "G:\Il mio Drive"

param(
    [Parameter(Mandatory=$true)]
    [string]$CompanyName,
    
    [Parameter(Mandatory=$true)]
    [string]$CompanyCode,
    
    [Parameter(Mandatory=$false)]
    [string]$RootPath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$InstallerUrl = "https://cruscotto-sgi.onrender.com/downloads/cruscotto-local-opener-setup.exe",
    
    [Parameter(Mandatory=$false)]
    [switch]$Silent = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoRestart = $true
)

Write-Host "🏢 DEPLOYMENT LOCAL OPENER - $CompanyName" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# 1. Verifica privilegi amministratore
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "❌ ERRORE: Script richiede privilegi amministratore"
    Write-Host "💡 SOLUZIONE: Esegui PowerShell come Amministratore e riprova"
    exit 1
}

# 2. Crea directory temporanea
$TempDir = "$env:TEMP\local-opener-deploy"
if (!(Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

# 3. Download installer
$InstallerPath = "$TempDir\cruscotto-local-opener-setup.exe"
Write-Host "📥 Download installer da: $InstallerUrl" -ForegroundColor Yellow

try {
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing
    Write-Host "✅ Download completato: $InstallerPath" -ForegroundColor Green
} catch {
    Write-Error "❌ ERRORE download: $($_.Exception.Message)"
    exit 1
}

# 4. Verifica integrità file
if (!(Test-Path $InstallerPath) -or (Get-Item $InstallerPath).Length -lt 1MB) {
    Write-Error "❌ ERRORE: File installer corrotto o incompleto"
    exit 1
}

# 5. Costruisci parametri installazione
$InstallArgs = @()
if ($Silent) { $InstallArgs += "/SILENT" }
if ($NoRestart) { $InstallArgs += "/NORESTART" }
$InstallArgs += "/COMPANY=`"$CompanyName`""
$InstallArgs += "/COMPANYCODE=`"$CompanyCode`""
if ($RootPath) { $InstallArgs += "/ROOTDIR=`"$RootPath`"" }

Write-Host "🔧 Parametri installazione:" -ForegroundColor Yellow
$InstallArgs | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }

# 6. Esegui installazione
Write-Host "🚀 Avvio installazione..." -ForegroundColor Yellow

try {
    $Process = Start-Process -FilePath $InstallerPath -ArgumentList $InstallArgs -Wait -PassThru
    
    if ($Process.ExitCode -eq 0) {
        Write-Host "✅ INSTALLAZIONE COMPLETATA CON SUCCESSO!" -ForegroundColor Green
    } else {
        Write-Error "❌ ERRORE installazione: Exit Code $($Process.ExitCode)"
        exit $Process.ExitCode
    }
} catch {
    Write-Error "❌ ERRORE esecuzione installer: $($_.Exception.Message)"
    exit 1
}

# 7. Verifica servizio installato
Write-Host "🔍 Verifica installazione servizio..." -ForegroundColor Yellow

try {
    $Service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction Stop
    Write-Host "✅ Servizio trovato: $($Service.Status)" -ForegroundColor Green
    
    if ($Service.Status -ne "Running") {
        Write-Host "🔄 Avvio servizio..." -ForegroundColor Yellow
        Start-Service -Name "CruscottoLocalOpener"
        Start-Sleep -Seconds 3
        
        $Service = Get-Service -Name "CruscottoLocalOpener"
        if ($Service.Status -eq "Running") {
            Write-Host "✅ Servizio avviato correttamente" -ForegroundColor Green
        } else {
            Write-Warning "⚠️ Servizio installato ma non in esecuzione"
        }
    }
} catch {
    Write-Error "❌ ERRORE: Servizio non trovato o non accessibile"
    exit 1
}

# 8. Test connettività
Write-Host "🧪 Test connettività servizio..." -ForegroundColor Yellow

try {
    $Response = Invoke-RestMethod -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5
    if ($Response.ok) {
        Write-Host "✅ Servizio risponde correttamente" -ForegroundColor Green
        Write-Host "📂 Cartelle configurate: $($Response.roots.Count)" -ForegroundColor Cyan
        $Response.roots | ForEach-Object { Write-Host "   - $_" -ForegroundColor Cyan }
    } else {
        Write-Warning "⚠️ Servizio risponde ma stato non OK"
    }
} catch {
    Write-Warning "⚠️ Impossibile testare connettività (normale nei primi secondi)"
}

# 9. Cleanup
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

# 10. Riepilogo finale
Write-Host "" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETATO!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "🏢 Azienda: $CompanyName ($CompanyCode)" -ForegroundColor Cyan
Write-Host "💻 PC: $env:COMPUTERNAME" -ForegroundColor Cyan
Write-Host "👤 Utente: $env:USERNAME" -ForegroundColor Cyan
Write-Host "⚡ Servizio: Installato e attivo" -ForegroundColor Cyan
Write-Host "🔄 Auto-start: Configurato" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green
Write-Host "💡 L'icona occhio 👁️ nella web app ora funzionerà automaticamente!" -ForegroundColor Yellow
Write-Host "📋 Per diagnosi: Scarica debug-local-opener.bat dalle Impostazioni" -ForegroundColor Yellow
