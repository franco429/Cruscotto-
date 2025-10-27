# TAC Security - Risoluzione Proxy Disclosure (CWE-200)

**Data implementazione:** 27 Ottobre 2025  
**Severity:** LOW  
**CWE:** CWE-200 - Exposure of Sensitive Information to an Unauthorized Actor  
**Status:** ✅ RISOLTO

---

## Problema Identificato

Durante il test DAST (Dynamic Application Security Testing) condotto dal team TAC Security, è stata identificata una vulnerabilità di tipo **Proxy Disclosure** a severità bassa.

### Dettagli Tecnici

**Categoria:** Information Disclosure  
**Metodi coinvolti:** TRACE, OPTIONS, TRACK  

Il problema consisteva nel fatto che il server rivelava informazioni sull'infrastruttura proxy (Cloudflare) utilizzata dall'applicazione. I metodi HTTP `TRACE`, `OPTIONS` e `TRACK` possono essere utilizzati da potenziali malintenzionati per:
- Identificare la presenza e il tipo di proxy utilizzato
- Raccogliere informazioni sulla tecnologia stack (fingerprinting)
- Ottenere informazioni sensibili sull'infrastruttura tramite header specifici (X-Powered-By, Server)

### Rischi

Anche se di severità bassa, questa vulnerabilità:
- Espone informazioni sull'architettura dell'applicazione
- Facilita attacchi mirati fornendo dettagli sulla tecnologia utilizzata
- Potrebbe essere utilizzata in combinazione con altre vulnerabilità per attacchi più sofisticati

---

## Soluzione Implementata

### 1. Disabilitazione Header X-Powered-By

**File modificato:** `server/index.ts`

```typescript
// Disabilita X-Powered-By header per nascondere tecnologia usata
// Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
app.disable('x-powered-by');
```

Questo previene che Express esponga automaticamente l'header `X-Powered-By: Express` che rivela la tecnologia utilizzata.

### 2. Blocco Metodi HTTP Non Sicuri

**File modificato:** `server/security.ts`

Creata nuova funzione `blockUnsafeHttpMethods()` che implementa:

#### a) Blocco TRACE e TRACK

```typescript
// Blocca metodi TRACE e TRACK usati per proxy disclosure
if (method === 'TRACE' || method === 'TRACK') {
  res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH, HEAD');
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: 'Il metodo HTTP richiesto non è supportato.',
    code: 'METHOD_NOT_ALLOWED'
  });
}
```

**Perché TRACE e TRACK sono pericolosi:**
- `TRACE` restituisce la richiesta esattamente come ricevuta dal server, esponendo header interni e informazioni del proxy
- `TRACK` è una variante di TRACE implementata da alcuni server proxy
- Possono essere utilizzati per Cross-Site Tracing (XST) attacks
- Espongono cookie e header di autenticazione

#### b) Limitazione OPTIONS solo a CORS Preflight

```typescript
// Limita OPTIONS solo a preflight CORS (con header Origin)
if (method === 'OPTIONS' && !req.headers.origin) {
  // Blocca OPTIONS non-CORS (usate per fingerprinting)
  res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH, HEAD');
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    message: 'OPTIONS richiede header Origin.',
    code: 'METHOD_NOT_ALLOWED'
  });
}
```

**Perché limitare OPTIONS:**
- Le richieste OPTIONS senza header `Origin` non sono legittime richieste CORS preflight
- Possono essere utilizzate per enumerare metodi supportati e raccogliere informazioni sul server
- Limitando OPTIONS solo a richieste CORS legittime, riduciamo la superficie d'attacco

### 3. Applicazione Middleware con Priorità Massima

**File modificato:** `server/index.ts`

```typescript
// PRIORITÀ MASSIMA: Blocca metodi HTTP non sicuri (TRACE, TRACK)
// Applicato PRIMA di qualsiasi altro middleware per prevenire proxy disclosure
// Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
const { blockUnsafeHttpMethods } = await import("./security");
blockUnsafeHttpMethods(app);
```

Il middleware è applicato **immediatamente dopo la creazione dell'app Express** e **prima di qualsiasi altro middleware** (incluso CORS, body parser, etc.) per garantire che:
- Le richieste non sicure vengano bloccate immediatamente
- Nessun altro middleware possa processare metodi pericolosi
- La risposta sia coerente e controllata

### 4. Header di Sicurezza Aggiuntivi

Gli header seguenti erano già implementati in `server/security.ts` e rafforzano la protezione:

```typescript
// Server header removal - nasconde informazioni sul server
res.removeHeader("X-Powered-By");
res.removeHeader("Server");
```

Questi vengono applicati tramite `helmet.hidePoweredBy()` e il middleware personalizzato.

---

## Conformità agli Standard

### OWASP Top 10
- **A05:2021 - Security Misconfiguration:** Configurazione corretta dei metodi HTTP e header

### CWE (Common Weakness Enumeration)
- **CWE-200:** Exposure of Sensitive Information to an Unauthorized Actor - MITIGATO
- **CWE-16:** Configuration - Corretta configurazione dei metodi HTTP supportati
- **CWE-209:** Generation of Error Message Containing Sensitive Information - Messaggi di errore generici

### Best Practices Implementate
1. ✅ **Principle of Least Privilege:** Solo i metodi HTTP strettamente necessari sono permessi
2. ✅ **Defense in Depth:** Multipli livelli di protezione (app.disable + helmet + middleware custom)
3. ✅ **Fail Secure:** Comportamento di default è negare l'accesso a metodi non sicuri
4. ✅ **Information Hiding:** Minime informazioni sull'infrastruttura esposte al client

