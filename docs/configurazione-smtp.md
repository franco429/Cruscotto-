# Configurazione SMTP per Invio Email

## Panoramica

Il sistema di Cruscotto SGI utilizza Nodemailer per l'invio di email, in particolare per:
- Reset password
- Notifiche di sistema
- Form di contatto

## Variabili d'Ambiente Richieste

Aggiungi le seguenti variabili al file `.env`:

```env
# Configurazione SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Configurazioni Popolari

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Nota:** Per Gmail, devi usare una "App Password" invece della password normale:
1. Abilita l'autenticazione a 2 fattori
2. Vai su "Gestione account Google" > "Sicurezza"
3. Genera una "Password per le app"

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### Server SMTP Personalizzato
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
```

## Test della Configurazione

### 1. Verifica Variabili d'Ambiente
```bash
npm run check-env
```

### 2. Test Invio Email
```bash
# Test con email di default (SMTP_USER)
npm run test-email

# Test con email specifica
npm run test-email your-email@example.com
```

### 3. Test Reset Password
1. Avvia il server: `npm run dev`
2. Vai su `/reset-password` nel frontend
3. Inserisci un'email valida
4. Controlla i log del server per conferma

## Troubleshooting

### Errore: "Invalid login"
- Verifica username e password
- Per Gmail, usa una App Password
- Controlla che l'autenticazione a 2 fattori sia abilitata

### Errore: "Connection timeout"
- Verifica SMTP_HOST e SMTP_PORT
- Controlla il firewall
- Prova con SMTP_SECURE=true per porta 465

### Errore: "Authentication failed"
- Verifica le credenziali
- Controlla che il provider SMTP permetta l'accesso da app
- Per Gmail, genera una nuova App Password

### Email non ricevute
- Controlla la cartella spam
- Verifica che l'email di destinazione sia corretta
- Controlla i log del server per errori

## Log e Debug

Il sistema logga automaticamente:
- ✅ Connessione SMTP riuscita
- ❌ Errori di configurazione
- 📧 Conferma invio email
- 🔍 Dettagli errori in sviluppo

In modalità sviluppo, gli errori email vengono mostrati nel response API per facilitare il debugging.

## Sicurezza

- Non committare mai le credenziali SMTP nel codice
- Usa sempre variabili d'ambiente
- In produzione, usa credenziali dedicate per l'app
- Considera l'uso di servizi email transazionali (SendGrid, Mailgun, etc.) 