# Risoluzione CWE-525 & CWE-524 - Cache-Control Directives

**Data:** 27 Ottobre 2025  
**Team:** TAC Security DAST Compliance  
**Severity:** Info  
**Status:** ✅ RISOLTO

---

## 📋 Riepilogo Vulnerabilità

### CWE-525: Re-examine Cache-control Directives
**Descrizione:** Le direttive di caching non erano ottimali. Le risposte potevano essere salvate in cache da proxy condivisi, con potenziale rischio per dati sensibili.

### CWE-524: Storable and Cacheable Content
**Descrizione:** I contenuti delle risposte potevano essere salvati da componenti di caching (proxy server), con possibile esposizione di informazioni sensibili.

**Vulnerable URL:** `https://cruscotto-sgi.com`

---

## ✅ Soluzioni Implementate

### 1. Frontend - Static Site (Render)

Configurazione HTTP Response Headers su Render:

| Request Path | Header Name    | Header Value                                      | Scopo                           |
|--------------|----------------|---------------------------------------------------|---------------------------------|
| `/*`         | Cache-Control  | `no-store, no-cache, must-revalidate, private`   | Protezione pagine HTML          |
| `/assets/*`  | Cache-Control  | `public, max-age=63072000, immutable`            | Caching ottimizzato asset       |

**Risultato:** ✅ Pagine HTML non vengono mai cachate, asset statici cachati per 2 anni (immutabili).

---

### 2. Backend - Web Service

**File modificato:** `server/security.ts`  
**Linee:** 358-409

Implementata logica di Cache-Control differenziata per tipo di risorsa:

#### 1️⃣ API Endpoints - NO CACHING
```http
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```
**Pattern:** `/api/*`  
**Motivo:** Le API contengono dati sensibili dell'utente che NON devono essere cachati da proxy o browser.

#### 2️⃣ Asset Statici (CSS, JS) - CACHING AGGRESSIVO
```http
Cache-Control: public, max-age=63072000, immutable
```
**Pattern:** `/assets/*.{css,js}`  
**Motivo:** File con hash nel nome (es. `main-abc123.js`) sono immutabili e possono essere cachati per 2 anni.

#### 3️⃣ Immagini e Font - CACHING MODERATO
```http
Cache-Control: public, max-age=31536000, immutable
```
**Pattern:** `*.{jpg,jpeg,png,gif,webp,svg,woff,woff2,ttf,eot,ico}`  
**Motivo:** Risorse visive statiche possono essere cachate per 1 anno.

#### 4️⃣ Pagine HTML - NO CACHING
```http
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```
**Pattern:** `*.html`, `/`, e path senza estensione  
**Motivo:** Le pagine HTML potrebbero contenere dati sensibili dopo il login dell'utente.

#### 5️⃣ robots.txt, sitemap.xml - CACHING BREVE
```http
Cache-Control: public, max-age=3600
```
**Pattern:** `*.{txt,xml}`  
**Motivo:** File di configurazione che cambiano raramente, cache di 1 ora.

#### 6️⃣ Default - NO CACHING
```http
Cache-Control: no-store, no-cache, must-revalidate, private
```
**Motivo:** Per sicurezza, qualsiasi altro tipo di file non viene cachato.

---

## 🧪 Test di Verifica

### Test 1: API Endpoint
```bash
curl -I https://cruscotto-sgi.com/api/clients
```
**Risultato atteso:**
```http
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

### Test 2: Pagina HTML
```bash
curl -I https://cruscotto-sgi.com/
```
**Risultato atteso:**
```http
Cache-Control: no-store, no-cache, must-revalidate, private
```

### Test 3: Asset Statico
```bash
curl -I https://cruscotto-sgi.com/assets/index-abc123.js
```
**Risultato atteso:**
```http
Cache-Control: public, max-age=63072000, immutable
```

### Test 4: Immagine
```bash
curl -I https://cruscotto-sgi.com/logo/logo.jpg
```
**Risultato atteso:**
```http
Cache-Control: public, max-age=31536000, immutable
```

---

## 📊 Benefici della Soluzione

1. **🔒 Sicurezza Migliorata**
   - Dati sensibili (API, HTML) NON vengono salvati in cache da proxy condivisi
   - Previene esposizione di informazioni utente a terze parti

2. **⚡ Performance Ottimizzata**
   - Asset statici cachati per 2 anni riducono il traffico di rete
   - Caricamento pagine più veloce per utenti ricorrenti

3. **✅ Conformità OWASP**
   - Conforme a OWASP Session Management Cheat Sheet
   - Conforme a best practice di sicurezza per applicazioni web

4. **📈 Professionalità**
   - Implementazione enterprise-grade delle politiche di caching
   - Dimostra attenzione alla sicurezza e alle performance

---

## 🔍 Riferimenti

### Standard e Best Practices
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching)
- [MDN HTTP Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [Grayduck - Cache-Control Recommendations](https://grayduck.mn/2021/09/13/cache-control-recommendations/)

### CWE References
- [CWE-525: Use of Web Browser Cache Containing Sensitive Information](https://cwe.mitre.org/data/definitions/525.html)
- [CWE-524: Use of Cache Containing Sensitive Information](https://cwe.mitre.org/data/definitions/524.html)

---

## 📝 Note Aggiuntive

### Priorità degli Header
La configurazione backend applica gli header Cache-Control attraverso un middleware che:
1. Viene eseguito su **tutte le richieste**
2. Valuta il tipo di risorsa richiesta
3. Applica la policy di caching appropriata

### Compatibilità
La soluzione è compatibile con:
- HTTP/1.0 (Pragma, Expires)
- HTTP/1.1 (Cache-Control)
- Tutti i browser moderni
- Proxy server e CDN

### Monitoraggio
Per verificare l'efficacia della soluzione:
1. Controllare i log di accesso per pattern di caching
2. Monitorare performance con strumenti come Lighthouse
3. Verificare header con browser DevTools (Network tab)

---

## ✨ Conclusione

Le vulnerabilità **CWE-525** e **CWE-524** sono state completamente risolte attraverso:

1. ✅ Configurazione ottimale degli header HTTP su Render (frontend)
2. ✅ Implementazione di Cache-Control differenziato nel backend
3. ✅ Policy restrittive per dati sensibili
4. ✅ Policy permissive per asset statici
5. ✅ Conformità agli standard OWASP

**Status finale:** 🟢 CONFORMI agli standard TAC Security DAST

