# 🚀 Configurazione Local Opener - Istruzioni per il Cliente

## 📌 **Cosa fa questo sistema?**

Il Local Opener ti permette di aprire i documenti **direttamente dal tuo PC** cliccando l'icona "occhio" nella web app, senza doverli scaricare ogni volta.

---

## 🛠️ **INSTALLAZIONE (Una sola volta per PC)**

### **OPZIONE A: Installazione Automatica (Raccomandato)**

1. **Fai login** nella web app Cruscotto
2. **Apparirà automaticamente** un toast di notifica: 
   > 🚀 "Apertura Documenti Locale - Installa il Local Opener"
3. **Clicca** sul toast → Download automatico
4. **Esegui** il file scaricato `cruscotto-local-opener-setup.exe` **COME AMMINISTRATORE**
   - Clic destro sul file → "Esegui come amministratore"
5. **Segui** il wizard di installazione:
   - Scegli la cartella dove sono i tuoi documenti ISO
   - Inserisci nome azienda (opzionale)
   - Completa installazione

### **OPZIONE B: Installazione Manuale**

1. **Vai** su: Impostazioni → Configurazione Local Opener
2. **Scarica** l'installer da lì
3. **Procedi** come sopra (punto 4-5)

---

## ✅ **VERIFICA INSTALLAZIONE**

Dopo l'installazione:

1. **Riavvia** il browser (importante!)
2. **Fai login** nuovamente
3. **NON dovrebbe più** apparire il toast di installazione
4. **Testa** cliccando l'icona "occhio" su un documento locale

### **Come capire se funziona:**
- ✅ **Funziona**: Il documento si apre direttamente (PDF con Acrobat, Word con Microsoft Word, ecc.)
- ❌ **Non funziona**: Appare toast "Servizio locale non disponibile"

---

## 🔧 **SE QUALCOSA NON FUNZIONA**

### **Problema 1: Toast continua a comparire**

**Significa**: Il servizio non è attivo

**Soluzione**:
```
1. Apri browser
2. Vai su: http://127.0.0.1:17654/health
3. Se NON si apre → Servizio non installato correttamente
   → Ripeti installazione come amministratore
4. Se SI apre → Mostra info del servizio (tutto OK)
```

### **Problema 2: Icona occhio non apre documenti**

**Significa**: Servizio attivo ma non trova i file

**Soluzione**:
1. **Verifica cartelle**: Vai su `http://127.0.0.1:17654/config`
2. **Controlla** che le tue cartelle Google Drive siano elencate
3. **Se mancano**, chiamaci per aggiungerle

### **Problema 3: Trova il file ma non si apre**

**Significa**: Windows non sa quale app usare

**Soluzione**:
1. **Vai** alla cartella del documento manualmente
2. **Clic destro** sul file → "Apri con"
3. **Scegli** l'applicazione predefinita (Adobe Reader per PDF, Microsoft Word per DOC, ecc.)
4. **Riprova** l'icona occhio

---

## 🎯 **DOPO L'INSTALLAZIONE**

### **Comportamento Normale:**

1. **Accendi il PC** → Servizio si avvia automaticamente
2. **Fai login** web app → Nessun toast, tutto pronto
3. **Clicchi icona occhio** → Documento si apre subito
4. **Spegni PC** → Nessun problema, tutto automatico

### **Per Sempre:**
- ✅ **Zero manutenzione**
- ✅ **Zero riconfigurazione** 
- ✅ **Apertura istantanea** documenti
- ✅ **Funziona offline** (se documenti sono locali)

---

## 📞 **SUPPORTO**

**Se hai problemi:**

1. **Prova** le soluzioni sopra
2. **Invia screenshot** di eventuali errori
3. **Specifica** cosa succede quando clicchi l'icona occhio

**Contatto**: [I tuoi contatti di supporto]

---

## ⚡ **RIASSUNTO RAPIDO**

1. **Login** → Toast appare automaticamente
2. **Un click** → Download installer
3. **Esegui come amministratore** → Installazione
4. **Riavvia browser** → Fai login
5. **Icona occhio** → Funziona per sempre! 🎯

