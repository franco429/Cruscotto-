# Guida Test Fix Email Duplicate

## Come Testare il Fix

### Test Automatici

#### 1. Esegui i test unitari

```bash
cd server
npm test -- notification-tracking.test.ts --run
```

**Nota:** I test usano un mock in-memory di MongoDB, quindi non serve avere MongoDB in esecuzione.

**Risultato atteso:**
```
✓ dovrebbe registrare correttamente una notifica inviata
✓ dovrebbe trovare una notifica inviata nelle ultime 24 ore
✓ NON dovrebbe trovare una notifica inviata più di 24 ore fa
✓ dovrebbe distinguere tra notifiche 'expired' e 'warning'
✓ dovrebbe distinguere tra diversi clientId
✓ dovrebbe bloccare l'invio dopo un riavvio se già inviato nelle ultime 24h
✓ dovrebbe permettere l'invio dopo un riavvio se passate più di 24h
✓ dovrebbe gestire correttamente riavvii multipli in breve tempo
✓ dovrebbe gestire separatamente notifiche expired e warning

Test Files  1 passed (1)
     Tests  9 passed (9)
```

### Test Manuali in Sviluppo

#### 1. Prepara l'ambiente

```bash
# Assicurati che MongoDB sia in esecuzione
# Assicurati che le variabili d'ambiente SMTP siano configurate
```

#### 2. Avvia il server

```bash
cd server
npm run dev
```

#### 3. Verifica i log all'avvio

Dovresti vedere:

```
[INFO] Avvio controllo scadenze documentali { warningDays: 30 }
[INFO] Documenti attivi trovati { total: X, active: Y }
[INFO] Controllo scadenze completato { expired: N, warning: M }
```

Se ci sono documenti scaduti/in scadenza:

```
[INFO] Invio notifiche per client { clientId: 'default', documentCount: N }
[INFO] Email inviata con successo { adminEmail: 'xxx@xxx.com' }
[INFO] Notifica registrata nel tracker { type: 'expired', documentCount: N }
```

#### 4. Simula un riavvio del backend

Ferma il server (Ctrl+C) e riavvialo:

```bash
npm run dev
```

**Risultato atteso nei log:**

```
[INFO] Skip invio notifica per client (già inviata nelle ultime 24h) { 
  clientId: 'default', 
  type: 'expired',
  documentCount: N 
}
```

#### 5. Verifica il database MongoDB

Connettiti a MongoDB e controlla la collezione `notificationtrackers`:

```bash
# Usando MongoDB Compass o mongosh
use <database_name>
db.notificationtrackers.find()
```

**Risultato atteso:**

```json
{
  "_id": "...",
  "notificationType": "expired",
  "clientId": "default",
  "documentIds": [1, 2, 3],
  "sentAt": "2025-12-16T10:00:00.000Z",
  "recipientEmails": ["admin@example.com"],
  "documentCount": 3
}
```

### Test in Produzione (Render)

#### 1. Dopo il Deploy

Controlla i log di Render:

```bash
# Su Render Dashboard > Your Service > Logs
```

**Cerca questi messaggi:**

```
[INFO] Sistema di controllo scadenze in attesa del segnale di sync completata...
[INFO] Segnale 'initialSyncComplete' ricevuto. Esecuzione controllo iniziale scadenze.
[INFO] Controllo scadenze completato
```

#### 2. Verifica Email

Chiedi al cliente di controllare la casella email:
- Dovrebbe ricevere al massimo 1-2 email al giorno
- Le email dovrebbero arrivare sempre alla stessa ora (circa)
- Niente più email ogni 2 ore

#### 3. Verifica Database in Produzione

Connettiti al database MongoDB di produzione e verifica:

```bash
db.notificationtrackers.find().sort({sentAt: -1}).limit(10)
```

Dovresti vedere:
- Una notifica per tipo al giorno
- `sentAt` distanziati di ~24 ore
- Nessun timestamp ravvicinato (es: 2 notifiche a distanza di 2 ore)

### Test di Stress

