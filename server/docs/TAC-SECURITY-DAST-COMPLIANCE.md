# Conformità TAC Security DAST - Miglioramenti Implementati

## Riepilogo

Questo documento descrive le modifiche apportate al backend per risolvere le vulnerabilità identificate durante la verifica DAST (Dynamic Application Security Testing) del team TAC Security.

**Data implementazione**: Ottobre 2025  
**Livello di rischio risolto**: Basso  
**File modificati**: `server/security.ts`

---

## 🔐 Header di Sicurezza Implementati

### 1. X-Frame-Options (Già Presente - Confermato)
**Valore**: `DENY`  
**Scopo**: Prevenzione attacchi clickjacking  
**Implementazione**:
- Header configurato tramite `helmet.frameguard()`
- Middleware aggiuntivo per garantire la presenza su tutte le risposte
- CSP `frame-ancestors: 'none'` come protezione supplementare moderna

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
```

### 2. Cache-Control per API (ENHANCED - SISTEMA DIFFERENZIATO)
**Valore per API**: `no-store, no-cache, must-revalidate, private`  
**Scopo**: Previene il caching di dati sensibili, ottimizza performance per asset statici  
**Implementazione**: Sistema differenziato per tipo di risorsa (vedi sezione #9 per dettagli completi)

```typescript
// Sistema Cache-Control differenziato - Esempio per API
if (req.path.startsWith('/api/')) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}
```

**Nota**: Vedi sezione #9 per implementazione completa del sistema Cache-Control differenziato (CWE-525 & CWE-524)

### 3. X-Download-Options (NUOVO)
**Valore**: `noopen`  
**Scopo**: Previene l'apertura automatica di download in Internet Explorer  
**Implementazione**: Globale su tutte le risposte

### 4. Expect-CT (NUOVO - Solo Produzione)
**Valore**: `max-age=86400, enforce`  
**Scopo**: Certificate Transparency - Rileva certificati SSL/TLS fraudolenti  
**Implementazione**: Attivo solo in ambiente di produzione

### 5. Rimozione Header Informativi (NUOVO)
**Header rimossi**:
- `X-Powered-By`
- `Server`

**Scopo**: Previene information disclosure sulla tecnologia utilizzata  
**Implementazione**: Rimossi esplicitamente da tutte le risposte

```typescript
// In server/index.ts - Disabilita X-Powered-By globalmente
app.disable('x-powered-by');

// In server/security.ts - Rimozione esplicita header
res.removeHeader("X-Powered-By");
res.removeHeader("Server");
```

### 6. Blocco Metodi HTTP Non Sicuri (NUOVO)
**Metodi bloccati**:
- `TRACE` - Usato per proxy disclosure e Cross-Site Tracing attacks
- `TRACK` - Variante di TRACE
- `OPTIONS` senza header Origin - Usato per fingerprinting

**Scopo**: Previene proxy disclosure e information gathering  
**Implementazione**: Middleware applicato con priorità massima

```typescript
// Blocca TRACE e TRACK
if (method === 'TRACE' || method === 'TRACK') {
  res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH, HEAD');
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    code: 'METHOD_NOT_ALLOWED'
  });
}

// Limita OPTIONS solo a CORS preflight
if (method === 'OPTIONS' && !req.headers.origin) {
  res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH, HEAD');
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    code: 'METHOD_NOT_ALLOWED'
  });
}
```

**Documentazione dettagliata**: Vedi [TAC-SECURITY-PROXY-DISCLOSURE-RESOLUTION.md](./TAC-SECURITY-PROXY-DISCLOSURE-RESOLUTION.md)

### 7. Permissions-Policy Header (VERIFICATO E DOCUMENTATO)
**Valore**: `geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()`  
**Scopo**: Blocca l'accesso a funzionalità del browser non necessarie (microfono, fotocamera, geolocalizzazione, ecc.)  
**Implementazione**: Globale su tutte le risposte

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  next();
});
```

**Benefici**:
- Previene abusi di API del browser da parte di script di terze parti
- Rispetta il principio del minimo privilegio
- Migliora la privacy degli utenti
- Riduce la superficie di attacco

