# Protezione Anti-Spam per Endpoint di Contatto

## Panoramica

Questo documento descrive le misure di sicurezza implementate per proteggere l'endpoint `/api/contact` da attacchi di spam e abuso.

## Vulnerabilità Risolta

**Problema**: L'endpoint di contatto era vulnerabile a:
- Spam massivo da singoli IP
- Messaggi con contenuti malevoli
- Attacchi di forza bruta
- Abuso del sistema di email

**Gravità**: Medio - Poteva causare:
- Sovraccarico del server email
- Spam agli amministratori
- Costi elevati per l'invio di email
- Degrado delle performance

## Soluzioni Implementate

### 1. Rate Limiting Specifico

```typescript
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 3, // Solo 3 messaggi per ora per IP
  message: { error: "Troppi messaggi inviati. Riprova tra un'ora." },
  keyGenerator: (req) => {
    // Usa IP + User-Agent per identificare meglio i client
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});
```

**Caratteristiche**:
- Limite di 3 messaggi per ora per IP
- Identificazione basata su IP + User-Agent
- Finestra temporale di 1 ora
- Conta anche le richieste di successo

### 2. Validazione Anti-Spam

#### Controlli Implementati:

1. **Validazione Email**
   - Regex per formato email valido
   - Controllo sintassi standard

2. **Controllo Lunghezza**
   - Messaggio: 10-2000 caratteri
   - Nome: 2-100 caratteri

3. **Rilevamento Link**
   - Massimo 3 link per messaggio
   - Previene spam con link multipli

4. **Filtro Parole Chiave**
   - Lista di parole chiave spam comuni
   - Controllo su nome e messaggio
   - Esempi: casino, loan, viagra, make money

5. **Rilevamento Caratteri Ripetuti**
   - Previene messaggi come "Hello!!!!!"
   - Controllo su 5+ caratteri consecutivi identici

6. **Controllo Maiuscole**
   - Massimo 70% di caratteri maiuscoli
   - Previene messaggi come "HELLO THIS IS SPAM"

### 3. Logging Avanzato

```typescript
logger.info('Contact form submission', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  email: email,
  name: name,
  messageLength: message.length,
  timestamp: new Date().toISOString()
});
```

**Informazioni Loggate**:
- IP del mittente
- User-Agent del browser
- Email e nome
- Lunghezza del messaggio
- Timestamp preciso

### 4. Email Arricchite

Le email inviate ora includono:
- IP del mittente
- User-Agent del browser
- Timestamp di invio
- Informazioni di sicurezza aggiuntive

## Configurazione

### Variabili d'Ambiente

Nessuna variabile aggiuntiva richiesta. Le protezioni sono attive di default.

### Personalizzazione

Per modificare i limiti:

```typescript
// In security.ts
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // Modifica la finestra temporale
  max: 3, // Modifica il numero di richieste
 
});
```

Per aggiungere parole chiave spam:

```typescript
// In security.ts
const spamKeywords = [
  // ... parole esistenti
  'nuova-parola-spam',
  'altra-parola-sospetta'
];
```

## Test

### Test Automatici

I test verificano:
- Rifiuto messaggi con troppi link
- Rifiuto messaggi con parole chiave spam
- Rifiuto messaggi con caratteri ripetuti
- Rifiuto messaggi con troppe maiuscole
- Accettazione messaggi validi
- Validazione formato email
- Controllo lunghezza messaggio

### Test Manuali

Per testare manualmente:

```bash
# Test rate limiting
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello"}' \
  # Ripeti 4 volte per testare il limite

# Test validazione spam
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Make money fast with casino!"}'
```

## Monitoraggio

### Log da Controllare

1. **Log di Successo**:
   ```
   Contact email sent successfully
   ```

2. **Log di Errore**:
   ```
   Contact email failed
   ```

3. **Log di Rate Limiting**:
   ```
   Troppi messaggi inviati. Riprova tra un'ora.
   ```

### Metriche da Monitorare

- Numero di richieste bloccate per ora
- Pattern di spam rilevati
- IP che superano i limiti
- Errori di invio email

## Sicurezza Aggiuntiva

### Raccomandazioni

1. **Monitoraggio Continuo**
   - Controlla i log giornalmente
   - Identifica pattern di attacco

2. **Aggiornamento Liste**
   - Aggiorna periodicamente le parole chiave spam
   - Adatta i limiti in base all'uso reale

3. **Backup Email**
   - Considera un sistema di backup per le email importanti
   - Implementa notifiche per amministratori

4. **Analisi Avanzata**
   - Considera l'integrazione con servizi anti-spam esterni
   - Implementa machine learning per rilevamento pattern

## Troubleshooting

### Problemi Comuni

1. **Falsi Positivi**
   - Messaggi legittimi bloccati
   - Soluzione: Aggiusta le parole chiave o i limiti

2. **Rate Limiting Troppo Restrittivo**
   - Utenti legittimi bloccati
   - Soluzione: Aumenta il limite `max` o la finestra `windowMs`

3. **Email Non Inviate**
   - Controlla i log per errori SMTP
   - Verifica configurazione email server

### Debug

Per abilitare debug temporaneo:

```typescript
// In security.ts
console.log('Contact validation:', { name, email, message });
```

## Conclusioni

Le protezioni implementate forniscono:
- ✅ Protezione efficace contro spam
- ✅ Rate limiting intelligente
- ✅ Validazione contenuti
- ✅ Logging completo
- ✅ Facilità di configurazione
- ✅ Test automatici

L'endpoint è ora sicuro per l'uso in produzione e protegge efficacemente contro gli attacchi di spam più comuni. 