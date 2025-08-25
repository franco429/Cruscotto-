# 🚀 CRUSCOTTO LOCAL OPENER v2.1.0 - GUIDA COMPLETA

## 📋 **PANORAMICA**

Il **Cruscotto Local Opener** è un servizio locale che permette l'apertura diretta dei documenti dal browser web al sistema operativo. La versione 2.1.0 introduce **correzioni definitive per l'avvio automatico** e **due modalità di installazione** per garantire il massimo livello di affidabilità.

## 🔧 **CORREZIONI v2.1.0 - AVVIO AUTOMATICO**

### **Problema Risolto**
- ❌ **Prima**: Il servizio non si avviava automaticamente al riavvio di Windows
- ✅ **Ora**: Avvio automatico garantito con **5 metodi di backup**

### **Soluzioni Implementate**
1. **Task Scheduler Boot**: Avvio al riavvio del sistema (SYSTEM)
2. **Task Scheduler Login**: Avvio al login dell'utente
3. **Servizio Windows**: Configurazione `delayed-auto`
4. **Registro HKLM**: Backup di sistema
5. **Registro HKCU**: Backup utente corrente

### **Nuovi Script di Supporto**
- `CONFIGURA-AVVIO-AUTOMATICO.bat` - Configurazione manuale avvio automatico
- `VERIFICA-AVVIO-AUTOMATICO.bat` - Diagnostica completa del sistema

## ⚠️ **IMPORTANTE: VERIFICA PRE-INSTALLAZIONE**

**PRIMA** di procedere con l'installazione, esegui sempre la verifica pre-installazione:

```
1. CLIC DESTRO su verifica-pre-installazione.bat
2. Seleziona "Esegui"
3. Verifica che tutti i file essenziali siano presenti
```

Questo evita errori durante l'installazione e garantisce il successo dell'operazione.

## 🎯 **MODALITÀ DI INSTALLAZIONE DISPONIBILI**

### **🔧 MODALITÀ 1: SERVIZIO WINDOWS (RACCOMANDATA)**
- **Privilegi richiesti**: Amministratore
- **Avvio**: Automatico al boot del sistema
- **Persistenza**: 24/7, anche senza utente loggato
- **Affidabilità**: Triple redundancy (servizio + task + registro)
- **Auto-Detection**: ✅ COMPLETO - Tutti i percorsi Google Drive

### **👤 MODALITÀ 2: AVVIO UTENTE (ALTERNATIVA)**
- **Privilegi richiesti**: Nessuno (solo utente corrente)
- **Avvio**: Automatico ad ogni login utente
- **Persistenza**: Durante sessione utente
- **Affidabilità**: Triple redundancy (task + registro + startup folder)
- **Auto-Detection**: ✅ COMPLETO - IDENTICO al servizio principale

## 🚀 **INSTALLAZIONE MODALITÀ 1: SERVIZIO WINDOWS**

### **Passo 1: Verifica Pre-Installazione**
```
1. CLIC DESTRO su verifica-pre-installazione.bat
2. Seleziona "Esegui"
3. Conferma che tutti i file essenziali siano presenti
4. Se mancano file, scarica nuovamente il pacchetto
```

### **Passo 2: Preparazione**
```
1. Estrai tutti i file in una cartella
2. Assicurati di essere nella directory corretta
3. CLIC DESTRO su INSTALLA-DEFINITIVO.bat
4. Seleziona "Esegui come amministratore"
```

### **Passo 3: Installazione Automatica**
L'installer eseguirà automaticamente:
- ✅ Creazione directory di sistema
- ✅ Copia file necessari
- ✅ **Rilevamento automatico Google Drive** (multi-lingua)
- ✅ Installazione servizio Windows
- ✅ Configurazione avvio automatico (triple redundancy)
- ✅ Configurazione firewall
- ✅ Verifica finale

### **Passo 4: Verifica**
Esegui `verifica-installazione.ps1` per confermare:
- ✅ Servizio attivo e funzionante
- ✅ Avvio automatico configurato
- ✅ Percorsi Google Drive rilevati
- ✅ Porta 17654 in ascolto

## 👤 **INSTALLAZIONE MODALITÀ 2: AVVIO UTENTE**