**Documentazione dettagliata**: Vedi [TAC-SECURITY-CWE-693-RESOLUTION.md](./TAC-SECURITY-CWE-693-RESOLUTION.md)

### 8. Strict-Transport-Security (HSTS) Header (ENHANCED - DOPPIA PROTEZIONE)
**Valore**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`  
**Scopo**: Forza i browser a comunicare solo via HTTPS, prevenendo downgrade attacks e MITM  
**Implementazione**: Doppia protezione con Helmet + middleware esplicito, configurazione trust proxy

```typescript
// 1. Configurazione trust proxy in server/index.ts
app.set('trust proxy', 1);

// 2. Helmet HSTS in server/security.ts
app.use(
  helmet.hsts({
    maxAge: 63072000, // 2 anni
    includeSubDomains: true,
    preload: true,
  })
);

// 3. Middleware esplicito per garantire presenza su TUTTE le risposte
app.use((req: Request, res: Response, next: NextFunction) => {
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  
  if (isSecure || isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
```

**Benefici**:
- Forza HTTPS per 2 anni (raccomandazione OWASP: minimo 1 anno)
- Protezione estesa a tutti i sottodomini (includeSubDomains)
- Eligibile per HSTS Preload List dei browser (preload)
- Previene protocol downgrade attacks
- Previene MITM (Man-in-the-Middle) attacks
- Previene session hijacking via HTTP
- Conforme CWE-319 (Cleartext Transmission of Sensitive Information)

**Documentazione dettagliata**: Vedi [TAC-SECURITY-CWE-319-RESOLUTION.md](./TAC-SECURITY-CWE-319-RESOLUTION.md)

### 9. Cache-Control Differenziato per Tipo di Risorsa (NUOVO - CWE-525 & CWE-524)
**Scopo**: Previene il caching di dati sensibili in proxy condivisi, ottimizza performance per asset statici  
**Implementazione**: Sistema di Cache-Control differenziato basato sul tipo di risorsa richiesta

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path.toLowerCase();
  
  // 1. API endpoints - NO CACHING (dati sensibili)
  if (path.startsWith('/api/')) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  // 2. Asset statici immutabili (CSS, JS con hash) - CACHING AGGRESSIVO
  else if (path.match(/\.(css|js)$/) && path.includes('/assets/')) {
    res.setHeader("Cache-Control", "public, max-age=63072000, immutable");
  }
  // 3. Immagini e font - CACHING MODERATO
  else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  // 4. HTML e altre pagine - NO CACHING (potrebbero contenere dati dopo login)
  else if (path.match(/\.(html?)$/) || path === '/' || !path.includes('.')) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  // 5. robots.txt, sitemap.xml - CACHING BREVE
  else if (path.match(/\.(txt|xml)$/)) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
  // 6. Default: NO CACHING per sicurezza
  else {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  
  next();
});
```

**Policy di Caching Implementate**:

| Tipo di Risorsa | Cache-Control | Max-Age | Motivo |
|------------------|---------------|---------|--------|
| **API** (`/api/*`) | `no-store, no-cache, must-revalidate, private` | - | Dati sensibili, mai cachare |
| **HTML** (`*.html`, `/`) | `no-store, no-cache, must-revalidate, private` | - | Potrebbero contenere dati dopo login |
| **Asset JS/CSS** (`/assets/*.{js,css}`) | `public, max-age=63072000, immutable` | 2 anni | File con hash, immutabili |
| **Immagini/Font** (`*.{jpg,png,woff2,etc}`) | `public, max-age=31536000, immutable` | 1 anno | Risorse visive statiche |
| **robots.txt/sitemap.xml** | `public, max-age=3600` | 1 ora | File di configurazione |
| **Default** | `no-store, no-cache, must-revalidate, private` | - | Sicurezza per impostazione predefinita |

**Benefici**:
- Previene caching di dati sensibili in proxy condivisi (CWE-524)
- Ottimizza performance con caching aggressivo per asset immutabili
- Compatibilità HTTP/1.0 (Pragma, Expires) e HTTP/1.1 (Cache-Control)
- Protegge privacy utente dopo login
- Conforme CWE-525 (Re-examine Cache-control Directives)
- Conforme CWE-524 (Storable and Cacheable Content)

**Frontend (Render Static Site)**:
- `/*` → `Cache-Control: no-store, no-cache, must-revalidate, private`
- `/assets/*` → `Cache-Control: public, max-age=63072000, immutable`

**Documentazione dettagliata**: Vedi [TAC-SECURITY-CWE-525-524-RESOLUTION.md](./TAC-SECURITY-CWE-525-524-RESOLUTION.md)

---

## 📋 Header di Sicurezza Pre-Esistenti (Confermati)

Gli header seguenti erano già implementati correttamente:

| Header | Valore | Scopo |
|--------|--------|-------|
| `X-Content-Type-Options` | `nosniff` | Previene MIME type sniffing |
| `X-XSS-Protection` | `0` | Disabilita filtro XSS legacy (CSP moderno attivo) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controlla informazioni referrer |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocca policy cross-domain |
| `Content-Security-Policy` | Configurazione completa | Previene XSS e injection |
| `Cross-Origin-Opener-Policy` | `same-origin` (con eccezioni OAuth) | Isolamento contesto browsing |
| `Cross-Origin-Resource-Policy` | `same-origin` | Isolamento risorse |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Controllo embedding |

**Nota**: `Strict-Transport-Security` è stato spostato nella sezione "Header di Sicurezza Implementati" (#8) per documentare gli enhancement recenti.

---

## 🛡️ Protezioni Rate Limiting

Il sistema implementa rate limiting differenziato per prevenire attacchi brute force:

| Endpoint | Limite | Finestra |
|----------|--------|----------|
| `/api/login` | 10 richieste | 15 minuti |
| `/api/forgot-password` | 5 richieste | 15 minuti |
| `/api/reset-password` | 5 richieste | 15 minuti |
| `/api/contact` | 5 richieste | 60 minuti |
| `/api/mfa/verify` | 5 richieste | 15 minuti |
| `/api/*` (generale) | 500 richieste | 15 minuti |

---

## 🔍 Testing e Verifica

### Script di Test Automatici

Sono stati creati script di test per verificare tutte le misure di sicurezza:

#### Test Header di Sicurezza
```bash
# 1. Avviare il server
npm run dev

# 2. In un altro terminale, eseguire il test
npx tsx server/scripts/test-security-headers.ts
```

Lo script verifica:
- ✅ Presenza di tutti gli header obbligatori
- ✅ Valori corretti degli header
- ✅ Assenza di header informativi vietati
- ✅ Header specifici per endpoint API

#### Test Cache-Control Headers
```bash
# Test sistema Cache-Control differenziato
npx tsx server/scripts/test-cache-control-headers.ts
```

Lo script verifica:
- ✅ API endpoints: `no-store, no-cache, must-revalidate, private`
- ✅ Pagine HTML: `no-store, no-cache, must-revalidate, private`
- ✅ Asset statici: `public, max-age=63072000, immutable`
- ✅ Immagini/Font: `public, max-age=31536000, immutable`
- ✅ robots.txt/sitemap.xml: `public, max-age=3600`
- ✅ Presenza Pragma e Expires per risorse sensibili

#### Test Proxy Disclosure Prevention
```bash
# Verifica blocco metodi HTTP non sicuri
npx tsx server/scripts/test-proxy-disclosure.ts
```

Lo script verifica:
- ✅ TRACE method bloccato (405)
- ✅ TRACK method bloccato (405)
- ✅ OPTIONS senza Origin bloccato (405)
- ✅ OPTIONS con Origin permesso (CORS preflight)
- ✅ X-Powered-By header non presente
- ✅ Server header non presente
- ✅ Allow header presente nelle risposte 405
- ✅ Metodi normali (GET, POST, etc.) funzionanti

### Test Manuale con curl

#### Test Header di Sicurezza
```bash
# Test header su homepage
curl -I http://localhost:5000/

# Test header su endpoint API
curl -I http://localhost:5000/api/csrf-token

# Verificare la presenza di:
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Cache-Control: no-store (solo per /api/*)
# - X-Download-Options: noopen
# - Permissions-Policy
# - Strict-Transport-Security (richiede HTTPS o trust proxy)
```

#### Test Proxy Disclosure Prevention
```bash
# Test TRACE bloccato (dovrebbe restituire 405)
curl -X TRACE http://localhost:5000/api/test

# Test OPTIONS senza Origin bloccato (dovrebbe restituire 405)
curl -X OPTIONS http://localhost:5000/api/test

# Test OPTIONS con Origin permesso (dovrebbe funzionare)
curl -X OPTIONS http://localhost:5000/api/test \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"

# Verifica assenza X-Powered-By e Server header
curl -I http://localhost:5000/ | grep -i "x-powered-by\|server:"
# Non dovrebbe restituire nulla

# Test HSTS (richiede HTTPS o simulazione trust proxy)
curl -I http://localhost:5000/ -H "X-Forwarded-Proto: https" | grep -i strict-transport-security
# Dovrebbe restituire: strict-transport-security: max-age=63072000; includeSubDomains; preload

# Test Cache-Control per API
curl -I http://localhost:5000/api/csrf-token | grep -i cache-control
# Dovrebbe restituire: cache-control: no-store, no-cache, must-revalidate, private

# Test Cache-Control per HTML
curl -I http://localhost:5000/ | grep -i cache-control
# Dovrebbe restituire: cache-control: no-store, no-cache, must-revalidate, private

# Test Cache-Control per asset statici (simulato)
# Per testare in produzione: curl -I https://cruscotto-sgi.com/assets/index-*.js
```

### Test con Browser DevTools

1. Aprire l'applicazione nel browser
2. Aprire DevTools (F12)
3. Andare alla tab **Network**
4. Ricaricare la pagina
5. Cliccare su una richiesta
6. Andare alla tab **Headers**
7. Verificare la presenza degli header di sicurezza in **Response Headers**

---

## 📊 Compliance DAST

### Vulnerabilità Risolte

| ID | Descrizione | Severità | Status | CWE |
|----|-------------|----------|--------|-----|
| DAST-001 | Header X-Frame-Options mancante o non configurato correttamente | Bassa | ✅ Risolto | CWE-1021 |
| DAST-002 | Mancanza Cache-Control su endpoint API sensibili | Bassa | ✅ Risolto | - |
| DAST-003 | Information Disclosure tramite header Server/X-Powered-By | Bassa | ✅ Risolto | CWE-200 |
| DAST-004 | Mancanza header X-Download-Options | Bassa | ✅ Risolto | - |
| DAST-005 | Proxy Disclosure - Metodi HTTP non sicuri (TRACE, TRACK) | Bassa | ✅ Risolto | CWE-200 |
| DAST-006 | Permissions Policy Header Not Set | Info | ✅ Risolto | CWE-693 |
| DAST-007 | Strict-Transport-Security Header Not Set | Info | ✅ Risolto | CWE-319 |
| DAST-008 | Re-examine Cache-control Directives | Info | ✅ Risolto | CWE-525 |
| DAST-009 | Storable and Cacheable Content | Info | ✅ Risolto | CWE-524 |

### Standard di Conformità

L'applicazione è ora conforme a:
- ✅ OWASP Top 10 Security Headers
- ✅ TAC Security CASA Tier 2 e Tier 3
- ✅ Best practice DAST per applicazioni web

---

## 🔄 Modifiche Strutturali

### Risoluzione Conflitti Header

È stato risolto un conflitto nella configurazione di `Cross-Origin-Opener-Policy`:
- **Prima**: Configurato sia tramite Helmet che middleware custom (possibile duplicazione)
- **Dopo**: Solo middleware custom con logica differenziata per OAuth

```typescript
// RIMOSSO: helmet.crossOriginOpenerPolicy (conflitto)
// MANTENUTO: Middleware custom per gestione OAuth popup
app.use((req, res, next) => {
  if (req.path.includes('/api/google/') || req.path.includes('/callback')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  } else {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }
  next();
});
```

---

## 📝 Checklist Deployment

Prima del deployment in produzione, verificare:

- [ ] Variabili d'ambiente configurate correttamente (`ENCRYPTION_KEY`, `SESSION_SECRET`, etc.)
- [ ] Certificato SSL/TLS valido installato
- [ ] Eseguire test header di sicurezza: `npx tsx server/scripts/test-security-headers.ts`
- [ ] Eseguire test proxy disclosure: `npx tsx server/scripts/test-proxy-disclosure.ts`
- [ ] Eseguire test Cache-Control: `npx tsx server/scripts/test-cache-control-headers.ts`
- [ ] Verificare HSTS con: `curl -I https://your-domain.com | grep -i strict` (dovrebbe mostrare max-age=63072000)
- [ ] Verificare Permissions-Policy: `curl -I https://your-domain.com | grep -i permissions-policy`
- [ ] Verificare blocco TRACE: `curl -X TRACE https://your-domain.com/api/test` (deve restituire 405)
- [ ] Verificare assenza X-Powered-By: `curl -I https://your-domain.com | grep -i x-powered-by` (non deve restituire nulla)
- [ ] Verificare Cache-Control API: `curl -I https://your-domain.com/api/clients | grep -i cache-control` (deve mostrare no-store)
- [ ] Verificare Cache-Control Asset: `curl -I https://your-domain.com/assets/index-*.js | grep -i cache-control` (deve mostrare public, immutable)
- [ ] Verificare CSP con browser DevTools
- [ ] Testare funzionalità OAuth Google (popup devono funzionare)
- [ ] Verificare che le API non vengano cachate dal browser
- [ ] Test HSTS su SecurityHeaders.com: `https://securityheaders.com/?q=https://your-domain.com`
- [ ] Eseguire scan DAST post-deployment con tool TAC Security

---

## 🔧 Manutenzione

### Aggiornamento Periodico

Gli header di sicurezza dovrebbero essere rivisti ogni 6 mesi per:
- Verificare nuove best practice
- Aggiornare valori CSP se necessario
- Aggiornare Helmet alla versione più recente: `npm update helmet`

### Monitoraggio

Configurare monitoraggio per:
- Violazioni CSP (endpoint `/api/csp-report`)
- Rate limiting violations
- Tentativi di clickjacking (log anomalie)

---

## 📚 Riferimenti

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

## ✅ Conclusione

Tutte le vulnerabilità di livello BASSO e INFO identificate dal team TAC Security durante la verifica DAST sono state risolte. L'applicazione implementa ora un set completo di header di sicurezza conformi agli standard internazionali e alle best practice OWASP.

### Riepilogo Vulnerabilità Risolte
- ✅ **9 vulnerabilità DAST risolte** (DAST-001 a DAST-009)
- ✅ **4 vulnerabilità CWE Info risolte** (CWE-693, CWE-319, CWE-525, CWE-524)
- ✅ **Conformità OWASP** Top 10 Security Headers
- ✅ **Conformità TAC Security** CASA Tier 2 e Tier 3

### Documenti di Riferimento
- [TAC-SECURITY-CWE-693-RESOLUTION.md](./TAC-SECURITY-CWE-693-RESOLUTION.md) - Permissions-Policy Header
- [TAC-SECURITY-CWE-319-RESOLUTION.md](./TAC-SECURITY-CWE-319-RESOLUTION.md) - Strict-Transport-Security Header
- [TAC-SECURITY-CWE-525-524-RESOLUTION.md](./TAC-SECURITY-CWE-525-524-RESOLUTION.md) - Cache-Control Directives
- [TAC-SECURITY-PROXY-DISCLOSURE-RESOLUTION.md](./TAC-SECURITY-PROXY-DISCLOSURE-RESOLUTION.md) - Proxy Disclosure Prevention
- [TAC-SECURITY-CWE-1021-RESOLUTION.md](./TAC-SECURITY-CWE-1021-RESOLUTION.md) - X-Frame-Options Header

**Status**: ✅ Pronto per deployment  
**Approvazione necessaria**: Team TAC Security (re-test DAST consigliato)

**Data ultimo aggiornamento**: 2025-10-27

