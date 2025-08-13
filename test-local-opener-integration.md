# 🧪 TEST INTEGRATION LOCAL OPENER - CHECKLIST PRODUCTION

## 📋 **Test Scenario 1: Solo Google Drive Online**

### **Setup:**
```bash
1. Nuovo cliente registrazione
2. Inserisce URL Google Drive
3. NON carica documenti locali
4. Completa registrazione
```

### **Test Attesi:**
- ✅ Login automatico post-registrazione
- ✅ NO toast Local Opener (perché count = 0)
- ✅ Sync Google Drive funziona
- ✅ Icona occhio apre documenti via browser

### **Command Test:**
```bash
# Verifica endpoint
curl -H "Cookie: sessionid=..." http://localhost:5000/api/documents/local-count
# Risposta attesa: {"count": 0, "totalDocuments": X, "hasGoogleDrive": true}
```

---

## 📋 **Test Scenario 2: Solo Documenti Locali**

### **Setup:**
```bash
1. Nuovo cliente registrazione  
2. NON inserisce URL Google Drive
3. NON carica documenti durante registrazione
4. Completa registrazione
5. Dalla dashboard: "Aggiorna documenti locali"
```

### **Test Attesi:**
- ✅ Login automatico post-registrazione
- ✅ NO toast Local Opener iniziale (count = 0)
- ✅ Dopo upload: Toast Local Opener appare
- ✅ Install Local Opener
- ✅ Icona occhio apre documenti locali

### **Command Test:**
```bash
# Prima dell'upload
curl -H "Cookie: sessionid=..." http://localhost:5000/api/documents/local-count
# Risposta: {"count": 0, ...}

# Dopo upload
curl -H "Cookie: sessionid=..." http://localhost:5000/api/documents/local-count  
# Risposta: {"count": 5, ...}
```

---

## 📋 **Test Scenario 3: Upload Durante Registrazione (Problematico)**

### **Setup:**
```bash
1. Nuovo cliente registrazione
2. NON inserisce URL Google Drive  
3. CARICA documenti durante registrazione
4. Completa registrazione
```

### **Test Attesi:**
- ✅ Login automatico post-registrazione
- ✅ Toast Local Opener appare (count > 0)
- ⚠️ **PROBLEMA**: Documenti sono sul server, non in Google Drive locale
- ❌ Icona occhio NON funziona (Local Opener non trova file)

### **Fix Necessario:**
**Opzione A**: Cliente deve copiare documenti in Google Drive locale
**Opzione B**: Sistema converte documenti da server a locale

---

## 📋 **Test Scenario 4: Sistema Ibrido**

### **Setup:**
```bash
1. Nuovo cliente registrazione
2. Inserisce URL Google Drive
3. Sync Google Drive attiva
4. Successivamente: "Aggiorna documenti locali"
```

### **Test Attesi:**
- ✅ Login: NO toast iniziale (solo Google Drive)
- ✅ Dopo upload locali: Toast Local Opener appare
- ✅ Tabella mostra mix documenti Google Drive + Locali
- ✅ Icona occhio funziona per entrambi i tipi

---

## 🔧 **Test Tecnici Essenziali**

### **1. Endpoint Backend:**
```bash
# Test autenticazione
curl http://localhost:5000/api/documents/local-count
# Atteso: 401 Unauthorized

# Test con session
curl -H "Cookie: connect.sid=..." http://localhost:5000/api/documents/local-count
# Atteso: {"count": N, "totalDocuments": M, "hasGoogleDrive": boolean}
```

### **2. Local Opener Service:**
```bash
# Test salute
curl http://127.0.0.1:17654/health
# Atteso: {"ok": true, "roots": [...]}

# Test apertura
curl -X POST http://127.0.0.1:17654/open \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","candidates":["test.pdf"]}'
```

### **3. Download Files:**
```bash
# Test installer
curl -I http://localhost:5000/downloads/cruscotto-local-opener-setup.exe
# Atteso: 200 OK, Content-Type: application/octet-stream

# Test debug script  
curl -I http://localhost:5000/downloads/debug-local-opener.bat
# Atteso: 200 OK
```

---

## 🚨 **Issues da Risolvere**

### **Issue 1: Upload Registrazione**
**Problema**: Documenti caricati durante registrazione vanno sul server
**Impatto**: Local Opener non li trova
**Fix**: Documentazione chiara + workflow corretto

### **Issue 2: Telemetria Endpoint**
**Problema**: `https://api.cruscotto-sgi.com` potrebbe non esistere
**Fix**: Configurare endpoint reale o mocking

### **Issue 3: Auto-updater**
**Problema**: URL versioni potrebbe essere non valido
**Fix**: Configurare endpoint versioni reale

---

## ✅ **Production Ready Checklist**

- [ ] Endpoint `/api/documents/local-count` funziona
- [ ] Smart toast logic funziona
- [ ] Files download disponibili
- [ ] Local Opener service builds
- [ ] Test scenario 1 (Google Drive Only) ✅
- [ ] Test scenario 2 (Local Only) ✅  
- [ ] Test scenario 4 (Hybrid) ✅
- [ ] Documentazione cliente aggiornata
- [ ] Error handling completo
- [ ] Logging appropriato

---

## 🎯 **Recommended Next Steps**

1. **Esegui tutti i test scenarios**
2. **Fixa endpoint telemetria** (se necessario)
3. **Testa in ambiente simil-produzione**
4. **Documenta workflow per cliente**
5. **Deploy con confidence** 🚀
