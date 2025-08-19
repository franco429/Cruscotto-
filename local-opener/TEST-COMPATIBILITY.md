# 🧪 **TEST COMPATIBILITÀ - LOCAL OPENER AVVIO AUTOMATICO**

## 🎯 **Focus: Versione Portable con Avvio Automatico**

**Priorità di test aggiornata:** Versione portable è ora la PRINCIPALE.

## ✅ **Test Base Obbligatori**

### **🔄 Avvio Automatico (CRITICO)**
- [ ] **Installazione servizio**: `installa-servizio.bat` eseguito come Admin
- [ ] **Servizio installato**: `sc query CruscottoLocalOpener` → SERVICE_RUNNING  
- [ ] **Auto-start configurato**: `sc qc CruscottoLocalOpener` → AUTO_START
- [ ] **Riavvio PC**: Dopo reboot, servizio si avvia automaticamente
- [ ] **Connessione HTTP**: `http://127.0.0.1:17654/health` risponde senza intervento manuale

### **🔧 Diagnostica Integrata**
- [ ] **Script diagnostica**: `diagnostica-servizio.bat` funziona
- [ ] **Rilevamento problemi**: Script identifica servizio non installato
- [ ] **Rilevamento problemi**: Script identifica servizio non avviato  
- [ ] **Comandi risoluzione**: Script fornisce comandi corretti per fix

### **🌐 Integrazione Frontend**
- [ ] **Download corretto**: Frontend scarica `cruscotto-local-opener-portable-AGGIORNATO.zip`
- [ ] **Button "Ricontrolla"**: Rileva servizio attivo correttamente
- [ ] **Apertura documenti**: Test apertura file funziona dal frontend

## 🖥️ **Test Compatibilità Sistema**

### **Windows Core (Obbligatori)**
- [ ] **Windows 10 x64**: Installazione e avvio automatico
- [ ] **Windows 11 x64**: Installazione e avvio automatico
- [ ] **Windows 11 ARM64**: Versione portable funziona

### **Windows Legacy (Opzionali)**  
- [ ] **Windows 7 SP1**: Versione portable (servizio può richiedere configurazione manuale)
- [ ] **Windows 8.1**: Versione portable

### **Sicurezza e Antivirus**
- [ ] **Windows Defender**: Non blocca installazione
- [ ] **Antivirus terze parti**: Aggiunta eccezione se necessario
- [ ] **Firewall Windows**: Porta 17654 accessibile  

## 🔧 **Test Edge Cases**
- [ ] **Multiple versioni**: Disinstallazione e reinstallazione
- [ ] **Windows Updates**: Sopravvivenza agli aggiornamenti sistema
- [ ] **Firewall aziendale**: Bypass o configurazione
- [ ] **Cartelle di rete**: Supporto percorsi UNC

## 🧪 Procedure Test

### Test 1: Download e Installazione
```bash
# 1. Scarica da produzione
wget https://cruscotto-sgi.onrender.com/downloads/cruscotto-local-opener-setup.exe

# 2. Verifica dimensione file (deve essere ~40MB)
ls -lh cruscotto-local-opener-setup.exe

# 3. Esegui come amministratore
# Segui wizard installazione

# 4. Verifica servizio attivo
curl http://127.0.0.1:17654/health
```

### Test 2: Versione Portable
```bash
# 1. Scarica ZIP
wget https://cruscotto-sgi.onrender.com/downloads/cruscotto-local-opener-portable.zip

# 2. Estrai
unzip cruscotto-local-opener-portable.zip

# 3. Esegui start.bat come admin
cd cruscotto-local-opener-portable
start.bat

# 4. Verifica funzionamento
curl http://127.0.0.1:17654/health
```

### Test 3: Integrazione Frontend
```javascript
// Test dal browser console
fetch('http://127.0.0.1:17654/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Deve mostrare: {status: "ok", version: "1.0.0", roots: []}
```

### Test 4: Configurazione Cartelle
```bash
# Aggiungi cartella test
curl -X POST http://127.0.0.1:17654/config \
  -H "Content-Type: application/json" \
  -d '{"addRoot":"C:\\Test\\ISO"}'

# Verifica configurazione
curl http://127.0.0.1:17654/config
```

### Test 5: Apertura File  
```bash
# Test apertura file
curl -X POST http://127.0.0.1:17654/open \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document", 
    "revision": "Rev.1",
    "fileType": "pdf",
    "logicalPath": "test",
    "candidates": ["test.pdf", "documento-test.pdf"]
  }'
```

## 📊 Report Test Template

### Informazioni Sistema
- **OS**: Windows XX (build XXXXX)
- **Architettura**: x64/x86/ARM64  
- **Antivirus**: Windows Defender / Altro
- **Privilegi**: Admin / Standard User
- **Rete**: Aziendale / Domestica

### Risultati
- **Download**: ✅/❌ 
- **Installazione**: ✅/❌
- **Servizio Avvio**: ✅/❌
- **Frontend Integration**: ✅/❌
- **File Opening**: ✅/❌

### Issues Trovati
- Descrizione problema
- Messaggi di errore  
- Workaround applicati
- Risoluzione finale

## 🚨 Troubleshooting Common

### "Impossibile eseguire questa app"
1. Prova versione portable
2. Esegui come amministratore
3. Disabilita temporaneamente antivirus
4. Aggiungi eccezione Windows Defender

### "Servizio non si avvia"
1. Controlla porta 17654 libera: `netstat -an | findstr 17654`
2. Verifica privilegi amministratore
3. Controlla Windows Event Viewer
4. Reinstalla come amministratore

### "File non trovato"
1. Verifica percorsi configurati
2. Controlla permessi cartelle
3. Testa path UNC se rete
4. Verifica matching nomi file
