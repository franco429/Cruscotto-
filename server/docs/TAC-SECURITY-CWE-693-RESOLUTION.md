# Risoluzione Vulnerabilità CWE-693: Permissions Policy Header Not Set

**Data Risoluzione**: 27 Ottobre 2025  
**Severity Level**: Info  
**CWEID**: 693  
**Status**: Risolto ✅  
**Team**: TAC Security DAST Compliance

---

## 📋 Sommario

Questo documento descrive la risoluzione della vulnerabilità **CWE-693 (Permissions Policy Header Not Set)** identificata durante la verifica DAST dell'applicazione SGI Cruscotto da parte del team TAC Security.

## 🔍 Descrizione della Vulnerabilità

### Problema Identificato

L'applicazione non specificava l'header `Permissions-Policy`, che controlla quali funzionalità del browser (microfono, fotocamera, geolocalizzazione, pagamenti, ecc.) possono essere utilizzate dalla pagina web.

**URL Vulnerabile**: https://cruscotto-sgi.com

### Impatto

Anche se classificata come vulnerabilità di livello **Info** (non critica), la mancanza di questo header:
- Permette potenzialmente l'accesso non controllato alle API del browser
- Riduce il livello di sicurezza e professionalità dell'applicazione
- Non rispetta le best practices moderne di web security

### Standard di Riferimento

- **CWE-693**: Protection Mechanism Failure
- **OWASP**: Security Headers Best Practices
- **Mozilla Observatory**: A+ Rating Requirements
- **W3C Permissions Policy**: https://www.w3.org/TR/permissions-policy/

---

## ✅ Soluzione Implementata

### 1. Configurazione Header Permissions-Policy

**File**: `server/security.ts` (linee 222-229)

```typescript
// Permissions-Policy (ex Feature-Policy): limita l'accesso alle API del browser
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  next();
});
```

### 2. Funzionalità Bloccate

L'header implementato **blocca** completamente l'accesso alle seguenti API del browser:

| API Bloccata | Descrizione | Motivo del Blocco |
|--------------|-------------|-------------------|
| `geolocation=()` | Geolocalizzazione GPS | Non necessaria per l'applicazione |
| `microphone=()` | Accesso al microfono | Non necessaria per l'applicazione |
| `camera=()` | Accesso alla fotocamera | Non necessaria per l'applicazione |
| `payment=()` | API Payment Request | Non necessaria per l'applicazione |
| `usb=()` | Accesso a dispositivi USB | Non necessaria per l'applicazione |
| `magnetometer=()` | Sensore magnetometro | Non necessaria per l'applicazione |
| `gyroscope=()` | Sensore giroscopio | Non necessaria per l'applicazione |
| `accelerometer=()` | Sensore accelerometro | Non necessaria per l'applicazione |

### 3. Applicazione Globale

L'header viene applicato **automaticamente** a:
- ✅ Tutte le pagine HTML statiche
- ✅ Tutti gli endpoint API
- ✅ Tutte le risorse servite dal server
- ✅ File statici (CSS, JS, immagini)

### 4. Compatibilità Browser

L'header `Permissions-Policy` è supportato da:
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 74+ (come `Feature-Policy`)
- ✅ Safari 15.4+
- ✅ Opera 74+

**Nota**: Per browser legacy che non supportano `Permissions-Policy`, l'header viene ignorato in modo sicuro (graceful degradation).

---

## 🧪 Testing e Verifica

### Script di Test Automatizzato

**File**: `server/scripts/test-security-headers.ts`

Lo script verifica automaticamente la presenza e la correttezza dell'header `Permissions-Policy`:

```bash
# Avviare il server in una finestra separata
npm run dev

# Eseguire il test
npx tsx server/scripts/test-security-headers.ts
```

### Verifica Manuale

#### Con curl:
```bash
curl -I https://cruscotto-sgi.com | grep -i permissions-policy
```

