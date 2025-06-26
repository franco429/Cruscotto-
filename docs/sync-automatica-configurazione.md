# Configurazione Sincronizzazione Automatica Google Drive

## 🚀 **Sincronizzazione Automatica Attivata**

La sincronizzazione automatica è ora **ATTIVA** e funziona ogni **15 minuti**.

## ⚙️ **Configurazione Attuale**

### **Intervallo di Sincronizzazione**
- **Frequenza**: Ogni 15 minuti
- **Tipo**: Sincronizzazione globale per tutti i client
- **Avvio**: Immediato al riavvio del server
- **Bilanciamento**: Reattività vs carico server ottimizzato

### **Caratteristiche Implementate**

#### 1. **Prevenzione Sync Multiple**
```typescript
// Flag per evitare sync simultanee
let isGlobalSyncRunning = false;

// Se una sync è già in corso, salta la successiva
if (isGlobalSyncRunning) {
  logger.info('Skipping scheduled sync - previous sync still running');
  return;
}
```

#### 2. **Logging Dettagliato**
- Log di avvio della sync automatica
- Log per ogni esecuzione programmata
- Log di completamento con statistiche
- Log di errori e performance

#### 3. **Gestione Errori Robusta**
- Retry automatico per errori temporanei
- Notifiche per errori critici
- Continuazione anche se un client fallisce

## 📊 **Monitoraggio**

### **Log del Server**
Quando il server è in esecuzione, vedrai questi log:

```
[INFO] Starting automatic sync for all clients (every 30 seconds)
[INFO] Running scheduled automatic sync for all clients
[INFO] Starting global sync for all clients
[INFO] Starting sync for X clients
[INFO] Global sync completed - processed: Y, failed: Z, duration: Wms
```

### **Metriche Disponibili**
- **Processed**: Documenti sincronizzati con successo
- **Failed**: Documenti che hanno fallito
- **Duration**: Tempo totale di sincronizzazione
- **Success Rate**: Percentuale di successo

## 🔧 **Personalizzazione**

### **Modificare l'Intervallo**
Per cambiare la frequenza, modifica il valore in `server/google-drive.ts`:

```typescript
// Ogni 15 minuti (attuale - bilanciato)
setInterval(() => {
  syncAllClientsOnce();
}, 15 * 60 * 1000);

// Ogni 30 secondi (reattivo ma carico elevato)
setInterval(() => {
  syncAllClientsOnce();
}, 30 * 1000);

// Ogni 5 minuti (reattivo)
setInterval(() => {
  syncAllClientsOnce();
}, 5 * 60 * 1000);

// Ogni ora (leggero)
setInterval(() => {
  syncAllClientsOnce();
}, 60 * 60 * 1000);
```

### **Disattivare la Sync Automatica**
Per disattivarla, commenta la riga in `server/index.ts`:

```typescript
// Commenta questa riga per disattivare
// startAutomaticSyncForAllClients();
```

## 🎯 **Vantaggi**

### **Per l'Utente**
- ✅ **Aggiornamenti automatici**: I nuovi documenti appaiono senza azioni manuali
- ✅ **Reattività**: Solo 30 secondi di latenza massima
- ✅ **Trasparenza**: Log dettagliati per monitorare lo stato

### **Per il Sistema**
- ✅ **Efficienza**: Prevenzione di sync multiple simultanee
- ✅ **Robustezza**: Gestione errori e retry automatici
- ✅ **Scalabilità**: Funziona per tutti i client contemporaneamente

## 📈 **Performance**

### **Impatto sul Server**
- **CPU**: Basso (sync ottimizzate con batch processing)
- **Memoria**: Minimo (cleanup automatico)
- **Rete**: Moderato (solo quando ci sono nuovi documenti)

### **Ottimizzazioni Implementate**
- **Batch Processing**: Elaborazione in gruppi di 20 file
- **Concurrency Control**: Massimo 3 operazioni simultanee
- **Smart Retry**: Backoff esponenziale per errori temporanei
- **Metadata First**: Analisi Excel senza download completo

## 🔍 **Troubleshooting**

### **Sync Non Funziona**
1. **Verifica i log del server** per errori specifici
2. **Controlla la connessione Google Drive** con `/api/sync/test-config`
3. **Verifica i permessi** dell'utente admin
4. **Controlla la configurazione** della cartella Drive

### **Sync Troppo Lenta**
1. **Riduci l'intervallo** (es: 15 secondi invece di 30)
2. **Verifica la connessione internet**
3. **Controlla il numero di file** nella cartella Drive

### **Errori Frequenti**
1. **Ricollega Google Drive** (token scaduto)
2. **Verifica i permessi** della cartella Drive
3. **Controlla lo spazio su disco** del server

## 📝 **Note Importanti**

- **Prima sync**: Viene eseguita immediatamente all'avvio del server
- **Sync manuale**: Continua a funzionare indipendentemente da quella automatica
- **Errori**: Non bloccano le sync successive
- **Performance**: Ottimizzata per cartelle con centinaia di documenti

## 🚀 **Prossimi Miglioramenti**

- **WebSocket**: Notifiche real-time per nuovi documenti
- **Incremental Sync**: Solo i file modificati
- **Dashboard**: Interfaccia per monitorare le sync
- **Configurazione UI**: Modificare intervalli dall'interfaccia 

### **Timeout e Intervalli**

- **Polling interval:** 5 secondi
- **Max polling attempts:** 60 (5 minuti totali)
- **Home page refetch:** 3 secondi (solo se fromDrive=true)
- **Sync delay:** 2 secondi prima di iniziare il polling
- **Sync automatica:** 15 minuti (bilanciato) 