### **Passo 1: Verifica Pre-Installazione**
```
1. CLIC DESTRO su verifica-pre-installazione.bat
2. Seleziona "Esegui"
3. Conferma che tutti i file essenziali siano presenti
```

### **Passo 2: Test Auto-Detection**
**PRIMA** di configurare, testa il rilevamento:
```
1. CLIC DESTRO su testa-auto-detection.ps1
2. Seleziona "Esegui con PowerShell"
3. Verifica che tutti i percorsi siano rilevati correttamente
```

### **Passo 3: Configurazione**
```
1. CLIC DESTRO su configura-avvio-utente.ps1
2. Seleziona "Esegui con PowerShell"
3. Conferma l'esecuzione se richiesto
```

### **Passo 4: Configurazione Automatica**
Lo script configurerà:
- ✅ **Rilevamento dinamico COMPLETO** Google Drive per utente corrente
- ✅ **Scansione tutti i drive** disponibili
- ✅ **Rilevamento cartelle progetto** personalizzate (SGI, ultimissimi, ecc.)
- ✅ **Task Scheduler** per avvio automatico
- ✅ **Registro Windows** utente
- ✅ **Startup folder**
- ✅ **Configurazione specifica** per ogni utente

### **Passo 5: Test Immediato**
Esegui `avvia-local-opener.ps1` per testare subito:
- ✅ Avvio Local Opener
- ✅ Verifica porta 17654
- ✅ Conferma configurazione
- ✅ **Auto-Detection completo attivo**

## 🗑️ **DISINSTALLAZIONE COMPLETA**

### **Metodo 1: Disinstallazione Batch (Semplice)**
```
1. CLIC DESTRO su DISINSTALLA-SERVIZIO.bat
2. Seleziona "Esegui come amministratore"
3. Conferma l'esecuzione
4. Attendi il completamento della disinstallazione
```

**Cosa fa:**
- ✅ Ferma e rimuove il servizio Windows
- ✅ Elimina file di sistema
- ✅ Pulisce configurazioni utente
- ✅ Rimuove avvio automatico
- ✅ Termina processi attivi
- ✅ Libera porta 17654
- ✅ Pulisce firewall

### **Metodo 2: Disinstallazione PowerShell (Avanzata)**
```
1. CLIC DESTRO su disinstalla-avanzata.ps1
2. Seleziona "Esegui con PowerShell"
3. Conferma l'esecuzione se richiesto
4. Attendi il completamento della disinstallazione
```

**Cosa fa (oltre al metodo 1):**
- ✅ Logging dettagliato di tutte le operazioni
- ✅ Gestione errori avanzata
- ✅ Verifica post-disinstallazione
- ✅ Modalità verbose disponibile
- ✅ Modalità silenziosa disponibile

### **Verifica Post-Disinstallazione**
Dopo la disinstallazione, verifica che:
- ✅ Il servizio non sia presente in Services.msc
- ✅ La porta 17654 sia libera
- ✅ Non ci siano processi local-opener.exe attivi
- ✅ Le directory di sistema siano state rimosse

### **Reinstallazione Post-Disinstallazione**
Se vuoi reinstallare dopo la disinstallazione:
1. Riavvia il PC per completare la pulizia
2. Segui le istruzioni di installazione normali
3. Il sistema sarà completamente pulito e pronto

## 🔍 **DIAGNOSTICA E TROUBLESHOOTING**

### **Verifica Pre-Installazione (OBBLIGATORIA)**
Esegui `verifica-pre-installazione.bat` per verificare:
- 🔍 Presenza di tutti i file essenziali
- 🔍 Corretta estrazione dal ZIP
- 🔍 Directory di lavoro corretta

### **Script di Diagnostica Avanzata**
Esegui `diagnostica-avanzata.ps1` per identificare problemi:
- 🔍 Verifica privilegi amministratore
- 🔍 Controllo file necessari
- 🔍 Analisi servizio esistente
- 🔍 Verifica porta e firewall
- 🔍 Test NSSM e local-opener.exe

### **Test Auto-Detection Completo**
Esegui `testa-auto-detection.ps1` per verificare:
- 🧪 **Scansione completa tutti i drive**
- 🧪 **Rilevamento Google Drive standard e Desktop**
- 🧪 **Rilevamento cartelle progetto personalizzate**
- 🧪 **Rilevamento OneDrive e shortcut**
- 🧪 **Confronto con configurazione esistente**

