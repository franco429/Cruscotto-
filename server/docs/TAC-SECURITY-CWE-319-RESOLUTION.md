# 🔒 TAC Security DAST - CWE-319 Resolution

## Strict-Transport-Security Header Not Set

**Document Version**: 1.0  
**Date**: 2025-10-27  
**Status**: ✅ RESOLVED  
**Severity Level**: Info (Low Priority, High Impact on Security Posture)

---

## 📋 Executive Summary

This document details the resolution of **CWE-319 (Cleartext Transmission of Sensitive Information)** vulnerability identified by the TAC Security team during DAST (Dynamic Application Security Testing) verification of the SGI Cruscotto application.

### Quick Facts

| Aspect | Details |
|--------|---------|
| **CWEID** | 319 |
| **Vulnerability** | Strict-Transport-Security Header Not Set |
| **Severity** | Info |
| **Impact** | Medium - Allows potential downgrade attacks |
| **Status** | ✅ Resolved |
| **Resolution Date** | 2025-10-27 |
| **Vulnerable URL** | https://cruscotto-sgi.com |

---

## 🔍 Vulnerability Description

### What is HTTP Strict Transport Security (HSTS)?

HTTP Strict Transport Security (HSTS) is a web security policy mechanism that forces web browsers to interact with websites using only secure HTTPS connections, never via insecure HTTP. 

HSTS is specified in **RFC 6797** and is a critical defense against:
- **Protocol Downgrade Attacks**: Attackers forcing browsers to use HTTP instead of HTTPS
- **Man-in-the-Middle (MITM) Attacks**: Intercepting unencrypted HTTP traffic
- **Session Hijacking**: Stealing session cookies transmitted over HTTP
- **Cookie Theft**: Capturing authentication tokens sent in cleartext

### The Problem

Without the HSTS header, even if your site uses HTTPS:
1. Users might type `http://cruscotto-sgi.com` (without the 's')
2. The browser makes an initial HTTP request before redirecting to HTTPS
3. This initial HTTP request can be intercepted by attackers
4. Sensitive data (cookies, credentials) could be compromised

### Attack Scenario Example

```
User types: http://cruscotto-sgi.com
    ↓
Initial HTTP request (VULNERABLE)
    ↓
Attacker intercepts → Steals session cookie
    ↓
Server redirects to HTTPS (TOO LATE)
```

### Evidence from TAC Security DAST

The TAC Security team identified the following:
- **Evidence URLs**:
  - https://cruscotto-sgi.com/
  - https://cruscotto-sgi.com/assets/index-BbqWcOch.js
  - https://cruscotto-sgi.com/assets/index-DJTXi__G.css
  - https://cruscotto-sgi.com/favicon.png
  - https://cruscotto-sgi.com/robots.txt
  - https://cruscotto-sgi.com/sitemap.xml

---

## ✅ Solution Implemented

### Overview

We implemented a **dual-layer HSTS protection** strategy:
1. **Helmet middleware** for standard HSTS configuration
2. **Explicit middleware** to guarantee header presence on all responses
3. **Trust proxy configuration** to recognize HTTPS behind reverse proxy

### Implementation Details

#### 1. Trust Proxy Configuration (`server/index.ts`)

```typescript
// Configurazione Express per lavorare dietro un reverse proxy (Render, Nginx, etc.)
// Necessario per HSTS e altri security headers
app.set('trust proxy', 1);
```

**Why This Matters**:
- Render (and other hosting providers) use reverse proxies
- Without `trust proxy`, Express doesn't recognize HTTPS connections
- `req.secure` and `req.protocol` won't work correctly
- HSTS headers might not be applied properly

#### 2. Helmet HSTS Configuration (`server/security.ts`)

```typescript
// HSTS (HTTP Strict Transport Security) - Force HTTPS
// Max-age di 2 anni (63072000 secondi) come raccomandato da OWASP
// Conforme a TAC Security DAST - CWE-319 (Cleartext Transmission)
app.use(
  helmet.hsts({
    maxAge: 63072000, // 2 anni (731 giorni)
    includeSubDomains: true,
    preload: true, // Eligibile per HSTS preload list
  })
);
```

