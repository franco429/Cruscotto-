# Tools di Amministrazione - Cruscotto SGI

Questo directory contiene gli strumenti per la gestione amministrativa del sistema Cruscotto SGI.

## 📋 Strumenti Disponibili

### 1. `create-superadmin.js` - Creazione SuperAdmin

**Scopo**: Crea il primo superadmin nel sistema senza bisogno di company code.

**Quando usarlo**:
- Prima installazione del sistema
- Quando non esiste ancora un superadmin
- Setup iniziale del sistema

**Come usarlo**:
```bash
# Dalla directory root del progetto
cd tools
node create-superadmin.js
```

**Processo**:
1. Lo script verifica se esiste già un superadmin
2. Richiede email e password per il nuovo superadmin
3. Valida i dati inseriti
4. Crea l'utente superadmin nel database
5. Mostra le credenziali di accesso

**Requisiti**:
- Variabile d'ambiente `DB_URI` configurata
- Connessione al database MongoDB
- Nessun superadmin esistente

### 2. `create-company-code.js` - Creazione Codici Aziendali

**Scopo**: Crea un singolo codice aziendale per la registrazione di nuove aziende.

**Quando usarlo**:
- Dopo aver creato il superadmin
- Quando serve un nuovo codice per una specifica azienda
- Per creare codici personalizzati

**Come usarlo**:
```bash
# Dalla directory root del progetto
cd tools
node create-company-code.js
```

**Processo**:
1. Genera automaticamente un codice casuale
2. Crea il codice nel database
3. Mostra il codice generato

### 3. `check-company-codes.js` - Verifica Codici Aziendali

**Scopo**: Mostra tutti i codici aziendali esistenti e il loro stato.

**Quando usarlo**:
- Per verificare i codici disponibili
- Per controllare l'utilizzo dei codici
- Per monitorare i codici scaduti

**Come usarlo**:
```bash
# Dalla directory root del progetto
cd tools
node check-company-codes.js
```

## 🔧 Setup Iniziale del Sistema

### Passo 1: Creare il SuperAdmin
```bash
cd tools
node create-superadmin.js
```

### Passo 2: Accedere al Sistema
1. Avvia il server: `npm run dev` (dalla directory root)
2. Accedi con le credenziali del superadmin
3. Vai alla sezione "Company Codes"

### Passo 3: Generare Codici Aziendali
Dal pannello superadmin:
1. Clicca "Genera 30 codici"
2. I codici vengono creati automaticamente
3. Distribuisci i codici alle aziende

## 🔒 Sicurezza

### Best Practices per SuperAdmin
- **Password Forte**: Usa password complesse (minimo 8 caratteri, maiuscole, minuscole, numeri, caratteri speciali)
- **Email Sicura**: Usa un indirizzo email dedicato e sicuro
- **Accesso Limitato**: Limita l'accesso al superadmin solo a persone autorizzate
- **Monitoraggio**: Controlla regolarmente i log di accesso

### Best Practices per Codici Aziendali
- **Distribuzione Sicura**: Invia codici tramite canali sicuri (email criptata, messaggi sicuri)
- **Scadenza**: Imposta sempre una data di scadenza appropriata
- **Limite Utilizzi**: Usa limiti appropriati (1 per azienda)
- **Monitoraggio**: Controlla regolarmente l'utilizzo dei codici

## 🚨 Gestione Emergenze

### Reset SuperAdmin
Se perdi l'accesso al superadmin:
1. Accedi direttamente al database
2. Elimina l'utente superadmin esistente
3. Esegui nuovamente `create-superadmin.js`

### Codici Compromessi
Se un codice aziendale viene compromesso:
1. Vai alla sezione "Company Codes"
2. Disattiva il codice compromesso
3. Genera un nuovo codice per l'azienda

## 📞 Supporto

Per problemi con questi tool:
- Controlla i log del database
- Verifica la configurazione delle variabili d'ambiente
- Assicurati che il database sia accessibile
- Controlla che le dipendenze siano installate

## 🔄 Aggiornamenti

Questi tool vengono aggiornati insieme al sistema principale. Assicurati di:
- Mantenere aggiornati i tool
- Testare i tool dopo aggiornamenti del sistema
- Fare backup prima di modifiche importanti 