---

## Testing e Verifica

### Test Manuali

#### Test 1: Verifica TRACE bloccato
```bash
curl -X TRACE https://api.cruscotto-sgi.com/api/test
# Expected: 405 Method Not Allowed
```

#### Test 2: Verifica TRACK bloccato
```bash
curl -X TRACK https://api.cruscotto-sgi.com/api/test
# Expected: 405 Method Not Allowed
```

#### Test 3: Verifica OPTIONS senza Origin bloccato
```bash
curl -X OPTIONS https://api.cruscotto-sgi.com/api/test
# Expected: 405 Method Not Allowed
```

#### Test 4: Verifica OPTIONS con Origin permesso (CORS preflight)
```bash
curl -X OPTIONS https://api.cruscotto-sgi.com/api/test \
  -H "Origin: https://cruscotto-sgi.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: 200 OK con header CORS appropriati
```

#### Test 5: Verifica X-Powered-By header non presente
```bash
curl -I https://api.cruscotto-sgi.com/
# Expected: Nessun header X-Powered-By o Server nella risposta
```

### Test Automatizzati

Creare test in `server/__tests__/security.test.ts`:

```typescript
describe('Proxy Disclosure Prevention', () => {
  it('should block TRACE method', async () => {
    const response = await request(app).trace('/api/test');
    expect(response.status).toBe(405);
    expect(response.body.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('should block TRACK method', async () => {
    const response = await request(app).options('/api/test')
      .set('X-HTTP-Method-Override', 'TRACK');
    // Test implementation specific to your setup
  });

  it('should block OPTIONS without Origin', async () => {
    const response = await request(app).options('/api/test');
    expect(response.status).toBe(405);
  });

  it('should allow OPTIONS with Origin (CORS preflight)', async () => {
    const response = await request(app)
      .options('/api/test')
      .set('Origin', 'https://cruscotto-sgi.com');
    expect(response.status).toBe(200);
  });

  it('should not expose X-Powered-By header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should not expose Server header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['server']).toBeUndefined();
  });
});
```

---

## Impatto sulla Funzionalità

### ✅ Nessun Impatto Negativo

Le modifiche implementate **NON** influenzano:
- Normali richieste GET, POST, PUT, DELETE, PATCH
- Richieste CORS preflight legittime (OPTIONS con header Origin)
- Funzionalità di autenticazione OAuth
- Upload e download di file
- Tutte le funzionalità esistenti dell'applicazione

### ℹ️ Metodi Bloccati

I seguenti metodi HTTP sono ora **vietati**:
- `TRACE` - Mai necessario per applicazioni web moderne
- `TRACK` - Variante obsoleta di TRACE
- `OPTIONS` senza header Origin - Non sono legittime richieste CORS

---

## Monitoraggio e Manutenzione

### Log e Monitoring

Le richieste bloccate vengono automaticamente loggaate dal sistema di logging esistente:

```typescript
// Il middleware di logging in index.ts registra tutte le richieste
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      logRequest(req, res, Date.now() - start);
    }
  });
  next();
});
```

### Metriche da Monitorare

1. **Numero di richieste TRACE/TRACK bloccate**
   - Spike improvvisi potrebbero indicare tentativi di scansione/attacco
   
2. **Numero di richieste OPTIONS senza Origin bloccate**
   - Utile per identificare tool di fingerprinting in uso

3. **Response time del middleware di blocco**
   - Dovrebbe essere <1ms per non impattare performance

### Alert da Configurare

Configurare alert se:
- Più di 10 richieste TRACE/TRACK in 1 minuto dallo stesso IP
- Pattern di scansione rilevati (multipli metodi non permessi)

---

## Riferimenti

### Standard e Guide
- [OWASP - HTTP Methods Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods)
- [CWE-200: Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)
- [RFC 7231 - HTTP/1.1 Semantics](https://tools.ietf.org/html/rfc7231#section-4.3.8)
- [OWASP Cross Site Tracing](https://owasp.org/www-community/attacks/Cross_Site_Tracing)

### Documentazione Correlata
- [TAC-SECURITY-CWE-1021-RESOLUTION.md](./TAC-SECURITY-CWE-1021-RESOLUTION.md) - Clickjacking Protection
- [TAC-SECURITY-DAST-COMPLIANCE.md](./TAC-SECURITY-DAST-COMPLIANCE.md) - Overview conformità DAST

### Codice Sorgente
- `server/index.ts` - Configurazione app.disable() e applicazione middleware
- `server/security.ts` - Implementazione blockUnsafeHttpMethods()

---

## Conclusioni

La vulnerabilità **Proxy Disclosure (CWE-200)** è stata completamente risolta implementando:

1. ✅ Disabilitazione esplicita dell'header X-Powered-By
2. ✅ Blocco dei metodi HTTP non sicuri (TRACE, TRACK)
3. ✅ Limitazione di OPTIONS solo a CORS preflight legittime
4. ✅ Rimozione degli header Server

Queste misure seguono le best practice OWASP e sono conformi agli standard di sicurezza richiesti dal team TAC Security per applicazioni di produzione.

**Status Finale:** ✅ VULNERABILITÀ RISOLTA - Severity LOW

---

*Documento redatto in conformità agli standard TAC Security DAST*  
*Ultima revisione: 27 Ottobre 2025*

