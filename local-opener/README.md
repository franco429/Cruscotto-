# 🚀 Cruscotto Local Opener

**Servizio locale per aprire documenti direttamente dal PC con avvio automatico e compatibilità universale Windows.**

## 🎯 **NUOVO: AVVIO AUTOMATICO GARANTITO**

### ✅ **Caratteristiche Principali**
- 🔄 **AVVIO AUTOMATICO**: Si installa come servizio Windows e si avvia ad ogni boot del PC
- 📦 **VERSIONE PORTABLE**: Non richiede Inno Setup o installer complessi  
- 🔧 **DIAGNOSTICA INTEGRATA**: Script di verifica e risoluzione problemi inclusi
- 🛡️ **RESILIENZA**: Restart automatico in caso di crash o problemi
- 📊 **LOGGING AVANZATO**: Log dettagliati per diagnostica e supporto

### 🖥️ **Compatibilità Sistema Estesa**
- ✅ **Windows 7 SP1+** (con aggiornamenti)
- ✅ **Windows 8/8.1** 
- ✅ **Windows 10** (tutte le versioni)
- ✅ **Windows 11** (tutte le versioni)
- ✅ **Windows Server 2008 R2+**
- ✅ **Architetture**: x86, x64, ARM64

### 📁 **Rilevamento Automatico**
- ✅ Auto-rilevamento cartelle Google Drive (lettere C-Z)
- ✅ Supporto percorsi UNC di rete (\\SERVER\Share)
- ✅ Configurazione multi-root persistente
- ✅ Matching intelligente dei file (fuzzy match)

## 🚀 **Build e Distribuzione**

### **✅ Versione Consigliata: PORTABLE**

**La versione portable è ora la PRINCIPALE e include TUTTO:**
- 🔄 Avvio automatico come servizio Windows
- 🔧 Diagnostica integrata
- 📦 Nessuna dipendenza esterna richiesta

### **📋 Prerequisiti Build**

1. **Node.js 20+** 
2. **PowerShell** (per scaricare NSSM)

### **🔨 Comandi Build**

```bash
# 1. Setup iniziale
cd local-opener
npm install

# 2. Scarica NSSM (necessario per servizio Windows)
cd installer && powershell -ExecutionPolicy Bypass -File download-nssm.ps1 && cd ..

# 3. BUILD RACCOMANDATO - Versione Portable Completa
npm run build:portable

# 4. Alternative (opzionali):
npm run build:universal     # Per sistemi moderni x64/ARM64
npm run build:installer     # Se hai Inno Setup installato
```

### **📦 Output Versione Portable**

**Cartella**: `dist/portable/`  
**Archivio**: `dist/cruscotto-local-opener-portable-AGGIORNATO.zip`

**Contenuto:**
```
portable/
├── 🚀 local-opener.exe              (36MB - Applicazione principale)
├── 🔧 nssm.exe                      (Service manager Windows)  
├── ⚡ installa-servizio.bat         (INSTALLAZIONE AVVIO AUTOMATICO)
├── 🔍 diagnostica-servizio.bat      (Verifica e troubleshooting)
├── 🗑️ disinstalla-servizio.bat      (Rimozione completa)
├── 📋 avvia-manualmente.bat         (Test modalità console)
├── 📖 README.txt                    (Guida completa)
├── ⚙️ config-esempio.json          (Configurazione esempio)
└── 📁 assets/                       (Icone e risorse)
```

### **🎯 Distribuzione Frontend**

**Per integrare nel frontend web:**
1. Copia `dist/cruscotto-local-opener-portable-AGGIORNATO.zip`
2. In `client/public/downloads/`
3. Il frontend userà automaticamente questa versione

## 🔧 **Installazione e Configurazione**

### **🚀 Procedura SEMPLIFICATA** 

**1. Download dal Frontend:**
- Vai su **Impostazioni → Applicazione**  
- Clicca **"Scarica Local Opener (Avvio Automatico)"**

**2. Installazione Automatica:**
```bash
# Estrai l'archivio scaricato
# Esegui come Amministratore:
installa-servizio.bat
```

