# Sistema di Persistenza dei Backup

## Panoramica

Il sistema di backup è stato migliorato per garantire la persistenza dei metadati dei backup nel database MongoDB. Questo risolve il problema dei backup che "scomparivano" dopo riavvii del server.

## Come Funziona

### Prima (Sistema Vecchio)

- I backup venivano salvati solo come file nella cartella `backups/`
- La lista dei backup veniva generata leggendo i file dal filesystem
- Se i file venivano spostati o il server veniva riavviato, i backup non erano più visibili

### Ora (Sistema Nuovo)

- I backup vengono salvati sia come file che come metadati nel database MongoDB
- La lista dei backup viene letta dal database (persistente)
- I file vengono verificati per assicurare la coerenza
- I backup sono sempre visibili anche dopo riavvii del server

## Struttura del Database

### Collezione `backups`

```javascript
{
  legacyId: Number,           // ID univoco del backup
  filename: String,           // Nome del file di backup
  filePath: String,           // Percorso completo del file
  fileSize: Number,           // Dimensione del file in bytes
  backupType: String,         // "complete" o "client_specific"
  createdBy: {
    userId: Number,
    userEmail: String,
    userRole: String
  },
  clientId: Number,           // ID del client (null per backup completi)
  metadata: {
    totalUsers: Number,
    totalDocuments: Number,
    totalLogs: Number,
    totalClients: Number,
    totalCompanyCodes: Number
  },
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean,          // Indica se il file esiste ancora
  lastVerified: Date          // Ultima verifica dell'esistenza del file
}
```

## Funzionalità Aggiunte

### 1. Sincronizzazione Automatica

- Quando si accede alla lista backup, il sistema verifica automaticamente l'esistenza dei file
- Aggiorna lo stato `isActive` nel database
- Mostra indicatori visivi per backup con file mancanti

### 2. Sincronizzazione Manuale (Superadmin)

- Pulsante "Sincronizza" nella pagina backup
- Aggiunge al database i backup esistenti nel filesystem ma non ancora tracciati
- Utile per migrare backup esistenti o recuperare backup persi

### 3. Eliminazione Backup (Superadmin)

- Pulsante "Elimina" per rimuovere backup e file
- Elimina sia il record dal database che il file fisico
- Conferma richiesta per evitare eliminazioni accidentali

### 4. Indicatori Visivi

- Badge "File Mancante" per backup con file non trovati
- Badge "Mio Backup" per backup creati dall'utente corrente
- Badge per tipo di backup (Completo/Specifico Client)

## Migrazione dei Backup Esistenti

### Opzione 1: Script di Migrazione

```bash
npm run migrate-backups
```

### Opzione 2: Sincronizzazione Manuale

1. Accedi come superadmin
2. Vai alla pagina backup
3. Clicca "Sincronizza"

## API Endpoints

### GET `/api/admin/backups`

- Lista backup dal database con verifica file
- Filtraggio per ruolo utente
- Ordinamento per data di creazione

### POST `/api/admin/backups/sync`

- Sincronizza backup esistenti con il database
- Solo per superadmin

### DELETE `/api/admin/backup/:filename`

- Elimina backup e file
- Solo per superadmin

## Vantaggi del Nuovo Sistema

1. **Persistenza**: I backup sono sempre visibili anche dopo riavvii
2. **Affidabilità**: Verifica automatica dell'esistenza dei file
3. **Tracciabilità**: Storico completo dei backup nel database
4. **Flessibilità**: Possibilità di recuperare backup persi
5. **Sicurezza**: Controlli di accesso basati su ruolo

## Risoluzione Problemi

### Backup Non Visibili

1. Verifica che il file esista nella cartella `backups/`
2. Usa il pulsante "Sincronizza" per aggiungere backup mancanti
3. Controlla i log del server per errori

### File Mancanti

- I backup con badge "File Mancante" hanno il record nel database ma il file è stato spostato/eliminato
- Il record rimane per tracciabilità, ma il backup non può essere scaricato/ripristinato

### Errori di Sincronizzazione

- Verifica i permessi sulla cartella `backups/`
- Controlla che i file JSON siano validi
- Controlla i log per errori specifici

## Manutenzione

### Pulizia Automatica

- Il sistema verifica automaticamente l'esistenza dei file
- Aggiorna lo stato `isActive` nel database
- Mantiene traccia delle verifiche con `lastVerified`

### Backup del Database

- I metadati dei backup sono inclusi nei backup completi del database
- In caso di ripristino, anche la lista backup viene ripristinata

## Note per gli Sviluppatori

### Aggiungere Nuovi Campi

1. Aggiorna l'interfaccia `BackupDocument` in `shared-types/schema.ts`
2. Aggiorna lo schema Mongoose in `server/models/mongoose-models.ts`
3. Aggiorna le funzioni di creazione backup

### Modificare la Logica di Filtro

- La logica di filtro è in `server/backup-routes.ts` nella route `/api/admin/backups`
- I filtri sono basati su `clientId` e `createdBy.userId`

### Testare il Sistema

- Usa `npm run migrate-backups` per testare la migrazione
- Verifica che i backup siano visibili dopo riavvio del server
- Testa la sincronizzazione con file esistenti