Output atteso:
```
permissions-policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

#### Con Browser DevTools:
1. Aprire https://cruscotto-sgi.com
2. Aprire DevTools (F12)
3. Andare alla tab "Network"
4. Selezionare la richiesta principale (index.html)
5. Verificare la presenza dell'header nella sezione "Response Headers"

### Test di Sicurezza Online

Verificare la presenza dell'header utilizzando:
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/ssltest/

---

## 📊 Risultati Post-Implementazione

### Prima della Risoluzione
```
❌ Permissions-Policy: ASSENTE
Status: Open
Severity: Info
```

### Dopo la Risoluzione
```
✅ Permissions-Policy: PRESENTE
Value: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
Status: Risolto
Severity: Info → N/A
```

---

## 🔐 Conformità agli Standard

Questa implementazione garantisce la conformità a:

### TAC Security DAST Requirements
- ✅ **CWE-693**: Protection Mechanism Failure - RISOLTO
- ✅ **Info Level**: Tutte le vulnerabilità di livello Info risolte
- ✅ **Best Practices**: Header di sicurezza completi

### OWASP Security Headers
- ✅ Permissions-Policy configurato
- ✅ Principio del minimo privilegio applicato
- ✅ Defense in depth implementato

### Mozilla Observatory
- ✅ A+ Rating Requirements
- ✅ Modern security headers presente
- ✅ Browser feature policy configurata

---

## 📝 Note Implementative

### Perché Bloccare Tutte le API?

L'applicazione SGI Cruscotto è un sistema di gestione documentale che:
- **Non richiede** accesso a geolocalizzazione
- **Non richiede** accesso a microfono/fotocamera
- **Non richiede** accesso a sensori di movimento
- **Non richiede** accesso a dispositivi USB
- **Non gestisce** pagamenti tramite Payment Request API

Secondo il **principio del minimo privilegio**, blocchiamo tutte le API non necessarie per:
1. Ridurre la superficie di attacco
2. Prevenire abusi di terze parti (XSS, malicious scripts)
3. Migliorare la privacy degli utenti
4. Rispettare le best practices di sicurezza

### Estensibilità Futura

Se in futuro l'applicazione dovesse richiedere l'accesso a una di queste API, basterà modificare il valore dell'header.

Esempio per consentire solo la geolocalizzazione:
```typescript
"geolocation=(self), microphone=(), camera=(), ..."
```

---

## 📚 Riferimenti

### Documentazione Ufficiale
- [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy/)
- [MDN Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [Chrome Feature Policy](https://developer.chrome.com/docs/privacy-security/permissions-policy/)

### Standard di Sicurezza
- [CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

### Altri Documenti TAC Security
- [CWE-1021 Resolution](./TAC-SECURITY-CWE-1021-RESOLUTION.md) - X-Frame-Options
- [Proxy Disclosure Resolution](./TAC-SECURITY-PROXY-DISCLOSURE-RESOLUTION.md) - CWE-200
- [DAST Compliance Overview](./TAC-SECURITY-DAST-COMPLIANCE.md)

---

## 👥 Team e Contatti

**Implementato da**: Development Team  
**Verificato da**: TAC Security Team  
**Data Implementazione**: 27 Ottobre 2025  
**Versione Applicazione**: 2.0.0+

---

## ✅ Checklist di Verifica

- [x] Header Permissions-Policy configurato in `server/security.ts`
- [x] Header applicato globalmente a tutte le risposte
- [x] Tutte le API non necessarie bloccate
- [x] Script di test automatizzato creato
- [x] Verifica manuale con curl completata
- [x] Verifica con browser DevTools completata
- [x] Documentazione completa creata
- [x] Conformità TAC Security DAST verificata

---

**Status Finale**: ✅ **RISOLTO E VERIFICATO**

La vulnerabilità CWE-693 (Permissions Policy Header Not Set) è stata completamente risolta e l'applicazione è ora conforme agli standard TAC Security DAST.

