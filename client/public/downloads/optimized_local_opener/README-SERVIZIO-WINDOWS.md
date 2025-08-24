# Local Opener - Servizio Windows Nativo

## 🎯 Soluzione Definitiva per Avvio Automatico

Questo pacchetto risolve definitivamente il problema dell'avvio automatico di Local Opener, installando il servizio come **servizio Windows nativo** che si avvia automaticamente al boot del sistema.

## 🚀 Vantaggi della Soluzione

### ✅ **Sempre Attivo 24/7**
- Il servizio si avvia automaticamente ad ogni accensione del PC
- Continua a funzionare anche se chiudi la sessione utente
- Riavvio automatico in caso di crash o problemi

### 🔍 **Auto-Discovery Completo Google Drive**
- Rileva automaticamente TUTTI i percorsi Google Drive Desktop
- Scansione completa di tutte le lettere di unità (A-Z)
- Supporto per percorsi alternativi ("Il mio Drive", "My Drive", etc.)
- Configurazione automatica senza intervento manuale

### 🛡️ **Gestione Professionale**
- Servizio Windows nativo gestito dal sistema operativo
- Logging integrato nel sistema Windows
- Gestione automatica dei privilegi e permessi
- Configurazione persistente tra i riavvii

## 📦 File Inclusi

### 🔧 **Script di Installazione**
- `INSTALLA-SERVIZIO-FINALE.bat` - **INSTALLAZIONE COMPLETA** (raccomandato)
- `INSTALLA-SERVIZIO-AMMINISTRATORE.bat` - Installazione base del servizio
- `DISINSTALLA-SERVIZIO.bat` - Rimozione completa del servizio

### 🎛️ **Gestione Servizio**
- `GESTISCI-SERVIZIO.bat` - Menu completo per gestire il servizio
- `diagnostica-servizio.bat` - Diagnostica completa del sistema
- `diagnostica-servizio.ps1` - Script PowerShell per analisi dettagliata

### 📁 **File Principali**
- `local-opener.exe` - Eseguibile del servizio
- `package.json` - Configurazione Node.js
- `index.js` - Codice principale del servizio

## 🚀 **Installazione Rapida (RACCOMANDATA)**

### **Passo 1: Preparazione**
1. Scarica `optimized_local_opener.zip`
2. Estrai l'archivio in una cartella del PC
3. Assicurati di avere privilegi di amministratore

### **Passo 2: Installazione Automatica**
1. **CLIC DESTRO** su `INSTALLA-SERVIZIO-FINALE.bat`
2. Seleziona **"Esegui come amministratore"**
3. Clicca **"Sì"** quando richiesto per i privilegi
4. ✅ **INSTALLAZIONE COMPLETATA!**

### **Passo 3: Verifica**
1. Riavvia il PC per testare l'avvio automatico
2. Apri `http://127.0.0.1:17654` nel browser
3. Il servizio è ora attivo e funzionante!

## 🔧 **Gestione del Servizio**

### **Menu di Gestione**
Esegui `GESTISCI-SERVIZIO.bat` per accedere al menu completo:

1. **Verifica stato servizio** - Controlla lo stato attuale
2. **Avvia servizio** - Avvia il servizio manualmente
3. **Ferma servizio** - Ferma il servizio
4. **Riavvia servizio** - Riavvia il servizio
5. **Configura avvio automatico** - Imposta avvio automatico
6. **Test connessione HTTP** - Verifica funzionamento
7. **Diagnostica completa** - Analisi dettagliata del sistema

### **Comandi da Terminale**
```cmd
# Verifica stato
sc query CruscottoLocalOpener

# Avvia servizio
sc start CruscottoLocalOpener

# Ferma servizio
sc stop CruscottoLocalOpener

# Riavvia servizio
sc stop CruscottoLocalOpener && sc start CruscottoLocalOpener

# Configura avvio automatico
sc config CruscottoLocalOpener start= auto
```

## 🔍 **Auto-Discovery Google Drive**

### **Percorsi Rilevati Automaticamente**
Il servizio rileva automaticamente:

- **Percorsi utente**: `%USERPROFILE%\Google Drive`
- **Percorsi alternativi**: `%USERPROFILE%\Il mio Drive`, `%USERPROFILE%\My Drive`
- **Tutte le unità**: `A:\Google Drive` fino a `Z:\Google Drive`
- **Varianti comuni**: `Google Drive (1)`, `Google Drive (2)`, etc.
- **Integrazione OneDrive**: `%USERPROFILE%\OneDrive\Google Drive`

### **Configurazione Automatica**
- I percorsi vengono rilevati e configurati automaticamente
- Nessun intervento manuale richiesto
- Configurazione persistente tra i riavvii
- Log completo di tutti i percorsi trovati

## 📊 **Monitoraggio e Log**

### **File di Log**
- `C:\ProgramData\.local-opener\service-install.log` - Log installazione
- `C:\ProgramData\.local-opener\discovery.log` - Log auto-discovery
- `C:\ProgramData\.local-opener\config.json` - Configurazione servizio

### **Monitoraggio in Tempo Reale**
- **Gestione Servizi Windows**: `services.msc`
- **Eventi Sistema**: `eventvwr.msc`
- **Gestione Attività**: `taskmgr.exe`

