# 🚨 Troubleshooting Local Opener - Guida per il Cliente

## ❓ **Problema: "Il servizio trova il percorso ma non apre i documenti"**

## ⚠️ **PROBLEMA PRINCIPALE: PERCORSI MISTI**
**Se mescoli drive diversi (G: e H:) o cartelle diverse, il Local Opener crasha!**
- ✅ **CORRETTO**: Usa solo `G:/SGI_Documents` per tutti i documenti
- ❌ **SBAGLIATO**: Mescola `G:/SGI_Copia` + `H:/Copia`

**IMPORTANTE**: Usa sempre lo stesso drive e la stessa cartella base per tutti i documenti.

### 🔍 **Diagnosi Automatica**

1. **Scarica** il file di debug: [debug-local-opener.bat](/downloads/debug-local-opener.bat)
2. **Esegui** cliccando due volte (oppure dal Prompt comandi)
3. **Leggi** i risultati colorati per identificare il problema
4. **Condividi** l'output con il supporto tecnico se necessario

---

## ✅ **Soluzioni per Scenario**

### **SCENARIO A: Servizio Non Attivo**

**Sintomi**: 
- ❌ SERVIZIO NON ATTIVO
- Icona occhio non funziona

**Soluzione**:
```bash
# TEMPORANEA: Avvia manualmente
cd local-opener
npm start

# PERMANENTE: Reinstalla servizio
# 1. Ri-scarica installer da Impostazioni
# 2. Esegui come Amministratore
# 3. Riavvia PC
```

### **SCENARIO B: Servizio Attivo, File Non Trovati**

**Sintomi**:
- ✅ Servizio attivo
- ❌ Cartelle Google Drive non rilevate
- Toast: "File non trovato nel percorso locale"

**CAUSA PRINCIPALE: PERCORSI MISTI**
- Se hai caricato documenti da drive diversi (G: e H:), il Local Opener cerca solo nel percorso base configurato
- **Soluzione**: Unifica tutti i documenti in un unico percorso (es. `G:/SGI_Documents`)

**Soluzione Rapida**:
1. Apri browser: `http://127.0.0.1:17654/config`
2. Verifica che le tue cartelle Google Drive siano elencate
3. Se mancano, aggiungi manualmente:

**Windows (Prompt Comandi)**:
```cmd
curl -X POST http://127.0.0.1:17654/config -H "Content-Type: application/json" -d "{\"addRoot\": \"G:\\Il mio Drive\"}"
```

**PowerShell**:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:17654/config" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"addRoot": "G:\\Il mio Drive"}'
```

### **SCENARIO C: File Trovato, Non Si Apre**

**Sintomi**:
- ✅ Servizio attivo
- ✅ File trovato
- ❌ Applicazione non si avvia

**Cause Possibili**:

#### 1. **App Predefinita Non Configurata**
```bash
# Testa manualmente
cd "C:\percorso\alla\cartella"
start "nome_file.pdf"
```

**Se non funziona**:
- Clic destro sul file → "Apri con"
- Scegli applicazione predefinita (es. Adobe Reader, Microsoft Word)

#### 2. **Permessi File**
- Verifica che il file non sia "solo lettura"
- Controlla che non sia bloccato da Windows
- Clic destro → Proprietà → "Sblocca" se presente

#### 3. **Antivirus/Firewall**
- Temporaneamente disabilita antivirus
- Aggiungi `127.0.0.1:17654` alle eccezioni firewall

---

## 🔧 **Debug Avanzato**

### **Logs del Servizio**
Il servizio Local Opener stampa log nella console. Se avviato manualmente:

```bash
cd local-opener
npm start
# Osserva i messaggi quando clicchi l'icona occhio
```

### **Test Manuale API**

**1. Verifica Health**:
```bash
curl http://127.0.0.1:17654/health
```

**2. Test Apertura File**:
```bash
curl -X POST http://127.0.0.1:17654/open -H "Content-Type: application/json" -d "{\"title\": \"NomeDocumento\", \"revision\": \"Rev01\", \"fileType\": \"pdf\", \"candidates\": [\"NomeDocumento Rev01.pdf\"]}"
```

### **Struttura Cartelle Google Drive**

Il servizio cerca automaticamente in:

**Windows Mirror**:
- `C:\Users\[TuoNome]\Google Drive\`

**Windows Stream** (lettere D-Z):
- `G:\Il mio Drive\`
- `G:\My Drive\`
- `G:\Drive condivisi\`
- `G:\Shared drives\`

---

## 📞 **Supporto**

Se i problemi persistono:

1. **Invia** l'output di `debug-local-opener.bat`
2. **Descrivi** il comportamento specifico (cosa succede quando clicchi l'icona)
3. **Specifica** la struttura delle tue cartelle Google Drive

---

## ⚡ **Risoluzione Rapida - Checklist**

- [ ] **UN SOLO PERCORSO**: Tutti i documenti in un unico drive (es. G:)
- [ ] **UNA SOLA CARTELLA**: Tutti i documenti in una cartella base (es. G:/SGI_Documents)
- [ ] Servizio attivo su porta 17654
- [ ] Endpoint `/health` risponde
- [ ] Cartelle Google Drive configurate correttamente
- [ ] File esistono nel percorso previsto
- [ ] Applicazioni predefinite configurate
- [ ] Firewall/Antivirus non bloccano
- [ ] Permessi file corretti

**Una volta sistemato**: L'icona occhio funzionerà immediatamente per tutti i documenti locali! 🎯

## 📚 **DOCUMENTAZIONE COMPLETA**
Per il flusso completo e dettagliato, vedi: [FLUSSO-CORRETTO-CARICAMENTO-DOCUMENTI-LOCALI.md](./FLUSSO-CORRETTO-CARICAMENTO-DOCUMENTI-LOCALI.md)
