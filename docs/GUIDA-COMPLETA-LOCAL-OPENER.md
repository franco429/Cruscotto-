# 📚 GUIDA COMPLETA LOCAL OPENER - Dal Setup alla Distribuzione

## 🎯 Obiettivo
Questa guida ti accompagna passo-passo dalla configurazione iniziale del Local Opener fino alla distribuzione finale ai tuoi 200+ clienti aziendali.

## ⚠️ **IMPORTANTE: COERENZA DEI PERCORSI**
**NON È POSSIBILE MESCOLARE PERCORSI DIVERSI** - Un account deve usare un unico percorso base (es. solo G:/SGI_Documents). Mescolare drive diversi (G: e H:) causa crash del servizio. Vedi [FLUSSO-CORRETTO-CARICAMENTO-DOCUMENTI-LOCALI.md](./FLUSSO-CORRETTO-CARICAMENTO-DOCUMENTI-LOCALI.md) per dettagli completi.

---

## 📋 PARTE 1: PREPARAZIONE INIZIALE (Tu come Sviluppatore)

### 1.1 Verifica dei File Necessari

Prima di iniziare, assicurati di avere questi file nella cartella `client/public/downloads/`:

```
client/public/downloads/
├── cruscotto-local-opener-setup.exe     ✅ (eseguibile principale)
├── setup-local-opener-task.bat          ✅ (setup base)
├── setup-local-opener-enterprise.bat    ✅ (setup enterprise)
├── local-opener-allusers.xml           ✅ (config multi-utente)
├── nssm.exe                            ✅ (se vuoi il metodo vecchio)
└── README.txt                          ✅ (istruzioni base)
```

### 1.2 Test sul Tuo PC di Sviluppo

#### Passo 1: Esegui il Setup Base
```batch
# Apri CMD come Amministratore (importante!)
cd client\public\downloads
setup-local-opener-task.bat
```

#### Passo 2: Verifica l'Installazione
```batch
# Verifica che il task sia stato creato
schtasks /query /tn LocalOpenerAuto

# Testa manualmente il servizio
curl http://127.0.0.1:17654/health
```

#### Passo 3: Verifica Google Drive Detection
```batch
# Controlla se rileva i tuoi drive
curl http://127.0.0.1:17654/detect-drive-paths
```

Dovresti vedere qualcosa come:
```json
{
  "paths": [
    "G:\\Il mio Drive",
    "C:\\Users\\tuonome\\Google Drive"
  ]
}
```

### 1.3 Test nell'Applicazione Web

1. Apri il tuo browser e vai su SGI Cruscotto
2. Naviga nella sezione documenti
3. Clicca sull'icona occhio (👁️) su un documento locale
4. Il documento dovrebbe aprirsi direttamente nel programma predefinito

---

## 🏢 PARTE 2: PREPARAZIONE PER I CLIENTI

### 2.1 Creazione del Pacchetto di Distribuzione

#### Opzione A: Pacchetto ZIP Base (Piccole Aziende)

```batch
# Crea una cartella pulita
mkdir LocalOpener-Package
cd LocalOpener-Package

# Copia i file essenziali
copy ..\client\public\downloads\cruscotto-local-opener-setup.exe .
copy ..\client\public\downloads\setup-local-opener-task.bat .
copy ..\client\public\downloads\README.txt .

# Crea un file ISTRUZIONI-CLIENTE.txt
```

Contenuto di `ISTRUZIONI-CLIENTE.txt`:
```
INSTALLAZIONE LOCAL OPENER - SGI CRUSCOTTO
==========================================

REQUISITI:
- Windows 10 o superiore
- Google Drive Desktop installato e configurato
- Permessi di amministratore

INSTALLAZIONE:
1. Estrai tutti i file in una cartella (es. Desktop)
2. Click destro su "setup-local-opener-task.bat"
3. Seleziona "Esegui come amministratore"
4. Segui le istruzioni a schermo
5. Riavvia il PC

VERIFICA:
Dopo il riavvio, apri SGI Cruscotto e prova ad aprire un documento.
Se funziona, vedrai il documento aprirsi direttamente!

SUPPORTO:
In caso di problemi, contatta: supporto@tuaazienda.it
```

#### Opzione B: Pacchetto Enterprise (200+ PC)

```batch
# Crea pacchetto enterprise
mkdir LocalOpener-Enterprise
cd LocalOpener-Enterprise

# Copia tutti i file necessari
copy ..\client\public\downloads\*.* .

# Rimuovi file non necessari
del /f temp-verify* debug* test*
```