### **Problemi Comuni e Soluzioni**

| Problema | Soluzione |
|----------|-----------|
| **"File installer-definitivo.ps1 non trovato"** | Esegui `verifica-pre-installazione.bat` e scarica nuovamente il pacchetto |
| **"Privilegi insufficienti"** | Esegui come amministratore |
| **"Porta 17654 già in uso"** | Termina processi esistenti o riavvia PC |
| **"File non trovato"** | Verifica che tutti i file siano nella stessa cartella |
| **"Servizio non si avvia"** | Usa `diagnostica-avanzata.ps1` per identificare il problema |
| **"Pochi percorsi rilevati"** | Esegui `testa-auto-detection.ps1` per diagnosticare |
| **"Servizio non si rimuove"** | Usa `disinstalla-avanzata.ps1` con modalità verbose |
| **"Porta ancora in uso dopo disinstallazione"** | Riavvia il PC per completare la pulizia |

## 🚨 **RISOLUZIONE PROBLEMA "L'argomento non esiste" - SOLUZIONE DEFINITIVA**

Se ricevi l'errore "L'argomento '.\installer-definitivo.ps1' per il parametro -File non esiste":

### **🔍 CAUSA DEL PROBLEMA IDENTIFICATA**
Il batch file esegue dalla directory `C:\Windows\System32` invece che dalla directory dei file, anche se abbiamo implementato correzioni.

### **✅ SOLUZIONI IMPLEMENTATE (v2.0.1)**

#### **1. CORREZIONE AUTOMATICA NEL BATCH (NUOVO)**
- ✅ **Percorso assoluto automatico**: Il batch ora usa `%~dp0` per ottenere il percorso assoluto
- ✅ **Cambio directory automatico**: `cd /d "%SCRIPT_DIR%"` garantisce la directory corretta
- ✅ **Verifica file con percorso completo**: Controlla l'esistenza con percorso assoluto
- ✅ **Gestione errori avanzata**: Mostra percorsi completi per debugging

#### **2. NUOVO SCRIPT DI VERIFICA PERCORSI (NUOVO)**
Esegui `verifica-percorsi-completa.bat` per diagnosticare problemi di directory:
```
1. CLIC DESTRO su verifica-percorsi-completa.bat
2. Seleziona "Esegui"
3. Analizza l'output per identificare problemi
```

**Cosa fa:**
- 🔍 **Verifica directory di lavoro** vs directory script
- 🔍 **Controllo percorsi assoluti** di tutti i file
- 🔍 **Test permessi e accesso** ai file
- 🔍 **Diagnostica automatica** dei problemi di percorso
- 🔍 **Correzione automatica** della directory se necessario

#### **3. PROCEDURA CORRETTA AGGIORNATA**
```
1. Estrai optimized_local_opener.zip in una cartella
2. Apri quella cartella (IMPORTANTE: non eseguire da altrove)
3. CLIC DESTRO su verifica-percorsi-completa.bat → "Esegui"
4. Se tutto OK, CLIC DESTRO su INSTALLA-DEFINITIVO.bat → "Esegui come amministratore"
```

### **🔧 TROUBLESHOOTING AVANZATO**

#### **Se il problema persiste:**
1. **Esegui verifica-percorsi-completa.bat** per diagnosi completa
2. **Controlla l'output** per identificare directory errate
3. **Verifica che tutti i file** siano nella stessa cartella
4. **Scarica nuovamente** il pacchetto se necessario

#### **Output di verifica-percorsi-completa.bat:**
- ✅ **PERCORSO CORRETTO**: Procedi con l'installazione
- ❌ **PERCORSO ERRATO**: Il batch esegue dalla directory sbagliata
- ❌ **FILE MANCANTI**: Scarica nuovamente il pacchetto

### **💡 PREVENZIONE FUTURA**
- ✅ **Sempre dalla directory corretta**: Non eseguire batch da altre posizioni
- ✅ **Verifica pre-installazione**: Usa sempre gli script di verifica
- ✅ **Percorsi assoluti**: Il nuovo sistema gestisce automaticamente i percorsi
- ✅ **Gestione errori robusta**: Il batch ora mostra informazioni dettagliate