## 🛠️ **Risoluzione Problemi**

### **Problemi Comuni**

#### **Servizio non si avvia**
```cmd
# Verifica errori
sc query CruscottoLocalOpener

# Controlla log
type C:\ProgramData\.local-opener\service-install.log

# Riavvia servizio
sc stop CruscottoLocalOpener && sc start CruscottoLocalOpener
```

#### **Porta 17654 non accessibile**
```cmd
# Verifica firewall
netsh advfirewall firewall show rule name="Local Opener Service"

# Riconfigura firewall
netsh advfirewall firewall add rule name="Local Opener Service" dir=in action=allow protocol=TCP localport=17654
```

#### **Percorsi Google Drive non rilevati**
```cmd
# Esegui diagnostica
diagnostica-servizio.bat

# Verifica configurazione
type C:\ProgramData\.local-opener\config.json
```

### **Diagnostica Completa**
Esegui `diagnostica-servizio.bat` per:
- Verifica stato servizio
- Controllo processi attivi
- Test connessione HTTP
- Verifica configurazione firewall
- Analisi file di configurazione
- Test auto-discovery Google Drive

## 🔄 **Aggiornamenti e Manutenzione**

### **Aggiornamento Servizio**
1. Ferma il servizio: `sc stop CruscottoLocalOpener`
2. Sostituisci i file necessari
3. Riavvia il servizio: `sc start CruscottoLocalOpener`

### **Backup Configurazione**
```cmd
# Backup configurazione
copy "C:\ProgramData\.local-opener\config.json" "C:\backup\local-opener-config-backup.json"

# Ripristino configurazione
copy "C:\backup\local-opener-config-backup.json" "C:\ProgramData\.local-opener\config.json"
```

## 🗑️ **Disinstallazione Completa**

### **Rimozione Servizio**
1. Esegui `DISINSTALLA-SERVIZIO.bat` come amministratore
2. Il servizio viene rimosso dal sistema
3. Tutti i file di configurazione vengono eliminati
4. Le regole firewall vengono rimosse

### **Rimozione Manuale**
```cmd
# Rimuovi servizio
sc delete CruscottoLocalOpener

# Rimuovi configurazione
rmdir /s /q "C:\ProgramData\.local-opener"
rmdir /s /q "%APPDATA%\.local-opener"
```

## 🌐 **Verifica Funzionamento**

### **Test HTTP**
```cmd
# Test endpoint principale
curl http://127.0.0.1:17654

# Test endpoint health
curl http://127.0.0.1:17654/health

# Test connessione (se curl non disponibile)
start http://127.0.0.1:17654
```

### **Indicatori di Successo**
- ✅ Servizio attivo in Gestione Servizi Windows
- ✅ Porta 17654 in ascolto (`netstat -an | find ":17654"`)
- ✅ Risposta HTTP da `http://127.0.0.1:17654`
- ✅ Percorsi Google Drive configurati in `config.json`

## 📋 **Requisiti di Sistema**

### **Sistema Operativo**
- ✅ Windows 7 SP1 o superiore
- ✅ Windows 10 (tutte le versioni)
- ✅ Windows 11 (tutte le versioni)

### **Privilegi**
- 🔐 **Privilegi amministratore** per l'installazione
- 👤 Privilegi utente normale per l'uso quotidiano

### **Software**
- ✅ Nessun software aggiuntivo richiesto
- ✅ Funziona con Google Drive Desktop installato
- ✅ Compatibile con OneDrive e altri servizi cloud

## 🎯 **Funzionalità Avanzate**

### **Gestione Automatica**
- **Riavvio automatico** in caso di crash
- **Recovery automatico** da errori temporanei
- **Logging automatico** di tutti gli eventi
- **Configurazione persistente** tra i riavvii

### **Integrazione Sistema**
- **Gestione Servizi Windows** nativa
- **Eventi Sistema** integrati
- **Performance Monitor** supportato
- **Task Scheduler** compatibile

## 📞 **Supporto e Assistenza**

### **Documentazione**
- Questo README contiene tutte le informazioni necessarie
- Script di diagnostica per identificare problemi
- Log dettagliati per troubleshooting

### **Risoluzione Autonoma**
1. Esegui `diagnostica-servizio.bat`
2. Controlla i log in `C:\ProgramData\.local-opener\`
3. Usa `GESTISCI-SERVIZIO.bat` per operazioni comuni
4. Riavvia il PC per problemi di avvio automatico

### **Contatti**
Per assistenza tecnica, consulta la documentazione del progetto principale.

---

## 🎉 **Installazione Completata!**

Una volta installato, Local Opener funzionerà **automaticamente e permanentemente**:

- 🚀 **Si avvia automaticamente** ad ogni boot del PC
- 🔄 **Continua a funzionare** anche se chiudi la sessione utente
- 🔍 **Rileva automaticamente** tutti i percorsi Google Drive
- 🛡️ **Gestito professionalmente** dal sistema Windows
- 📊 **Monitorabile** tramite strumenti Windows standard

**Il servizio è ora parte integrante del sistema e funziona 24/7!**