### 2.2 Firma Digitale (IMPORTANTE per Aziende)

Per evitare warning di sicurezza:

```powershell
# Se hai un certificato code signing
signtool sign /f "certificato.pfx" /p "password" /t http://timestamp.digicert.com cruscotto-local-opener-setup.exe
```

### 2.3 Creazione Script di Deployment Automatico

Crea `deploy-to-clients.ps1`:
```powershell
# Script PowerShell per deployment massivo
param(
    [string]$ClientName,
    [string]$PackagePath = ".\LocalOpener-Enterprise"
)

function Deploy-LocalOpener {
    param([string]$Company)
    
    Write-Host "🚀 Deploying Local Opener to $Company..." -ForegroundColor Green
    
    # Esempio con email
    $emailBody = @"
Gentile Cliente,

Abbiamo preparato un aggiornamento importante per SGI Cruscotto che migliorerà
l'apertura dei documenti locali dal vostro Google Drive.

ISTRUZIONI:
1. Scaricate il file allegato
2. Estraete il contenuto in una cartella
3. Eseguite 'setup-local-opener-enterprise.bat' come amministratore
4. Riavviate il PC

Per deployment su molti PC, usate l'opzione 4 del menu.

Cordiali saluti,
Il Team SGI
"@
    
    # Invia email con allegato (esempio con Outlook)
    # Send-MailMessage -To "$Company@email.com" -Subject "Aggiornamento SGI Cruscotto" -Body $emailBody -Attachments "$PackagePath.zip"
    
    Write-Host "✅ Package sent to $Company" -ForegroundColor Green
}

# Esempio uso per multipli clienti
$clients = @("Cliente1", "Cliente2", "Cliente3")
foreach ($client in $clients) {
    Deploy-LocalOpener -Company $client
}
```

---

## 🚀 PARTE 3: DEPLOYMENT AI CLIENTI

### 3.1 Per Clienti Piccoli (1-10 PC)

#### Metodo 1: Assistenza Remota
1. Pianifica sessione TeamViewer/AnyDesk
2. Scarica il pacchetto sul loro PC
3. Esegui `setup-local-opener-task.bat` come admin
4. Verifica funzionamento
5. Documenta l'installazione

#### Metodo 2: Guida Self-Service
1. Invia email con:
   - Link download pacchetto
   - Video tutorial (registra schermo)
   - Documento PDF con screenshot
2. Supporto telefonico se necessario

### 3.2 Per Clienti Medi (10-50 PC)

#### Usa setup-local-opener-enterprise.bat
1. Connetti via VPN/RDP al loro server
2. Esegui:
```batch
setup-local-opener-enterprise.bat
# Scegli opzione 1 (tutti gli utenti)
```
3. Il setup configura automaticamente:
   - Task per tutti gli utenti
   - Firewall
   - Esclusioni antivirus
   - Log centralizzati

### 3.3 Per Clienti Enterprise (50+ PC)

#### Metodo 1: Active Directory GPO
```powershell
# Sul loro Domain Controller
# 1. Copia files su share di rete
\\server\netlogon\LocalOpener\*

# 2. Crea GPO
New-GPO -Name "LocalOpener Deployment"

# 3. Aggiungi startup script
Set-GPOSetting -Path "Computer\Startup" -Script "\\server\netlogon\LocalOpener\setup-local-opener-enterprise.bat"

# 4. Link a OU
Link-GPO -Name "LocalOpener Deployment" -Target "OU=Computers,DC=cliente,DC=local"
```

#### Metodo 2: Microsoft Intune
1. Crea pacchetto .intunewin:
```powershell
.\IntuneWinAppUtil.exe -c .\LocalOpener-Enterprise -s setup-local-opener-enterprise.bat -o .\Output
```

2. In Intune portal:
   - Apps > Add > Windows app (Win32)
   - Upload .intunewin file
   - Install command: `setup-local-opener-enterprise.bat`
   - Detection: Registry key exists `HKLM\SOFTWARE\LocalOpener\Version`

#### Metodo 3: SCCM/ConfigMgr
1. Crea Application in SCCM
2. Detection method: File exists `C:\ProgramData\LocalOpener\Config\installed.flag`
3. Deploy to device collection

---

## 📊 PARTE 4: MONITORAGGIO E MANUTENZIONE

### 4.1 Verifica Post-Deployment