#### 3. Explicit Middleware Guarantee (`server/security.ts`)

```typescript
// Middleware esplicito per garantire presenza HSTS header su TUTTE le risposte
// Doppia protezione per conformità TAC Security DAST
app.use((req: Request, res: Response, next: NextFunction) => {
  // Applica HSTS solo se la richiesta è HTTPS o dietro un proxy HTTPS
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  
  if (isSecure || isProduction) {
    // In produzione, forza sempre HSTS (assumiamo che Render usi sempre HTTPS)
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
```

---

## 📊 HSTS Parameters Explained

### Max-Age: 63072000 seconds (2 years)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **max-age** | 63072000 | 2 years in seconds (731 days) |
| **OWASP Recommendation** | ≥ 31536000 | Minimum 1 year |
| **Our Implementation** | 63072000 | 2 years - exceeds OWASP minimum |
| **Browser Behavior** | Enforces HTTPS | Browser remembers for 2 years |

**Why 2 Years?**
- OWASP recommends at least 1 year (31536000 seconds)
- 2 years provides extended protection
- Balances security with operational flexibility
- Aligns with HSTS preload list requirements

### IncludeSubDomains

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

**Effect**: Applies HSTS to all subdomains
- ✅ `api.cruscotto-sgi.com` → Protected
- ✅ `www.cruscotto-sgi.com` → Protected
- ✅ `*.cruscotto-sgi.com` → Protected

**Important**: Only use if ALL subdomains support HTTPS!

### Preload

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Effect**: Makes the site eligible for browser HSTS preload lists
- Browsers ship with a hardcoded list of HSTS-enabled sites
- First visit is ALWAYS HTTPS (no initial HTTP request)
- Maximum security from the very first connection

**Preload Requirements**:
1. ✅ Valid certificate
2. ✅ Redirect HTTP → HTTPS (same host)
3. ✅ Serve HSTS header on base domain
4. ✅ max-age ≥ 31536000 (1 year)
5. ✅ includeSubDomains directive
6. ✅ preload directive

**Submit to preload list**: https://hstspreload.org/

---

## 🧪 Testing & Verification

### 1. Local Testing (Development)

```bash
# Start the server
cd server
npm run dev
```

```bash
# Test HSTS header (requires HTTPS or trust proxy simulation)
curl -I http://localhost:5001/ -H "X-Forwarded-Proto: https"
```

**Expected Output**:
```
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

### 2. Production Testing

```bash
# Test on live production server
curl -I https://cruscotto-sgi.com/
```

**Expected Output**:
```http
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
content-type: text/html; charset=utf-8
x-frame-options: DENY
...
```

### 3. Browser Testing

#### Chrome DevTools
1. Open https://cruscotto-sgi.com
2. Open DevTools (F12)
3. Go to **Network** tab
4. Refresh page
5. Click on the document request
6. Go to **Headers** tab
7. Check **Response Headers**
8. Verify: `strict-transport-security: max-age=63072000; includeSubDomains; preload`

#### Check HSTS Status in Chrome
1. Navigate to `chrome://net-internals/#hsts`
2. In "Query HSTS/PKP domain" enter: `cruscotto-sgi.com`
3. Click **Query**
4. Verify domain is in HSTS list

#### Test HSTS Enforcement
1. Clear HSTS cache: `chrome://net-internals/#hsts` → Delete domain security policies
2. Type `http://cruscotto-sgi.com` (without HTTPS)
3. Browser should automatically upgrade to HTTPS (307 Internal Redirect)

### 4. Online Security Scanners

#### SecurityHeaders.com
```
https://securityheaders.com/?q=https://cruscotto-sgi.com
```

**Expected Grade**: A or A+

#### SSL Labs
```
https://www.ssllabs.com/ssltest/analyze.html?d=cruscotto-sgi.com
```

**Look for**: HSTS preload ready

#### HSTS Preload Check
```
https://hstspreload.org/?domain=cruscotto-sgi.com
```

**Expected**: Eligible for preload list

---

## 📈 Benefits & Impact

### Security Benefits