### **🚀 VANTAGGI DELLA NUOVA VERSIONE**
- ✅ **Correzione automatica** dei problemi di percorso
- ✅ **Diagnostica avanzata** con verifica-percorsi-completa.bat
- ✅ **Gestione robusta** dei percorsi assoluti
- ✅ **Messaggi di errore dettagliati** per troubleshooting
- ✅ **Prevenzione automatica** dei problemi di directory

## 🌍 **RILEVAMENTO AUTOMATICO GOOGLE DRIVE COMPLETO**

### **Lingue Supportate**
- 🇮🇹 Italiano: "Il mio Drive"
- 🇺🇸 Inglese: "My Drive"
- 🇫🇷 Francese: "Mon Drive"
- 🇩🇪 Tedesco: "Meine Ablage"
- 🇪🇸 Spagnolo: "Mi unidad"

### **Metodi di Rilevamento COMPLETI**
1. **Scansione Drive**: Tutti i drive disponibili (C:, D:, E:, G:, ecc.)
2. **Home Directory**: Profilo utente corrente
3. **Registro Windows**: Configurazione Google Drive
4. **Processi Attivi**: GoogleDriveFS in esecuzione
5. **OneDrive**: Sincronizzazione Google Drive
6. **Shortcut Targets**: Google Drive Desktop (nuovo formato)
7. **Cartelle Progetto**: Rilevamento automatico (SGI, ultimissimi, lavoro, ecc.)

### **Configurazione Multi-Tenant Dinamica**
- ✅ **Ogni PC rileva automaticamente** i propri percorsi specifici
- ✅ **Configurazione specifica per utente** corrente
- ✅ **Zero configurazione manuale** richiesta
- ✅ **Aggiornamento automatico** percorsi in tempo reale
- ✅ **Rilevamento cartelle personalizzate** dell'utente

## 📁 **STRUTTURA FILE**

```
optimized_local_opener/
├── 📦 local-opener.exe                    # Servizio principale
├── 🔧 nssm.exe                            # Service Manager
├── 🚀 installer-definitivo.ps1            # Installer servizio Windows
├── 📋 INSTALLA-DEFINITIVO.bat             # Wrapper installer (CORRETTO)
├── 🔍 verifica-pre-installazione.bat      # VERIFICA PRE-INSTALLAZIONE (NUOVO)
├── 🔍 verifica-percorsi-completa.bat      # VERIFICA PERCORSI COMPLETA (NUOVO)
├── 🗑️ DISINSTALLA-SERVIZIO.bat            # DISINSTALLAZIONE (NUOVO)
├── 🗑️ disinstalla-avanzata.ps1            # DISINSTALLAZIONE AVANZATA (NUOVO)
├── 👤 configura-avvio-utente.ps1          # Configurazione utente COMPLETA
├── 🚀 avvia-local-opener.ps1              # Script avvio utente
├── 📋 AVVIO-AUTOMATICO-UTENTE.bat         # Avvio manuale utente
├── 🧪 testa-auto-detection.ps1            # Test auto-detection completo
├── 🔍 diagnostica-avanzata.ps1            # Diagnostica completa
├── ✅ verifica-installazione.ps1           # Verifica post-installazione
├── 📚 README-INSTALLAZIONE.md             # Questa guida
├── 📝 CHANGELOG-v2.0.md                   # Note di rilascio
├── 📊 STRUTTURA-FINALE.txt                # Struttura completa
└── 📁 assets/
    └── 📝 README.txt                      # Informazioni aggiuntive
```

## 🎯 **SCELTA DELLA MODALITÀ**

### **Scegli MODALITÀ 1 (Servizio Windows) se:**
- ✅ Hai privilegi amministratore
- ✅ Vuoi massima affidabilità
- ✅ Il servizio deve funzionare 24/7
- ✅ Gestisci un ambiente aziendale

### **Scegli MODALITÀ 2 (Avvio Utente) se:**
- ✅ Non hai privilegi amministratore
- ✅ Vuoi configurazione specifica per utente
- ✅ Il servizio deve funzionare solo durante la sessione
- ✅ Gestisci un ambiente multi-utente
- ✅ **Vuoi auto-detection COMPLETO identico al servizio principale**