#### Script di Verifica Remota
```powershell
# check-deployment.ps1
$computers = Get-Content "computers.txt"
$results = @()

foreach ($pc in $computers) {
    $status = Test-Connection -ComputerName $pc -Count 1 -Quiet
    if ($status) {
        $serviceCheck = Invoke-Command -ComputerName $pc -ScriptBlock {
            $task = Get-ScheduledTask -TaskName "LocalOpener*" -ErrorAction SilentlyContinue
            $port = Test-NetConnection -ComputerName localhost -Port 17654
            return @{
                TaskExists = ($null -ne $task)
                TaskStatus = $task.State
                PortOpen = $port.TcpTestSucceeded
            }
        }
        $results += [PSCustomObject]@{
            Computer = $pc
            Online = $true
            TaskExists = $serviceCheck.TaskExists
            TaskStatus = $serviceCheck.TaskStatus
            ServiceActive = $serviceCheck.PortOpen
        }
    }
}

$results | Export-Csv "deployment-status.csv"
```

### 4.2 Raccolta Log Centralizzata

Per clienti enterprise, configura raccolta log:

```powershell
# Esempio con robocopy scheduled task
robocopy "\\client-pc\c$\ProgramData\LocalOpener\Logs" "\\central-server\Logs\LocalOpener\client-pc" /E /MIR /R:3 /W:10
```

### 4.3 Troubleshooting Comuni

#### Problema: "Servizio non disponibile"
```batch
# Sul PC cliente
cd C:\Users\%USERNAME%\Downloads\LocalOpener
debug-local-opener.bat
```

#### Problema: "Drive G: non trovato"
1. Verifica che Google Drive sia installato
2. Attendi 1-2 minuti dopo il login
3. Esegui: `curl http://127.0.0.1:17654/detect-drive-paths-with-retry`

---

## 📦 PARTE 5: DISTRIBUZIONE FINALE

### 5.1 Checklist Pre-Distribuzione

- [ ] **Test completo** su almeno 3 PC diversi
- [ ] **Firma digitale** dell'exe (se possibile)
- [ ] **Documentazione** pronta (PDF, video)
- [ ] **Script deployment** testati
- [ ] **Supporto tecnico** allertato
- [ ] **Backup** della versione precedente

### 5.2 Template Email per Clienti

```
Oggetto: [IMPORTANTE] Aggiornamento SGI Cruscotto - Miglioramento Apertura Documenti

Gentile [Nome Cliente],

Abbiamo sviluppato un importante aggiornamento per SGI Cruscotto che migliorerà
significativamente l'esperienza di apertura dei documenti dal vostro Google Drive.

COSA CAMBIA:
✅ Apertura istantanea dei documenti con un click
✅ Nessun download necessario
✅ Integrazione perfetta con Google Drive Desktop

INSTALLAZIONE:
- Per PC singoli: Seguire le istruzioni nel file allegato
- Per aziende (10+ PC): Contattateci per assistenza deployment

TEMPISTICHE:
Vi chiediamo di completare l'aggiornamento entro [data].

SUPPORTO:
- Email: supporto@vostraazienda.it
- Telefono: xxx-xxxxxxx
- TeamViewer: ID disponibile su richiesta

Cordiali saluti,
[Il Vostro Team]

Allegati:
- LocalOpener-Setup.zip
- Guida-Installazione.pdf
```

### 5.3 Piano di Rollout Graduale

#### Settimana 1: Clienti Pilota (5-10)
- Scegli clienti tech-savvy
- Monitora feedback
- Risolvi problemi iniziali

#### Settimana 2-3: Rollout 25%
- Clienti piccoli/medi
- Affina documentazione
- Crea FAQ

#### Settimana 4-6: Rollout 100%
- Tutti i clienti
- Supporto intensivo
- Monitoring continuo

---

## ✅ CONCLUSIONE

Seguendo questa guida, potrai:
1. **Configurare** Local Opener correttamente
2. **Testare** su diversi ambienti
3. **Distribuire** in modo scalabile
4. **Supportare** i clienti efficacemente

### 🆘 Supporto Rapido

In caso di problemi:
1. Controlla i log: `C:\Logs\LocalOpener\` o `C:\ProgramData\LocalOpener\Logs\`
2. Esegui diagnostica: `debug-local-opener.bat`
3. Verifica task: `schtasks /query /tn LocalOpener*`
4. Test porta: `curl http://127.0.0.1:17654/health`

### 📈 Metriche di Successo

- 95%+ installazioni riuscite al primo tentativo
- <5 minuti tempo medio installazione
- 0 impatto su performance PC
- 100% compatibilità Google Drive

Buon deployment! 🚀