| Threat | Without HSTS | With HSTS |
|--------|--------------|-----------|
| **Protocol Downgrade** | ❌ Vulnerable | ✅ Protected |
| **MITM Attacks** | ❌ Possible | ✅ Prevented |
| **Cookie Hijacking** | ❌ Risk | ✅ Mitigated |
| **Session Theft** | ❌ Exposed | ✅ Secured |
| **First Visit Attack** | ❌ Vulnerable | ✅ Protected (with preload) |

### Compliance Impact

- ✅ **TAC Security DAST**: Resolves CWE-319
- ✅ **OWASP Top 10**: A02:2021 – Cryptographic Failures
- ✅ **PCI DSS**: Requirement 4.1 (Use strong cryptography)
- ✅ **GDPR**: Technical measures for data protection
- ✅ **ISO 27001**: Information security best practices

### Performance Impact

**Positive Impact**:
- Eliminates HTTP → HTTPS redirect (saves 1 round-trip)
- Browser enforces HTTPS directly (faster page loads)
- Reduced server load (no HTTP redirects needed)

**Negative Impact**:
- None (header adds ~60 bytes per response)

---

## 🔐 Security Considerations

### Important Warnings

⚠️ **DO NOT enable HSTS if**:
- Not ALL subdomains support HTTPS
- You might need to disable HTTPS in the future
- You're still testing SSL/TLS configuration

⚠️ **HSTS is irreversible** (for max-age duration):
- Once set, browsers enforce HTTPS for the specified period
- Cannot be "turned off" until max-age expires
- Invalid certificates will BLOCK access (no bypass option)

### Rollback Strategy

If you need to disable HSTS:

```typescript
// Set max-age to 0 to clear HSTS
res.setHeader('Strict-Transport-Security', 'max-age=0');
```

Then wait for the previous max-age to expire in all browsers.

---

## 📚 References

### Standards & Specifications

1. **RFC 6797**: HTTP Strict Transport Security (HSTS)
   - https://tools.ietf.org/html/rfc6797

2. **OWASP HSTS Cheat Sheet**
   - https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html

3. **MDN Web Docs: Strict-Transport-Security**
   - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security

### Security Resources

4. **OWASP Security Headers**
   - https://owasp.org/www-community/Security_Headers

5. **HSTS Preload List**
   - https://hstspreload.org/

6. **Wikipedia: HTTP Strict Transport Security**
   - https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security

### Testing Tools

7. **Security Headers Scanner**
   - https://securityheaders.com/

8. **SSL Labs Server Test**
   - https://www.ssllabs.com/ssltest/

9. **CanIUse: Strict-Transport-Security**
   - https://caniuse.com/stricttransportsecurity

### CWE Resources

10. **CWE-319: Cleartext Transmission of Sensitive Information**
    - https://cwe.mitre.org/data/definitions/319.html

11. **CAPEC-94: Adversary in the Middle (AiTM)**
    - https://capec.mitre.org/data/definitions/94.html

---

## 📞 Support & Contact

### For Questions About This Resolution

- **TAC Security Team**: For DAST verification and compliance questions
- **SGI Development Team**: For implementation details and technical support

### Related Documentation

- `server/docs/TAC-SECURITY-DAST-COMPLIANCE.md` - Complete DAST compliance report
- `SECURITY-CHANGELOG.md` - Security update history
- `server/security.ts` - Implementation source code

---

## ✅ Checklist for TAC Security Verification

- [x] Strict-Transport-Security header present on all HTTPS responses
- [x] max-age ≥ 31536000 (we use 63072000 = 2 years)
- [x] includeSubDomains directive enabled
- [x] preload directive enabled
- [x] Trust proxy configured for Render deployment
- [x] Header applied via dual-layer protection (Helmet + explicit middleware)
- [x] Tested in development environment
- [x] Tested in production environment
- [x] Documented in SECURITY-CHANGELOG.md
- [x] Resolution document created (this document)

---

## 📊 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-27 | SGI Dev Team | Initial resolution documentation |

---

**Document Status**: ✅ Complete and Ready for TAC Security Review

*Last Updated: 2025-10-27*