## 🚀 **VANTAGGI VERSIONE 2.0.0**

### **🔧 Modalità Servizio Windows**
- ✅ **Avvio automatico garantito** al boot del sistema
- ✅ **Triple redundancy** per massima affidabilità
- ✅ **Funzionamento 24/7** anche senza utente
- ✅ **Configurazione permanente** nel sistema
- ✅ **Gestione errori avanzata** e logging completo
- ✅ **Auto-Detection completo** Google Drive

### **👤 Modalità Avvio Utente**
- ✅ **Zero privilegi amministratore** richiesti
- ✅ **Configurazione specifica per ogni utente**
- ✅ **Rilevamento dinamico COMPLETO** percorsi Google Drive
- ✅ **Avvio automatico ad ogni login**
- ✅ **Funziona anche senza servizio Windows**
- ✅ **Auto-Detection IDENTICO** al servizio principale
- ✅ **Rilevamento cartelle progetto** personalizzate

### **🌍 Funzionalità Comuni**
- ✅ **Rilevamento automatico Google Drive** multi-lingua
- ✅ **Configurazione multi-tenant** dinamica
- ✅ **Zero configurazione manuale** richiesta
- ✅ **Aggiornamento automatico** percorsi
- ✅ **Compatibilità universale** Windows
- ✅ **Auto-Detection completo** per tutti i percorsi

### **🗑️ Disinstallazione Completa**
- ✅ **Rimozione servizio** con doppio metodo (NSSM + SC)
- ✅ **Pulizia file e directory** sistema e utente
- ✅ **Rimozione avvio automatico** (Task + Registro + Startup)
- ✅ **Terminazione processi** attivi
- ✅ **Liberazione porta** 17654
- ✅ **Pulizia firewall** e file temporanei

## 📞 **SUPPORTO E TROUBLESHOOTING**

### **Prima di Contattare il Supporto**
1. ✅ Esegui `verifica-pre-installazione.bat` (OBBLIGATORIO)
2. ✅ Esegui `diagnostica-avanzata.ps1`
3. ✅ Esegui `testa-auto-detection.ps1` per verificare rilevamento
4. ✅ Prova entrambe le modalità di installazione
5. ✅ Verifica che tutti i file siano presenti
6. ✅ Controlla i log in `%APPDATA%\.local-opener\logs\`

### **Per Problemi di Disinstallazione**
1. ✅ Esegui `disinstalla-avanzata.ps1` con modalità verbose
2. ✅ Verifica che non ci siano processi bloccati
3. ✅ Controlla che la porta 17654 sia libera
4. ✅ Riavvia il PC se necessario

### **Informazioni Utili per il Supporto**
- Modalità di installazione scelta
- Output di `verifica-pre-installazione.bat`
- Output di `diagnostica-avanzata.ps1`
- Output di `testa-auto-detection.ps1`
- Output di `disinstalla-avanzata.ps1` (se applicabile)
- Messaggi di errore specifici
- Versione Windows e privilegi utente

---

## 🎉 **CONCLUSIONE**

Il **Cruscotto Local Opener v2.0.0** offre **due modalità di installazione** per garantire il massimo livello di compatibilità e affidabilità. **Entrambe le modalità** forniscono **auto-detection completo** identico, garantendo che ogni cliente rilevi automaticamente tutti i suoi percorsi Google Drive specifici.

### **🎯 PER I TUOI CLIENTI:**
- ✅ **Auto-Detection COMPLETO** come nel tuo sistema
- ✅ **Rilevamento automatico** di tutti i percorsi Google Drive
- ✅ **Configurazione specifica** per ogni utente
- ✅ **Avvio automatico** al boot di Windows
- ✅ **Zero configurazione manuale** richiesta

### **🔧 RISOLUZIONE PROBLEMI:**
- ✅ **Verifica pre-installazione** obbligatoria
- ✅ **Gestione percorsi corretta** nei batch file
- ✅ **Diagnostica avanzata** per troubleshooting
- ✅ **Disinstallazione completa** e pulita
- ✅ **Istruzioni chiare** per ogni modalità

**Buona installazione! 🎯**