**3. Risultato:**
- ✅ **Servizio installato** come `CruscottoLocalOpener`
- ✅ **Avvio automatico configurato** per ogni boot di Windows  
- ✅ **Rilevamento automatico** cartelle Google Drive
- ✅ **Configurazione salvata** in `%APPDATA%\.local-opener\config.json`
- ✅ **Verifica automatica** che tutto funzioni

### **🔄 Avvio Automatico GARANTITO**

**Dopo l'installazione:**
- 🚀 **Si avvia automaticamente** ad ogni accensione/riavvio del PC
- 🔄 **Restart automatico** se il servizio va in crash  
- 🛡️ **Resilienza** anche dopo aggiornamenti Windows
- 🎯 **Zero intervento manuale** richiesto

### **🔍 Diagnostica e Verifica**

**Script Integrato:**
```bash
# Incluso nell'archivio scaricato:
diagnostica-servizio.bat
```

**Verifica automaticamente:**
- ✅ Stato servizio Windows (`CruscottoLocalOpener`)
- ✅ Configurazione avvio automatico (SERVICE_AUTO_START)
- ✅ Connessione HTTP (`http://127.0.0.1:17654`)
- ✅ File configurazione e log
- 🔧 **Comandi per risolvere** ogni problema specifico

### **⚙️ Configurazione Manuale (Opzionale)**

```bash
# Aggiungi cartelle aggiuntive via API
curl -H "Content-Type: application/json" \
     -d '{"addRoot":"C:/Percorso/Documenti"}' \
     http://127.0.0.1:17654/config

# Verifica stato
curl http://127.0.0.1:17654/health
```

## 🌐 **Integrazione Web App**

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

## 🛠️ **Troubleshooting**

### **🔍 Diagnostica Automatica**

**PRIMA COSA DA FARE:**
```cmd
# Esegui lo script di diagnostica incluso:
diagnostica-servizio.bat
```

Lo script ti dirà **esattamente** cosa non funziona e **come risolverlo**.

### **🚨 Problemi Comuni e Soluzioni**

#### **❌ Servizio Non Installato**
```cmd
# Soluzione: Reinstalla come Amministratore
# 1. Estrai nuovamente l'archivio scaricato
# 2. Tasto destro su "installa-servizio.bat" 
# 3. "Esegui come amministratore"
```

#### **⚠️ Servizio Installato ma Non Avviato**  
```cmd
# Soluzione: Avvia manualmente
sc start CruscottoLocalOpener

# O riavvia il PC completamente
```

#### **🔧 Avvio Automatico Non Configurato**
```cmd
# Soluzione: Configura avvio automatico
sc config CruscottoLocalOpener start= auto
sc start CruscottoLocalOpener
```

#### **🌐 Connessione HTTP Fallisce (porta 17654)**
```cmd
# Soluzione: Verifica firewall
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654

# O disabilita temporaneamente Windows Firewall per test
```

#### **🦠 Antivirus Blocca l'Esecuzione**
- Aggiungi **eccezione** per la cartella del Local Opener
- Disabilita **temporaneamente** l'antivirus durante installazione
- Usa **Windows Defender** come unico antivirus (raccomandato)

### **🔄 Reinstallazione Completa**

Se nulla funziona:
```cmd
# 1. Disinstalla completamente
disinstalla-servizio.bat

# 2. Rimuovi cartelle
rmdir /s "%APPDATA%\.local-opener"

# 3. Riavvia il PC

# 4. Reinstalla da zero
installa-servizio.bat
```

### **📊 Log e Supporto**

- **📁 Configurazione**: `%APPDATA%\.local-opener\config.json`
- **📋 Log servizio**: `%APPDATA%\.local-opener\service.log`  
- **❌ Log errori**: `%APPDATA%\.local-opener\service-error.log`
- **🖥️ Manager servizi**: `services.msc` (cerca "Cruscotto Local Opener")

## Sicurezza

- Ascolta solo su 127.0.0.1 (localhost)
- Non accetta percorsi arbitrari (solo dentro le root configurate)
- Nessun dato sensibile trasmesso al server web
