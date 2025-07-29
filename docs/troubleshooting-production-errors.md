# Troubleshooting Errori di Produzione

## Errori Comuni e Soluzioni

### 1. Errori 401 (Unauthorized)

**Sintomi:**
- `Failed to load resource: the server responded with a status of 401`
- Utenti non riescono ad accedere
- Sessioni che si disconnettono frequentemente

**Cause possibili:**
- SESSION_SECRET non configurato o troppo corto
- Cookie non validi
- Problemi CORS
- Timeout sessione

**Soluzioni:**

1. **Verifica SESSION_SECRET:**
   ```bash
   # Esegui lo script di verifica
   node server/scripts/check-production-config.js
   ```

2. **Controlla configurazione CORS:**
   ```javascript
   // In server/index.ts, verifica che CORS_ORIGIN sia configurato
   const allowedOrigins = [
     "https://your-domain.com",
     ...(process.env.CORS_ORIGIN
       ? process.env.CORS_ORIGIN.split(",")
       : ["http://localhost:5173"]),
   ];
   ```

3. **Verifica cookie settings:**
   ```javascript
   // In server/auth.ts
   cookie: {
     secure: process.env.NODE_ENV === "production", // Deve essere true in produzione
     maxAge: 24 * 60 * 60 * 1000, // 24 ore
     httpOnly: true,
     sameSite: "lax",
   }
   ```

### 2. Errori 500 (Internal Server Error)

**Sintomi:**
- `storage.getDocumentsByClientId is not a function`
- `storage.getObsoleteDocumentsByClientId is not a function`
- `storage.getClientsByAdminId is not a function`
- Errori generici del server

**Cause possibili:**
- Metodi mancanti nell'interfaccia IStorage
- Conflitti di nomi tra `storage` e `multer.diskStorage`
- Problemi di connessione database
- Variabili d'ambiente mancanti

**Soluzioni:**

1. **Verifica conflitti di nomi (RISOLTO):**
   ```bash
   # Il problema era un conflitto tra storage e multer.diskStorage
   # Ora risolto rinominando multer.diskStorage in multerStorage
   grep -r "multerStorage" server/routes.ts
   ```

2. **Verifica implementazione storage:**
   ```bash
   # Controlla che tutti i metodi siano implementati
   grep -r "getDocumentsByClientId" server/
   grep -r "getObsoleteDocumentsByClientId" server/
   grep -r "getClientsByAdminId" server/
   ```

3. **Test dei metodi storage:**
   ```bash
   # Esegui il test dei metodi
   npx tsx server/scripts/test-storage-methods.ts
   ```

4. **Verifica connessione database:**
   ```bash
   # Controlla i log del server
   tail -f logs/server.log
   ```

5. **Verifica variabili d'ambiente:**
   ```bash
   # Esegui verifica completa
   node server/scripts/check-production-config.js
   ```

### 3. Problemi Creazione Utenti

**Sintomi:**
- Non riesci a creare utenti nella pagina users
- Errori di validazione
- Errori 500 durante la creazione

**Cause possibili:**
- Schema di validazione non corretto
- Problemi con hash password
- Permessi insufficienti

**Soluzioni:**

1. **Verifica schema validazione:**
   ```typescript
   // In client/src/pages/users-page.tsx
   const newUserSchema = z.object({
     email: z.string().email("Inserisci un indirizzo email valido"),
     password: z.string().min(8, "La password deve contenere almeno 8 caratteri")
       .regex(/[A-Z]/, "Deve contenere almeno una lettera maiuscola")
       .regex(/[a-z]/, "Deve contenere almeno una lettera minuscola")
       .regex(/[0-9]/, "Deve contenere almeno un numero")
       .regex(/[@$!%?&]/, "Deve contenere almeno un carattere speciale (@$!%?&)"),
     role: z.enum(["admin", "viewer"], {
       required_error: "Seleziona un ruolo",
     }),
   });
   ```

2. **Verifica permessi utente:**
   - Assicurati che l'utente loggato sia admin
   - Verifica che abbia un clientId associato

### 4. Checklist di Verifica Rapida

**Prima del deploy:**

1. ✅ Variabili d'ambiente configurate
2. ✅ Database connesso e funzionante
3. ✅ CORS configurato correttamente
4. ✅ SESSION_SECRET sicuro (min 32 caratteri)
5. ✅ ENCRYPTION_KEY corretto (esattamente 32 caratteri)
6. ✅ SMTP configurato per notifiche
7. ✅ URL dell'applicazione configurati

**Dopo il deploy:**

1. ✅ Controlla i log del server
2. ✅ Verifica che le API rispondano
3. ✅ Testa login/logout
4. ✅ Verifica creazione utenti
5. ✅ Controlla accesso ai documenti

### 5. Comandi Utili

```bash
# Verifica configurazione
node server/scripts/check-production-config.js

# Controlla log in tempo reale
tail -f logs/server.log

# Verifica connessione database
node -e "import('./server/mongo-storage.js').then(m => m.mongoStorage.connect())"

# Test API endpoints
curl -X GET https://your-domain.com/api/documents -H "Cookie: connect.sid=your-session-id"

# Verifica variabili d'ambiente
node -e "console.log(process.env.SESSION_SECRET ? 'OK' : 'MISSING')"
```

### 6. Configurazione .env.production

Crea un file `.env.production` con:

```env
# Database
DB_URI=mongodb://localhost:27017/cruscotto

# Sicurezza
SESSION_SECRET=your-very-long-and-secure-session-secret-key-here-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key-here
LINK_SECRET_KEY=your-secure-link-secret-key-here

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# URL
API_BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

# Ambiente
NODE_ENV=production
```

### 7. Problemi Risolti

#### ✅ Conflitto di Nomi Storage (Risolto)

**Problema:** Errori `storage.getClientsByAdminId is not a function`

**Causa:** Conflitto di nomi tra `mongoStorage` e `multer.diskStorage` nel file `server/routes.ts`

**Soluzione Applicata:**
1. Rinominato `multer.diskStorage` in `multerStorage`
2. Aggiornato tutti i riferimenti da `storage` a `mongoStorage`
3. Aggiunta gestione errori migliorata

**Verifica:**
```bash
# Test dei metodi storage
npx tsx server/scripts/test-storage-methods.ts
```

### 8. Contatti Supporto

Se i problemi persistono:

1. Controlla i log del server per errori specifici
2. Verifica la configurazione con lo script di controllo
3. Testa le API individualmente
4. Controlla la connessione al database
5. Verifica le variabili d'ambiente

**Log utili da fornire:**
- Output dello script di verifica configurazione
- Log del server (ultimi 100 righe)
- Errori specifici dal browser console
- Configurazione CORS e URL 