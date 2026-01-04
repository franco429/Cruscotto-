# 🔐 Security Updates - 18 Ottobre 2025

## 📝 Riepilogo Modifiche

Questo documento descrive le modifiche di sicurezza applicate al progetto SGI Cruscotto per raggiungere la conformità **ADA CASA Tier 2/3**.

---

## 🔧 Modifiche Applicate

### 1. 📦 Dipendenze - Zero Vulnerabilità in Produzione

#### Dipendenze Aggiornate
```bash
✅ on-headers: aggiornato a versione sicura
✅ tmp: aggiornato a versione sicura
✅ nodemailer: 6.10.1 → 7.0.9+
```

#### Dipendenze Rimosse
```bash
✅ csurf: rimosso (deprecato, sostituito con soluzione custom)
✅ express-validator: rimosso (non utilizzato, vulnerabile)
```

#### Comando per Verificare
```bash
cd server
npm audit --production
# Output atteso: "found 0 vulnerabilities"
```

---

### 2. 🛡️ Content Security Policy (CSP)

#### File Modificato
- `server/security.ts` (linee 92-160)

#### Modifiche
```typescript
// PRIMA (non conforme)
scriptSrc: [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",  // ❌ Vulnerabile
]

// DOPO (conforme Tier 2/3)
const scriptSrcDirectives = [
  "'self'",
  "https://accounts.google.com",
  "https://apis.google.com",
];

if (!isProduction) {
  scriptSrcDirectives.push("'unsafe-eval'"); // Solo in dev
}
```

#### Nuove Feature
1. **Configurazione Conditional**: Dev vs Prod differenziati
2. **Report-URI**: Endpoint `/api/csp-report` per monitorare violazioni
3. **Logging**: Tutte le violazioni CSP vengono loggate

---

### 3. 🔐 CSRF Token - Enterprise Grade

#### File Modificati
- `server/security.ts` (linee 299-418)
- `server/types/express-session.d.ts` (aggiunto `csrfTokenTimestamp`)

#### Nuove Feature

##### 1. Rotazione Automatica Token
```typescript
// Token scade dopo 1 ora
const TOKEN_MAX_AGE = 60 * 60 * 1000;

// Rigenerazione automatica se scaduto
if (!req.session.csrfToken || tokenAge > TOKEN_MAX_AGE) {
  req.session.csrfToken = randomBytes(32).toString("hex");
  req.session.csrfTokenTimestamp = Date.now();
}
```

##### 2. Validazione Constant-Time (Anti Timing-Attack)
```typescript
import { timingSafeEqual } from "crypto";

const tokenBuffer = Buffer.from(tokenFromHeader);
const sessionBuffer = Buffer.from(sessionToken);

if (!timingSafeEqual(tokenBuffer, sessionBuffer)) {
  return res.status(403).json({ 
    message: "Token CSRF non valido.",
    code: "CSRF_TOKEN_INVALID"
  });
}
```

##### 3. Validazione Temporale
```typescript
if (tokenAge > TOKEN_MAX_AGE) {
  return res.status(403).json({ 
    message: "Token CSRF scaduto. Richiedi un nuovo token.",
    code: "CSRF_TOKEN_EXPIRED"
  });
}
```

##### 4. Endpoint Refresh
```
GET /api/csrf-token?refresh=true
```
Forza la rigenerazione del token (utile dopo login o azioni sensibili).

---

### 4. 📊 CSP Violation Reporting

#### File Modificato
- `server/routes.ts` (linee 1293-1318)

#### Nuovo Endpoint
```typescript
POST /api/csp-report
Content-Type: application/csp-report

// Log automatico di tutte le violazioni CSP
logger.warn("CSP Violation detected", {
  documentUri: report["document-uri"],
  violatedDirective: report["violated-directive"],
  blockedUri: report["blocked-uri"],
  // ... altri dettagli
});
```

#### Utilizzo
- Attivo solo in produzione
- Risponde sempre con `204 No Content`
- Log automatico in `logs/combined.log`

---

## 🔍 Testing

### Test CSP
```bash
# In produzione, verifica che unsafe-eval non sia presente
curl -I https://cruscotto-sgi.com

# Cerca: Content-Security-Policy header
# NON deve contenere: unsafe-eval
```

### Test CSRF
```bash
# 1. Ottieni token
curl -X GET http://localhost:5001/api/csrf-token \
  --cookie-jar cookies.txt

# 2. Usa token in richiesta
curl -X POST http://localhost:5001/api/some-endpoint \
  -H "X-CSRF-Token: <token>" \
  --cookie cookies.txt

# 3. Test token scaduto (dopo 1 ora)
# Dovrebbe ricevere: CSRF_TOKEN_EXPIRED
```

### Test Vulnerabilità
```bash
cd server
npm audit --production

# Output atteso:
# found 0 vulnerabilities
```

---

## 📋 Checklist Deploy

Prima di deployare in produzione, verifica:

- [ ] `NODE_ENV=production` è impostato
- [ ] Variabili ambiente critiche configurate:
  - [ ] `ENCRYPTION_KEY` (>= 32 caratteri)
  - [ ] `SESSION_SECRET` (>= 32 caratteri)
  - [ ] `DB_URI` configurato
- [ ] `npm audit --production` ritorna 0 vulnerabilità
- [ ] CSP headers configurati (verifica con curl)
- [ ] Logging funzionante (verifica `logs/`)
- [ ] Rate limiting attivo (test con ab/wrk)

---

## 🔄 Compatibilità

### Breaking Changes
❌ **NESSUNO** - Tutte le modifiche sono backward compatible

### Modifiche Trasparenti
- CSP: Solo hardening, nessuna modifica funzionale
- CSRF: API identica, solo validazione più forte
- Dipendenze: Aggiornamenti minori

### Client Updates
✅ **NON RICHIESTI** - Il frontend continua a funzionare senza modifiche

---

## 📚 Documentazione Correlata

1. **Report Conformità Completo**: `docs/SECURITY-COMPLIANCE-REPORT.md`
2. **Guida MFA**: `docs/MFA-E-SICUREZZA.md`
3. **Documentazione API**: `docs/guida-completa-cliente.md`

---

## 🆘 Troubleshooting

### Problema: CSRF Token Expired
**Causa**: Token scaduto dopo 1 ora  
**Soluzione**: Frontend deve richiedere nuovo token con `/api/csrf-token?refresh=true`

### Problema: CSP Violation in Production
**Causa**: Script/risorsa da dominio non autorizzato  
**Soluzione**: 
1. Verifica log in `logs/combined.log`
2. Aggiungi dominio legittimo a `security.ts` CSP directives

### Problema: npm audit mostra vulnerabilità dev
**Causa**: Vulnerabilità in dipendenze dev (es. esbuild, vite)  
**Soluzione**: ✅ NON È UN PROBLEMA - dipendenze dev non vanno in produzione

---

## 📞 Contatti

Per domande o problemi relativi a questi update:
- **Team**: SGI Development Team
- **Email**: Vedi documentazione principale

---

## 🎯 Prossimi Step (Opzionali)

1. **Monitoring CSP**: Configurare dashboard per violazioni CSP
2. **CSRF Monitoring**: Alert automatici per tentativi CSRF
3. **Security Audit**: Audit periodico (ogni 3 mesi)
4. **Penetration Testing**: Test professionali pre-certificazione

---

*Documento generato: 18 Ottobre 2025*  
*Versione: 1.0.0*

