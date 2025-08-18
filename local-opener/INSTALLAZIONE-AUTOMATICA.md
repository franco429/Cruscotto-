# 🚀 Local Opener - Installazione Automatica per Windows

## ✅ Caratteristiche Implementate

### 🔧 Installazione del Servizio
- **Auto-avvio Windows**: Il servizio si avvia automaticamente ad ogni accensione del PC
- **Nessun privilegio admin richiesto**: Dopo l'installazione, funziona senza elevazione
- **Rilevamento automatico Google Drive**: Trova automaticamente tutte le cartelle Google Drive locali
- **Gestione errori avanzata**: Restart automatico in caso di crash
- **Logging completo**: Log dettagliati per debugging

### 🌐 Rilevamento Cartelle Google Drive
Il servizio rileva automaticamente:
- **Google Drive Mirror**: `%USERPROFILE%\Google Drive`, `%USERPROFILE%\GoogleDrive`
- **Google Drive Stream**: Scansione lettere D-Z per `Il mio Drive`, `My Drive`
- **Drive Condivisi**: `Drive condivisi`, `Shared drives`
- **Cartelle personalizzate**: Via variabile ambiente `GOOGLE_DRIVE_PATH`

### 💻 Comando di Apertura
- **Usa cmd standard Windows**: `cmd /c start "" "file.ext"`
- **Nessun terminal Node.js**: Evita problemi di percorsi irraggiungibili
- **Apertura diretta**: I file si aprono con l'applicazione predefinita di Windows

## 📦 Come Installare

### 1. Installer Universale (Raccomandato)
```bash
# Scarica da Impostazioni → Applicazione → "Installer Universale"
# Oppure direttamente:
https://cruscotto-sgi.onrender.com/downloads/cruscotto-local-opener-setup.exe
```

**Caratteristiche:**
- ✅ Auto-detection architettura (x86, x64, ARM64)
- ✅ Installazione servizio Windows automatica
- ✅ Configurazione firewall automatica
- ✅ Eccezione Windows Defender
- ✅ Auto-start configurato
- ✅ Rilevamento Google Drive automatico

### 2. Installazione Silenziosa (IT/Automazione)
```cmd
# Installazione automatica senza interfaccia
cruscotto-local-opener-setup.exe /SILENT /NORESTART

# Con parametri personalizzati
cruscotto-local-opener-setup.exe /SILENT /ROOTDIR="C:\DocumentiISO" /COMPANY="AziendaXYZ"
```

### 3. Versione Portable
```bash
# Per test o installazioni temporanee
https://cruscotto-sgi.onrender.com/downloads/cruscotto-local-opener-portable.zip
```

## 🔍 Verifica Installazione

### Script di Diagnosi Automatica
```cmd
# Scarica e esegui lo script debug
debug-local-opener.bat
```

Lo script verifica automaticamente:
- ✅ Stato servizio Windows
- ✅ Cartelle Google Drive rilevate
- ✅ Configurazione firewall
- ✅ Test funzionale apertura file
- ✅ Auto-start configurato

### Controllo Manuale
```cmd
# Verifica servizio
sc query "CruscottoLocalOpener"

# Verifica auto-start
sc qc "CruscottoLocalOpener" | findstr "AUTO_START"

# Test connessione
curl http://127.0.0.1:17654/health

# Avvio manuale se necessario
net start CruscottoLocalOpener
```

## 🛠️ Risoluzione Problemi

### Problema: Servizio non si avvia
**Soluzioni:**
1. Riavvia il PC (il servizio si avvia automaticamente)
2. Avvio manuale: `net start CruscottoLocalOpener`
3. Reinstalla con l'Installer Universale

### Problema: Cartelle Google Drive non trovate
**Soluzioni:**
1. Il rilevamento automatico trova la maggior parte dei casi
2. Aggiungi manualmente dalle Impostazioni → Applicazione
3. Imposta variabile ambiente: `set GOOGLE_DRIVE_PATH=C:\MiaCartella`

### Problema: File non si aprono
**Soluzioni:**
1. Esegui test dalle Impostazioni: "Testa Apertura File"
2. Verifica che le cartelle siano accessibili
3. Controlla log: `%USERAPPDATA%\.local-opener\service.log`

### Problema: Firewall blocca connessione
**Soluzioni:**
1. L'installer configura automaticamente le regole
2. Configura manualmente:
   ```cmd
   netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654
   ```

## 📋 Configurazione Avanzata

### File di Configurazione
Percorso: `%USERAPPDATA%\.local-opener\config.json`

```json
{
  "roots": [
    "G:\\Il mio Drive",
    "C:\\Users\\User\\Google Drive",
    "\\\\SERVER\\Documenti\\ISO"
  ],
  "company": {
    "name": "Nome Azienda",
    "code": "CODICE"
  }
}
```

### Variabili Ambiente Supportate
- `LOCAL_OPENER_CONFIG_DIR`: Directory configurazione personalizzata
- `LOCAL_OPENER_ROOT`: Cartella root predefinita
- `GOOGLE_DRIVE_PATH`: Percorso Google Drive personalizzato
- `LOCAL_OPENER_DEEP_SEARCH`: Abilita ricerca profonda (default: true)

### Logging Avanzato
- **Service Log**: `%USERAPPDATA%\.local-opener\service.log`
- **Error Log**: `%USERAPPDATA%\.local-opener\service-error.log`
- **Rotazione automatica**: 24 ore

## 🔐 Sicurezza

### Configurazione Sicura
- **Solo localhost**: Servizio accessibile solo da 127.0.0.1
- **Validazione percorsi**: Prevenzione directory traversal
- **Isolamento cartelle**: Accesso solo alle root configurate
- **Firewall configurato**: Regole firewall automatiche

### Eccezioni Antivirus
L'installer aggiunge automaticamente eccezioni per:
- Windows Defender
- Cartella installazione
- Eseguibile del servizio

## 📈 Monitoraggio

### Telemetria Inclusa
Il servizio raccoglie statistiche anonime per miglioramenti:
- Avvii/spegnimenti servizio
- Errori generali (senza dati sensibili)
- Performance apertura file
- Compatibilità sistema

### Health Check API
```bash
# Stato servizio
GET http://127.0.0.1:17654/health

# Configurazione cartelle
GET http://127.0.0.1:17654/config

# Test apertura file
POST http://127.0.0.1:17654/open
```

## 🎯 Vantaggi dell'Installazione Automatica

### ✅ Prima dell'aggiornamento
- ❌ Esecuzione manuale ogni volta
- ❌ Privilegi admin sempre richiesti
- ❌ Terminal Node.js con percorsi errati
- ❌ Rilevamento manuale cartelle Google Drive

### ✅ Dopo l'aggiornamento
- ✅ **Auto-avvio con Windows**: Mai più avvio manuale
- ✅ **Nessun admin richiesto**: Funziona in background
- ✅ **Cmd Windows standard**: Percorsi sempre corretti
- ✅ **Rilevamento automatico**: Trova tutte le cartelle Google Drive
- ✅ **Gestione errori**: Restart automatico se si blocca
- ✅ **Logging avanzato**: Facile diagnosi problemi

---

## 📞 Supporto

Per problemi con l'installazione automatica:
1. **Esegui script debug**: `debug-local-opener.bat`
2. **Controlla log**: `%USERAPPDATA%\.local-opener\service.log`
3. **Reinstalla**: Usa sempre l'Installer Universale
4. **Contatta supporto**: Con output script debug

L'installazione automatica rende Local Opener totalmente trasparente all'utente! 🎉