#### Simula Riavvii Frequenti

Per verificare che il sistema gestisca correttamente riavvii multipli:

1. **Script di test** (crea `test-restart.sh`):

```bash
#!/bin/bash
for i in {1..10}
do
  echo "===== Riavvio $i ====="
  npm run dev &
  PID=$!
  sleep 30  # Lascia il server in esecuzione per 30 secondi
  kill $PID
  sleep 5   # Pausa tra i riavvii
done
```

2. **Esegui lo script:**

```bash
chmod +x test-restart.sh
./test-restart.sh
```

3. **Verifica:**
   - Controlla i log: dovrebbe esserci solo 1 invio di email
   - Controlla il database: solo 1 record per tipo di notifica
   - Controlla la casella email: solo 1 email ricevuta

### Troubleshooting

#### Problema: Email non vengono inviate affatto

**Possibili cause:**
1. Configurazione SMTP errata
2. Nessun documento scaduto/in scadenza
3. Nessun admin nel database

**Soluzione:**
```bash
# Controlla i log per errori SMTP
grep "SMTP" server.log

# Verifica che ci siano admin
db.users.find({role: "admin"})

# Verifica che ci siano documenti con scadenza
db.documents.find({expiryDate: {$exists: true}})
```

#### Problema: Email vengono ancora inviate troppo spesso

**Possibili cause:**
1. Il fix non è stato deployato correttamente
2. Database non raggiungibile
3. Errori durante la scrittura nel tracker

**Soluzione:**
```bash
# Verifica che il codice sia aggiornato
grep "shouldSendNotification" server/notification-service.ts

# Controlla errori nel log
grep "ERROR" server.log | grep "notification"

# Verifica connessione MongoDB
db.notificationtrackers.stats()
```

#### Problema: Notifiche non vengono registrate nel database

**Possibili cause:**
1. Permessi MongoDB insufficienti
2. Schema non creato correttamente
3. Errore nella funzione `trackNotificationSent`

**Soluzione:**
```bash
# Verifica che la collezione esista
db.getCollectionNames()

# Verifica i permessi
db.runCommand({connectionStatus: 1})

# Controlla i log per errori di scrittura
grep "trackNotificationSent" server.log
```

### Metriche da Monitorare

#### Dopo 1 Settimana

Verifica nel database:

```javascript
// Conta quante notifiche sono state inviate nell'ultima settimana
db.notificationtrackers.countDocuments({
  sentAt: {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
})
```

**Risultato atteso:**
- Se ci sono documenti scaduti: ~7 notifiche "expired"
- Se ci sono documenti in scadenza: ~7 notifiche "warning"
- Totale: massimo 14 notifiche in 7 giorni

**Prima del fix:**
- Se il backend si riavviava ogni 2 ore: 84+ notifiche in 7 giorni

```javascript
// Media di notifiche al giorno per tipo
db.notificationtrackers.aggregate([
  {
    $group: {
      _id: {
        type: "$notificationType",
        day: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } }
      },
      count: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: "$_id.type",
      avgPerDay: { $avg: "$count" }
    }
  }
])
```

**Risultato atteso:**
```json
[
  { "_id": "expired", "avgPerDay": 1 },
  { "_id": "warning", "avgPerDay": 1 }
]
```

### Checklist Finale

Prima di considerare il fix completato:

- [ ] Test unitari passano tutti ✅
- [ ] Test manuale in sviluppo: solo 1 email per tipo al giorno ✅
- [ ] Test riavvii multipli: nessuna email duplicata ✅
- [ ] Database tracker funziona correttamente ✅
- [ ] Deploy in produzione completato ✅
- [ ] Log di produzione mostrano skip delle notifiche duplicate ✅
- [ ] Cliente conferma: niente più spam di email ✅
- [ ] Monitoraggio per 1 settimana: metriche corrette ✅

---

**Nota:** Se tutti i test passano ma il cliente continua a ricevere troppe email, potrebbe esserci un altro servizio che invia notifiche (es: cron job esterno). Controlla tutti i servizi attivi su Render.
