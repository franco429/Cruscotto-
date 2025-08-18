# Cruscotto Local Opener

Servizio locale per aprire documenti direttamente dal PC con **compatibilità universale Windows**.

## 🎯 Compatibilità Sistema

### Versioni Windows Supportate
- ✅ **Windows 7 SP1+** (con aggiornamenti)
- ✅ **Windows 8/8.1**
- ✅ **Windows 10** (tutte le versioni)
- ✅ **Windows 11** (tutte le versioni)  
- ✅ **Windows Server 2008 R2+**

### Architetture Supportate
- ✅ **x86 (32-bit)** - sistemi legacy
- ✅ **x64 (64-bit)** - standard moderno
- ✅ **ARM64** - dispositivi Windows ARM

## Funzionalità

- ✅ Auto-rilevamento cartelle Google Drive (tutte le lettere C:..Z:)
- ✅ Supporto percorsi UNC di rete (\\SERVER\Share)
- ✅ Configurazione multi-root persistente
- ✅ Matching intelligente dei file (fuzzy match)
- ✅ Avvio automatico come servizio Windows
- ✅ Wizard di configurazione nell'installer
- ✅ **Rilevamento automatico architettura sistema**
- ✅ **Versione portable per massima compatibilità**

## Build e Installazione

### Prerequisiti

1. **Node.js 20+** (aggiornato per compatibilità)
2. PowerShell (per scaricare NSSM)
3. ⚠️ Inno Setup 6.x (opzionale, solo per installer completo)

### Build

```bash
# 1. Installa dipendenze
cd local-opener
npm install

# 2. Scarica NSSM (necessario per servizio Windows)
cd installer
powershell -ExecutionPolicy Bypass -File download-nssm.ps1
cd ..

# 3. BUILD COMPLETO UNIVERSALE (Raccomandato)
npm run build:all
# → Crea tutte le versioni: x86, x64, ARM64, portable e installer

# 4. OPZIONI BUILD SPECIFICHE:

# Build rapido (solo architettura corrente)
npm run build

# Build universale (x64 + ARM64)
npm run build:universal

# Solo versione portable
npm run build:portable-zip

# Solo installer (richiede Inno Setup)
npm run build:installer

# Build completo con debug
npm run build:complete
```

### 🎯 Quale comando usare?

- **`npm run build:all`** ← **RACCOMANDATO** per massima compatibilità
- **`npm run build:universal`** ← Per sistemi moderni (x64/ARM64)
- **`npm run build`** ← Solo per test rapidi

### Output

**Versione Portable (`npm run build:portable`):**
- `dist/portable/local-opener.exe` - Eseguibile principale
- `dist/portable/nssm.exe` - Utility per servizi Windows
- `dist/portable/installa-servizio.bat` - Script di installazione automatica
- `dist/portable/disinstalla-servizio.bat` - Script di rimozione
- `dist/portable/avvia-manualmente.bat` - Avvio in modalità console
- `dist/portable/README.txt` - Istruzioni complete
- `dist/portable/config-esempio.json` - Configurazione di esempio

**Installer Completo (se Inno Setup è installato):**
- `dist/cruscotto-local-opener-setup.exe` - Installer con wizard

### Quale versione scegliere?

- 🚀 **Versione Portable**: Per la maggior parte degli usi. Non richiede software aggiuntivo
- 🏢 **Installer**: Per distribuzioni enterprise o quando serve il wizard di configurazione

## Configurazione

### Automatica (consigliata)

L'installer:
1. Chiede la cartella principale dei documenti ISO
2. Rileva automaticamente Google Drive su tutte le lettere
3. **✅ Installa come servizio Windows con avvio automatico**
4. **✅ Configura il servizio per avviarsi ad ogni boot di Windows**
5. Salva la configurazione in `%APPDATA%\.local-opener\config.json`
6. **✅ Verifica automaticamente che l'installazione sia riuscita**

### 🔄 Avvio Automatico

Dopo l'installazione con l'installer, **il Local Opener si avvierà automaticamente**:
- ✅ Ad ogni accensione/riavvio del PC
- ✅ Anche dopo aggiornamenti di Windows
- ✅ Senza bisogno di aprire il cmd o eseguire file manualmente
- ✅ Funziona in background come servizio Windows

