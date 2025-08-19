# 🚀 **Build Guide - Local Opener con Avvio Automatico**

## 🎯 **NUOVO SISTEMA: PORTABLE-FIRST**

**La versione PORTABLE è ora la PRINCIPALE** e include tutte le funzionalità avanzate:
- ✅ **Avvio automatico** come servizio Windows
- ✅ **Diagnostica integrata** per troubleshooting  
- ✅ **Zero dipendenze** esterne richieste
- ✅ **Installazione semplificata** con script batch

## 📋 **Comandi Build Aggiornati**

### **🥇 RACCOMANDATO: Versione Portable Completa**
```bash
npm run build:portable
```
- ✅ **Output**: `dist/portable/` + `dist/cruscotto-local-opener-portable-AGGIORNATO.zip`
- ✅ **Include**: Avvio automatico, diagnostica, NSSM, script di installazione
- ✅ **Distribuzione**: Pronta per frontend web
- 🎯 **Per**: Tutti gli utenti finali (raccomandato)

### **🔧 Alternative per Sviluppo**
```bash
# Build rapido per test
npm run build:universal

# Solo se hai Inno Setup (opzionale)  
npm run build:installer

# Build completo per release (include tutto)
npm run build:all
```

## 📦 **Output Dettagliato**

### **Versione Portable** (`npm run build:portable`)
```
📁 dist/portable/
├── 🚀 local-opener.exe              (Applicazione 36MB)
├── 🔧 nssm.exe                      (Service manager)
├── ⚡ installa-servizio.bat         (INSTALLAZIONE AUTOMATICA)
├── 🔍 diagnostica-servizio.bat      (Troubleshooting)
├── 🗑️ disinstalla-servizio.bat      (Rimozione completa)
├── 📋 avvia-manualmente.bat         (Test console)
├── 📖 README.txt                    (Guida utente)
├── ⚙️ config-esempio.json          (Configurazione)
└── 📁 assets/                       (Risorse)

📦 dist/cruscotto-local-opener-portable-AGGIORNATO.zip (14MB)
```

## 🔄 **Workflow di Distribuzione**

### **Per Frontend Web:**
```bash
# 1. Build versione portable
npm run build:portable

# 2. Copia nel frontend (manuale)
cp dist/cruscotto-local-opener-portable-AGGIORNATO.zip ../client/public/downloads/

# 3. Deploy frontend
# Il file sarà disponibile in /downloads/
```

### **Per Distribuzione Manuale:**
```bash
# Copia intera cartella dist/portable/ 
# Oppure distribuisci il file .zip
```

## ⚠️ **Note Importanti**

### **Installer .exe (Opzionale)**
- ⚠️ Richiede **Inno Setup 6.x** installato manualmente
- 🔄 **Fallback automatico** alla versione portable se manca
- 📊 **Meno priorità** rispetto alla versione portable

### **Compatibilità**
- ✅ **Windows 7 SP1+** supportato
- ✅ **Multi-architettura** (x86, x64, ARM64)  
- ✅ **Nessuna dipendenza** runtime richiesta

## 🎯 **Raccomandazioni Aggiornate**

| Situazione | Comando Raccomandato |
|------------|---------------------|
| **👥 Utenti finali** | `npm run build:portable` |
| **🧪 Testing locale** | `npm run build:portable` |
| **🏢 Distribuzione enterprise** | `npm run build:portable` |
| **📦 Release completa** | `npm run build:all` |
| **🔧 Sviluppo rapido** | `npm run build:universal` |

## ✨ **Vantaggi del Nuovo Sistema**

- 🎯 **Semplicità**: Un solo file ZIP include tutto
- 🔄 **Avvio automatico**: Si installa come servizio Windows
- 🔍 **Autodiagnostica**: Script integrato per risoluzione problemi  
- 📦 **Zero dipendenze**: Funziona su qualsiasi Windows senza prerequisiti
- 🚀 **Distribuzione immediata**: Pronto per il frontend web