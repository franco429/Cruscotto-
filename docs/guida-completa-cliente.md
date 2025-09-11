# 🚀 Pannello Di Controllo SGI - Guida Completa Local Opener

## 🔥 **PROCEDURA AUTOMATICA (Raccomandato)**

### **STEP 1: Login Cliente**
1. Il cliente fa **login normale** nella web app
2. **Automaticamente** dopo 3 secondi appare il toast:
   > 🚀 "Apertura Documenti Locale - Installa il Local Opener"

### **STEP 2: Download Automatico**
1. Cliente **clicca sul toast**
2. **Download automatico** di `cruscotto-local-opener-setup.exe`
3. **Nessuna configurazione** richiesta dal cliente

### **STEP 3: Installazione (Una sola volta)**
1. Cliente **esegue file scaricato COME AMMINISTRATORE**
   - Clic destro → "Esegui come amministratore"
2. **Wizard automatico**:
   - Scegli cartella documenti ISO
   - Nome azienda (opzionale)
   - Installazione servizio Windows
3. **Riavvio browser** (importante!)
4. **⚠️ IMPORTANTE**: Il PC deve essere collegato alla corrente elettrica per il corretto funzionamento del servizio automatico
5. **⚠️ CRITICO**: Usa SEMPRE lo stesso percorso scelto durante la registrazione - NON cambiare drive o cartelle!

### **STEP 4: Verifica Funzionamento**
1. Cliente fa **nuovo login**
2. **NON deve più** apparire il toast
3. **Testa icona occhio** su documento locale
4. **Documento si apre** direttamente (PDF, Word, Excel, ecc.)

---

## 🛠️ **PROCEDURA MANUALE (Se necessario)**

### **Alternativa 1: Via Settings**
1. Settings → Tab "Applicazione"
2. Sezione "Apertura File Locali"
3. Download installer da lì

### **Alternativa 2: URL Diretti**
- **Installer completo**: `https://tua-app.com/downloads/cruscotto-local-opener-setup.exe`
- **Versione portable**: `https://tua-app.com/downloads/cruscotto-local-opener-portable.zip`

---

## ✅ **VERIFICA INSTALLAZIONE RIUSCITA**

### **Test Immediato**
```
1. Apri browser: http://127.0.0.1:17654/health
2. Se appare JSON con "ok": true → Installazione OK
3. Se non si apre → Installazione fallita
```

### **Test Completo**
1. Login web app
2. Vai a Settings → Applicazione → Local Opener
3. Stato deve mostrare "Servizio attivo ✅"
4. Clicca "Testa Apertura File"

---

## ⚡ **REQUISITI DI ALIMENTAZIONE**

### **IMPORTANTE: Condizione Critica**
Il servizio Local Opener **NON si avvia automaticamente** quando il computer è alimentato a batteria. Questo è un comportamento standard di Windows per risparmiare energia.

### **Requisiti per il Funzionamento:**
- **Desktop**: Sempre collegato alla rete elettrica ✅
- **Laptop**: Deve essere collegato all'alimentatore durante l'uso
- **Workstation**: Verificare alimentazione stabile

### **Se il Servizio Non Funziona:**
1. **Verifica alimentazione**: PC collegato alla corrente?
2. **Controlla task**: Apri Task Scheduler → LocalOpenerAuto
3. **Riavvia PC**: Con alimentatore collegato

## 🚨 **RISOLUZIONE PROBLEMI**

### **Toast continua a comparire**
**Causa**: Servizio non installato/avviato
**Soluzione**: 
- Ri-eseguire installer come amministratore
- Riavviare PC **con alimentatore collegato**
- Controllare Windows Defender/Antivirus

### **Icona occhio non funziona**
**Causa**: Cartelle non configurate
**Soluzione**:
- Andare su `http://127.0.0.1:17654/config`
- Verificare che Google Drive sia rilevato
- Aggiungere cartelle manualmente se necessario

### **File trovato ma non si apre**
**Causa**: App predefinite non configurate
**Soluzione**:
- Clic destro su file → "Apri con"
- Impostare Adobe Reader per PDF, Word per DOC, ecc.

---

## 🏢 **PER LE TUE 200 AZIENDE**

### **Scenario Ideale**
1. **Deploy web app** → Toast automatico disponibile
2. **Primo utente** per azienda installa
3. **IT Admin** replica su tutti i PC
4. **Tutti gli utenti** successivi: zero configurazione

### **Scalabilità**
- ✅ **Una installazione per PC** (non per utente)
- ✅ **Servizio Windows** con avvio automatico
- ✅ **Zero manutenzione** successiva
- ✅ **Auto-rilevamento** cartelle Google Drive
- ✅ **Supporto remoto** via browser (`http://127.0.0.1:17654`)

---

## 📊 **MONITORAGGIO E SUPPORTO**

### **Come verificare installazioni**
1. Chiedi al cliente di aprire: `http://127.0.0.1:17654/health`
2. Se risponde → Installato e funzionante
3. Se non risponde → Non installato o problema

### **Debug remoto**
1. Cliente va su Settings → Applicazione
2. Screenshot dello stato Local Opener
3. Invio per supporto

### **Logs del servizio**
- Windows Event Viewer
- Service "CruscottoLocalOpener"

---

## 🎯 **RISULTATO FINALE**

### **Prima Installazione (5 minuti)**
1. Login → Toast → Click → Download
2. Esegui come admin → Wizard completato
3. Riavvia browser → Login

### **Per Sempre (0 secondi)**
1. Login → Tutto automatico
2. Icona occhio → Documento si apre subito
3. Zero intervento utente
4. Funziona offline

**Il sistema trasforma l'esperienza da "Download ogni volta" a "Click e apri"!** 🚀