### 🔧 Verifica e Diagnostica

**Script di Diagnostica** (disponibile nel Menu Start):
```bash
# Dalla cartella installazione o Menu Start > Cruscotto Local Opener
diagnostica-servizio.bat
```

Questo script verifica:
- ✅ Stato del servizio Windows
- ✅ Configurazione avvio automatico  
- ✅ Connessione alla porta 17654
- ✅ File di configurazione
- ✅ Log del servizio
- 🔧 Comandi per risolvere problemi comuni

### Manuale

```bash
# Aggiungi cartella
curl -H "Content-Type: application/json" -d "{\"addRoot\":\"C:/Percorso/ISO\"}" http://127.0.0.1:17654/config

# Verifica configurazione
curl http://127.0.0.1:17654/health
```

## Integrazione Web App

1. L'utente clicca l'icona occhio su un documento locale
2. Il client chiama `http://127.0.0.1:17654/open` con:
   - title, revision, fileType, logicalPath
3. Il servizio:
   - Cerca il file nelle cartelle configurate
   - Lo apre con l'app predefinita del sistema
4. Se il servizio non è disponibile, mostra guida installazione

## Percorsi Supportati

- `C:\Users\<Nome>\Google Drive` (Mirror)
- `G:\Il mio Drive`, `H:\My Drive`, ecc. (Stream)
- `\\SERVER\Condivisa\ISO` (Rete)
- Qualsiasi cartella personalizzata

## Deployment Enterprise

Per aziende con molti PC:

1. Crea MSI con configurazione pre-impostata
2. Distribuisci via GPO/Intune/SCCM
3. Pre-configura la root nel file `config.json`
4. Il servizio si avvia automaticamente

## Troubleshooting

### 🔧 Problemi Comuni

- **404 "File non trovato"**: Verifica che il percorso logico corrisponda alla struttura reale
- **Servizio non parte**: Controlla Windows Event Viewer  
- **Permessi negati**: Esegui installer come amministratore

### 🚨 Avvio Automatico Non Funziona

Se dopo l'installazione il Local Opener non si avvia automaticamente:

**1. Verifica Stato Servizio:**
```cmd
# Esegui diagnostica-servizio.bat dal Menu Start o da:
%ProgramFiles%\CruscottoLocalOpener\diagnostica-servizio.bat
```

**2. Installazione Manuale Servizio:**
```cmd
# Se l'installer ha fallito, installa manualmente:
cd "%ProgramFiles%\CruscottoLocalOpener"
nssm install CruscottoLocalOpener local-opener.exe
nssm set CruscottoLocalOpener Start SERVICE_AUTO_START
nssm set CruscottoLocalOpener DelayedAutoStart 1
nssm start CruscottoLocalOpener
```

**3. Verifica Avvio Automatico:**
```cmd
sc qc CruscottoLocalOpener | findstr START_TYPE
# Dovrebbe mostrare: START_TYPE : 2 AUTO_START
```

**4. Riavvio Completo:**
```cmd
# Se ancora non funziona, riavvia PC e testa:
# Dopo riavvio, apri cmd e verifica:
sc query CruscottoLocalOpener
curl http://127.0.0.1:17654/health
```

**5. Installazione Fallback (Manuale):**
Se il servizio Windows non funziona, puoi usare l'avvio con Task Scheduler:
```cmd
# Crea task Windows per avvio automatico:
schtasks /create /tn "Local Opener Startup" /tr "%ProgramFiles%\CruscottoLocalOpener\local-opener.exe" /sc onstart /ru SYSTEM
```

### 📱 Supporto

- **Script Diagnostica**: `diagnostica-servizio.bat` (nel Menu Start)
- **Log Servizio**: `%APPDATA%\.local-opener\service.log`
- **Manager Servizi**: `services.msc` (cerca "Cruscotto Local Opener")
- **Event Viewer**: Windows Logs > System (filtro per "CruscottoLocalOpener")

## Sicurezza

- Ascolta solo su 127.0.0.1 (localhost)
- Non accetta percorsi arbitrari (solo dentro le root configurate)
- Nessun dato sensibile trasmesso al server web
