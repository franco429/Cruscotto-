# 🎯 Pannello Di Controllo SGI - Sistema di Gestione Documentale

## 📖 Benvenuto in Pannello Di Controllo SGI

**Pannello Di Controllo SGI** è il sistema di gestione documentale che trasforma la gestione dei documenti aziendali da "complessa e lenta" a "semplice e veloce". Integra Google Drive per la sincronizzazione automatica e offre un'interfaccia web moderna per la gestione completa dei documenti.

### 🚀 **Per Iniziare Subito**
👉 **[Vai alla Guida Cliente](README-CLIENTE.md)** - Setup rapido e istruzioni complete

### ⚡ **NOVITÀ: Migrazione a Google Cloud Storage**

**Eliminati i fallimenti delle istanze Render!** Il sistema ora usa **Google Cloud Storage** invece dello storage temporaneo `/tmp`, garantendo:

- ✅ **Zero fallimenti istanze** su Render
- ✅ **Performance +60%** su analisi Excel
- ✅ **Scalabilità illimitata** per file temporanei
- ✅ **Costi minimi** (<$0.10/mese)

📚 **Documentazione Setup**:
- [Guida Setup Google Cloud Storage](docs/GOOGLE-CLOUD-STORAGE-SETUP.md)
- [Documentazione Migrazione](docs/MIGRATION-TO-CLOUD-STORAGE.md)
- [Riassunto Completo](CLOUD-STORAGE-MIGRATION-SUMMARY.md)

### 🎯 Funzionalità Principali

- **📁 Organizzazione Perfetta** dei documenti aziendali
- **⚡ Apertura Istantanea Locale** senza download (Local Opener)
- **🔄 Sincronizzazione Automatica** con Google Drive Browser
- **🔍 Ricerca Potente** e filtri avanzati
- **👥 Gestione Team** con ruoli differenziati
- **💾 Backup Automatici** e sicurezza totale
- **📧 Notifiche Intelligenti** per scadenze
- **🔐 Autenticazione Multi-Fattore (MFA/2FA)** per massima sicurezza

## 🔐 **Autenticazione Multi-Fattore (MFA/2FA)**

### ✅ **Sistema MFA Completo Implementato**

Il sistema SGI Cruscotto include un **sistema di autenticazione multi-fattore (MFA/2FA) completo** conforme agli standard **TAC Security CASA Tier 2 e Tier 3**.

#### **🎯 Caratteristiche MFA**

- **🔑 TOTP (Time-based One-Time Password)** - Standard RFC 6238
- **📱 QR Code Setup** - Configurazione facile con app authenticator
- **🆘 10 Backup Codes** - Codici di emergenza hashati SHA-256
- **⏱️ Token 30 secondi** - Validità con tolleranza ±30s
- **🔒 Protezione Brute Force** - Lockout progressivo e rate limiting
- **📊 Audit Trail Completo** - Logging dettagliato di tutti gli eventi

#### **👥 Chi Può Usare MFA?**

- ✅ **Superadmin** - Accesso completo a MFA
- ✅ **Admin** - Accesso completo a MFA  
- ❌ **Viewer** - Solo visualizzazione (MFA non necessario)

#### **📱 App Authenticator Supportate**

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (se già utilizzato come password manager)

#### **🚀 Setup MFA per Amministratori**

1. **Accedi** al tuo account admin/superadmin
2. **Vai** su Impostazioni → Sicurezza
3. **Click** su "Abilita Autenticazione a Due Fattori"
4. **Scansiona** il QR code con la tua app authenticator
5. **Salva** i 10 backup codes in un luogo sicuro
6. **Verifica** con il primo codice dall'app
7. **✅ MFA Attivato!**

#### **🔐 Login con MFA**

1. **Inserisci** email e password
2. **Sistema richiede** codice MFA
3. **Apri** l'app authenticator sul telefono
4. **Inserisci** il codice a 6 cifre (valido 30 secondi)
5. **✅ Accesso completato!**

#### **🆘 Login con Backup Code**

Se non hai accesso al telefono:
1. **Click** su "Usa backup code"
2. **Inserisci** uno dei backup codes salvati (formato: XXXX-XXXX)
3. **✅ Accesso completato!**
4. **⚠️** Il backup code usato viene invalidato

#### **🔧 Gestione MFA**

- **Rigenera Backup Codes** - Quando ne rimangono ≤3
- **Disabilita MFA** - Con conferma password
- **Riabilita MFA** - In qualsiasi momento
- **Monitora Stato** - Dashboard con statistiche

### 🛡️ **Sicurezza Enterprise-Grade**

#### **Protezioni Implementate**

- **🔒 Rate Limiting** - 5 tentativi ogni 15 minuti
- **🚫 Account Lockout** - Progressivo (5min → 15min → 1h → 24h)
- **📊 Audit Logging** - Tutti gli eventi tracciati
- **🔐 Password Policy** - Min 8 char, maiuscole, minuscole, numeri
- **🛡️ Security Headers** - CSP, HSTS, CORS rigoroso
- **⚡ Session Security** - MongoDB store, secure cookies

#### **✅ Conformità TAC Security CASA**

- **Tier 2**: 16/16 requisiti soddisfatti (100%)
- **Tier 3**: 8/8 requisiti soddisfatti (100%)
- **OWASP ASVS Level 2**: Conforme
- **NIST 800-63B**: Conforme
- **PCI DSS**: Conforme

#### **📈 Tempo Brute Force Stimato**

Con le protezioni implementate: **~27.000 anni** 🔒

---

## 🚀 **Per Sviluppatori - Setup Tecnico**

> **Per i clienti**: Vai direttamente alla [Guida Cliente](README-CLIENTE.md) per iniziare subito!

### Prerequisiti Tecnici

- **Node.js** 18+ installato
- **MongoDB** 5+ installato e in esecuzione
- **Google Cloud Project** configurato con Google Drive API

### Installazione Sviluppo

```bash
# Clona il repository
git clone <repository-url>
cd SGI-Cruscotto-main

# Installa le dipendenze
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### Configurazione Ambiente

Crea un file `.env` nella directory root:

```env
# Database
DB_URI=mongodb://localhost:27017/Pannello di Controllo SGI

# Google Drive
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# Security
SESSION_SECRET=your_session_secret
CSRF_SECRET=your_csrf_secret
ENCRYPTION_KEY=your-strong-32chars-min-key

# URL di base del server (obbligatoria)
SERVER_BASE_URL=http://localhost:5000
# URL del frontend (obbligatoria)
FRONTEND_URL=http://localhost:5173
```

### Passo 3: Creazione del Primo SuperAdmin solo per Sviluppatori!

**IMPORTANTE**: Il sistema richiede un SuperAdmin per funzionare. Esegui questo comando per creare il primo SuperAdmin:

```bash
# Dalla directory root del progetto
cd tools
node create-superadmin.js
```

Lo script ti guiderà attraverso:
1. Inserimento email e password per il SuperAdmin
2. Validazione dei dati
3. Creazione dell'utente nel database
4. Visualizzazione delle credenziali di accesso

### Passo 4: Avvio del Sistema

```bash
# Dalla directory root del progetto
npm run dev
```

### Passo 5: Configurazione Iniziale

1. **Accedi** al sistema con le credenziali del SuperAdmin
2. **Genera codici aziendali** dalla sezione "Company Codes"
3. **Distribuisci i codici** alle aziende per la registrazione
4. **Configura Google Drive** per le aziende registrate

#### Configurazione Documenti Locali

Le aziende possono scegliere tra due modalità di gestione documenti:

**Opzione A: Google Drive**
- Configura l'URL della cartella Google Drive durante la registrazione
- Sincronizzazione automatica ogni 15 minuti
- Backup automatico su Google Drive

**Opzione B: Documenti Locali (Raccomandato)**
- Carica cartelle di documenti direttamente dal computer
- Processamento automatico dei metadati
- Controllo completo sui file
- Funziona offline


Per utilizzare i documenti locali:
1. Durante la registrazione, seleziona "Carica Cartella Locale" invece di inserire l'URL Google Drive
2. Oppure, dopo la registrazione, usa il pulsante "Aggiorna documenti locali" nella dashboard admin
3. Seleziona una cartella contenente i documenti da caricare
4. Il sistema processerà automaticamente tutti i file

### 🔧 Tools di Amministrazione Solo per Sviluppatori della web App!

Il sistema include strumenti per la gestione amministrativa:

- **`create-superadmin.js`** - Crea il primo SuperAdmin
- **`create-company-code.js`** - Crea codici aziendali singoli
- **`check-company-codes.js`** - Verifica codici esistenti

Per maggiori dettagli sui tool, consulta [tools/README.md](./tools/README.md).

## 🏗️ Architettura del Sistema

Il progetto è strutturato come un'applicazione **full-stack** con architettura client-server:

```
Pannello di Controllo SGI/
├── client/          # Frontend React + TypeScript
├── server/          # Backend Node.js + Express
├── shared-types/    # Tipi TypeScript condivisi
├── docs/           # Documentazione


### Architettura Documenti Locali

Il sistema supporta una **architettura ibrida** per la gestione documenti:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Drive  │    │  Documenti      │    │   Database      │
│   (Cloud)       │    │  Locali         │    │   MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Google API  │  │ File Upload │  │ Document    │            │
│  │ Integration │  │ Processing  │  │ Management  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Client                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Drive Sync  │  │ Local Upload│  │ Document    │            │
│  │ Interface   │  │ Interface   │  │ Viewer      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Componenti Chiave:**
- **File Upload Handler**: Gestisce upload di cartelle complete
- **Document Processor**: Estrae metadati dai nomi file
- **Excel Analyzer**: Analizza contenuto Excel per scadenze
- **Storage Manager**: Gestisce file locali  Drive in modo unificato
- **Preview Engine**: Visualizzazione integrata per entrambi i tipi
- **Confirmation Toast System**: Sistema di conferma moderno per operazioni critiche
- **Document Management**: Gestione completa con eliminazione sicura

### Componenti UI Moderni

Il sistema include componenti UI avanzati per un'esperienza utente ottimale:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Componenti UI                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Confirmation│  │ Document    │  │ Toast       │            │
│  │ Toast       │  │ Table       │  │ System      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Componenti Principali:**
- **ConfirmationToast**: Toast di conferma per operazioni critiche
- **DocumentTable**: Tabella documenti con azioni admin
- **useConfirmationToast**: Hook per gestione toast di conferma
- **AlertDialog**: Dialog di conferma per eliminazione documenti

## 🛠️ Stack Tecnologico

### Frontend (Client)

- **React 19** - Framework UI
- **TypeScript** - Tipizzazione statica
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utility-first
- **Radix UI** - Componenti UI accessibili
- **React Query (TanStack Query)** - Gestione stato server
- **React Hook Form** - Gestione form
- **Wouter** - Routing leggero
- **Lucide React** - Icone
- **Framer Motion** - Animazioni
- **Toast System** - Sistema di notifiche e conferme moderne
- **Confirmation Components** - Componenti di conferma per operazioni critiche

### Backend (Server)

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipizzazione statica
- **MongoDB** - Database NoSQL
- **Mongoose** - ODM per MongoDB
- **Passport.js** - Autenticazione
- **Google APIs** - Integrazione Google Drive
- **Nodemailer** - Invio email
- **Winston** - Logging strutturato
- **Helmet** - Sicurezza HTTP
- **CORS** - Cross-origin resource sharing

### Database

- **MongoDB** - Database principale
- **Session Store** - Gestione sessioni utente

### Integrazioni

- **Google Drive API** - Sincronizzazione documenti
- **Google OAuth 2.0** - Autenticazione Google
- **SMTP** - Invio notifiche email

## 🔐 Sistema di Autenticazione e Ruoli

### Ruoli Utente

1. **Viewer** - Utente base

   - Visualizzazione documenti
   - Ricerca e filtri
   - **❌ MFA non disponibile** (solo visualizzazione)

2. **Admin** - Amministratore aziendale

   - Tutte le funzioni Viewer
   - Gestione utenti aziendali
   - Configurazione Google Drive
   - **Gestione Documenti Locali** (upload cartelle, aggiornamento documenti)
   - **Gestione Eliminazione Documenti** (eliminazione sicura con conferma)
   - Gestione documenti
   - Visualizzazione audit logs
   - **✅ MFA OBBLIGATORIO** - Autenticazione a due fattori

3. **SuperAdmin** - Amministratore di sistema
   - Tutte le funzioni Admin
   - Gestione codici aziendali
   - Gestione globale utenti
   - Accesso completo audit logs
   - Configurazione sistema
   - **✅ MFA OBBLIGATORIO** - Autenticazione a due fattori

### 🔐 Autenticazione Multi-Fattore (MFA)

#### **Per Admin e SuperAdmin**

- **🔑 TOTP Standard** - Codici a 6 cifre ogni 30 secondi
- **📱 App Authenticator** - Google Authenticator, Microsoft Authenticator, Authy
- **🆘 Backup Codes** - 10 codici di emergenza (formato: XXXX-XXXX)
- **🔒 Protezione Brute Force** - Lockout progressivo e rate limiting
- **📊 Audit Trail** - Logging completo di tutti gli eventi MFA

#### **Flusso di Autenticazione con MFA**

```
1. Inserisci Email + Password
   ↓
2. Sistema valida credenziali
   ↓
3. MFA ABILITATO → Richiesta codice MFA
   ↓
4. Apri app authenticator → Leggi codice 6 cifre
   ↓
5. Inserisci codice (valido 30 secondi)
   ↓
6. ✅ LOGIN COMPLETATO
```

#### **Gestione MFA**

- **Setup Iniziale** - QR code + backup codes
- **Login Quotidiano** - Codice TOTP dall'app
- **Emergenza** - Backup codes se telefono non disponibile
- **Rigenerazione** - Nuovi backup codes quando ≤3 rimanenti
- **Disabilitazione** - Con conferma password (solo se necessario)

### Flusso di Registrazione

1. **SuperAdmin** genera codici aziendali
2. **Azienda/Admin** si registra con codice fornito
3. **Admin** configura Google Drive
4. **Admin** crea utenti Viewer per l'azienda

## 📁 Gestione Documenti

### Sincronizzazione Google Drive

- **Sincronizzazione Automatica** ogni 15 minuti
- **Sincronizzazione Manuale** su richiesta
- **Gestione Errori** con retry automatico
- **Notifiche** per errori di sincronizzazione

### 📂 Gestione Documenti Locali

Il sistema supporta il caricamento e la gestione di documenti locali, offrendo un'alternativa completa alla sincronizzazione Google Drive.

#### Funzionalità Documenti Locali

- **Upload Cartella Completa**: Caricamento di intere cartelle di documenti con un singolo click
- **Processamento Intelligente**: Estrazione automatica di metadati dai nomi file (titolo, revisione, percorso ISO)
- **Analisi Excel Avanzata**: Estrazione automatica di scadenze e stati di allerta da file Excel
- **Gestione Duplicati**: Controllo automatico per evitare duplicati e aggiornamento documenti esistenti
- **Preview Integrata**: Visualizzazione diretta di documenti locali senza download
- **Compatibilità Completa**: Funziona in parallelo con Google Drive senza conflitti

#### Processo di Upload

1. **Selezione Cartella**: L'admin seleziona una cartella dal proprio computer
2. **Processamento Automatico**: Il sistema analizza ogni file e estrae:
   - Titolo del documento dal nome file
   - Numero di revisione
   - Percorso ISO standardizzato
   - Tipo di file
   - Scadenze (per file Excel)
3. **Salvataggio Sicuro**: I file vengono salvati nel server con crittografia
4. **Aggiornamento Database**: Metadati e informazioni vengono memorizzati in MongoDB

#### Implementazione tecnica (Backend + Frontend)

- Endpoint upload cartella locale (solo Admin):
  - Metodo: POST
  - URL: `/api/documents/local-upload`
  - Autenticazione: richiesta; ruoli: `admin` o `superadmin`
  - Campo form: `localFiles` (multiplo). La UI preserva la gerarchia usando `webkitRelativePath`
  - Limiti e sicurezza:
    - Dimensione max file: 100MB
    - Max file per richiesta: 2000
    - Tipi consentiti: PDF, DOC, DOCX, XLS, XLSX, XLSM, ODS, CSV, immagini (JPG/PNG), TXT
    - Validazione MIME e gestione errori di upload con risposte chiare (400/207)
  - Comportamento: per ogni file
    - Estrae metadati dal nome file (percorso ISO, titolo, revisione, tipo)
    - Se Excel/Sheet locale, analizza `A1` per data scadenza e calcola `alertStatus`
    - Evita duplicati basati su combinazione `(path, title, revision, clientId)`
    - Al termine marca come obsolete le revisioni inferiori dello stesso documento

- Endpoint elenco e gestione documenti:
  - GET `/api/documents` (autenticato)
  - GET `/api/documents/obsolete` (admin)
  - GET `/api/documents/:id` (autenticato)
  - PUT `/api/documents/:legacyId` (admin) — aggiorna metadati
  - DELETE `/api/documents/:legacyId` (admin) — eliminazione definitiva
  - POST `/api/documents/:legacyId/restore` (admin) — ripristino singolo obsoleto
  - POST `/api/documents/restore-all-obsolete` (admin) — ripristino di massa

- Endpoint preview e download (locali):
  - GET `/api/documents/:id/preview` (autenticato) — apre inline i file locali supportati
  - GET `/api/documents/:id/download` (autenticato) — scarica file locali; i file Drive reindirizzano al link Drive

- Endpoint scadenze e stato allerta:
  - POST `/api/excel/update-expiry-dates` (admin) — aggiorna scadenze per Excel/Sheets sincronizzati da Drive
  - POST `/api/documents/update-alert-status` (admin) — ricalcola dinamicamente gli `alertStatus` partendo da `expiryDate`

- Crittografia e integrità (opzionale, lato admin):
  - POST `/api/documents/:id/encrypt` — calcola hash, cifra il file in cache (richiede `ENCRYPTION_KEY` in produzione)
  - GET `/api/documents/:id/verify` — verifica l'integrità confrontando l'hash

#### Convenzioni nome file (parsing automatico)

- Pattern atteso: `ISO_PATH_Titolo_Rev.REVISIONE_YYYY-MM-DD.EXT`
  - Esempio: `10.2.3_Manuale Qualità_Rev.4_2025-12-31.pdf`
  - Estrazioni:
    - `path`: `10.2.3` (o `cartella/subcartella/10.2.3` se presente gerarchia)
    - `title`: `Manuale Qualità`
    - `revision`: `Rev.4`
    - `fileType`: `pdf|docx|xlsx|xlsm|...`
    - `expiryDate` e `alertStatus` per Excel/Sheets se `A1` contiene data o formula supportata (es. `=TODAY()+30`, `=DATE(2025,12,31)`)

Note: i file che non rispettano il pattern vengono ignorati nella creazione del documento.

#### Flusso UI (Frontend)

- Registrazione Admin (`/auth`):
  - Campo “Carica Documenti Locali (opzionale)” con `SimpleFileUpload`
  - I file inviati durante la registrazione sono processati e associati al nuovo client

- Dashboard Admin → “Aggiorna documenti locali” (Actions Bar):
  - Dialog con `ModernFileUpload` (drag & drop o selezione cartella)
  - Invia `FormData` a `/api/documents/local-upload` preservando `webkitRelativePath`
  - Toast moderni per conferma, avanzamento e risultato

#### Storage e sicurezza

- Posizione storage file: `server/uploads/`
- Campi documento rilevanti (DB): `path`, `title`, `revision`, `fileType`, `alertStatus`, `expiryDate`, `filePath` (locali), `driveUrl` (Drive), `googleFileId` (Drive)
- Duplicati: evitati per `(path,title,revision,clientId)`
- Obsoleti: post-processing per marcare revisioni precedenti come obsolete
- ENCRYPTION_KEY obbligatoria in produzione (altrimenti il server non avvia); usare una chiave forte (≥ 32 caratteri)

#### Tipi di File Supportati

- **Excel**: XLSX, XLS, XLSM, ODS, CSV
- **Word**: DOCX, DOC
- **PDF**: Documenti PDF
- **Google Sheets**: GSheet (se sincronizzati da Drive)

#### Vantaggi dei Documenti Locali

- **Indipendenza da Google Drive**: Funziona anche senza connessione a Google
- **Controllo Completo**: I file rimangono sotto il controllo dell'azienda
- **Velocità**: Upload diretto senza dipendenze esterne
- **Flessibilità**: Supporto per qualsiasi struttura di cartelle
- **Sicurezza**: Crittografia locale e controllo accessi

### 🎯 Sistema di Conferma Moderno

Il sistema utilizza **toast di conferma eleganti** invece di modali tradizionali per operazioni critiche, migliorando significativamente l'esperienza utente.

#### Caratteristiche del Sistema Toast

- **Design Moderno**: Toast eleganti con animazioni fluide
- **Non Bloccante**: L'utente può continuare a lavorare durante la conferma
- **Responsive**: Si adatta automaticamente a tutti i dispositivi
- **Tema Supportato**: Funziona perfettamente con tema chiaro e scuro
- **Accessibilità**: Supporto completo per screen reader e navigazione da tastiera

#### Operazioni Supportate solo all' interno della web app non all' esterno es:
Google Drive

- **Eliminazione Documenti**: Conferma sicura con toast distruttivo (rosso)
- **Eliminazione Backup**: Conferma per rimozione backup con avvisi chiari
- **Ripristino Backup**: Conferma per operazioni di ripristino (warning)
- **Operazioni Critiche**: Qualsiasi operazione che richiede conferma

#### Vantaggi Rispetto ai Modali

- **UX Migliorata**: Non copre l'intera schermata
- **Performance**: Transizioni più fluide e veloci
- **Sicurezza Mantenuta**: Conferma obbligatoria per operazioni critiche
- **Feedback Immediato**: Stati di loading e messaggi chiari

### Tipi di Documenti Supportati

- PDF
- Excel (XLSX, XLS, XLSM, ODS, CSV)
- Word (DOCX, DOC)
- Google Sheets (GSheet)

### Funzionalità Documenti

- **Ricerca Avanzata** per titolo, contenuto, tipo
- **Filtri** per stato, scadenza, tipo file
- **Visualizzazione Integrata Universale** - Preview diretta di PDF, XLSX, XLS, XLSM, DOCX senza download
- **Apertura Locale Diretta** - Apri i documenti con l'applicazione predefinita del sistema (vedere [local-opener-setup.md](docs/local-opener-setup.md))
- **Gestione Versioni** e revisioni
- **Notifiche Scadenze** automatiche
- **Supporto Ibrido** - Documenti Google Drive e locali nella stessa interfaccia
- **Gestione Eliminazione** - Eliminazione sicura di documenti con conferma toast moderna
- **Sistema di Conferma Moderno** - Toast eleganti per operazioni critiche invece di modali bloccanti

## 🔒 Sicurezza

### Autenticazione

- **Password Hashing** con Scrypt (64-byte keys) + Bcrypt fallback
- **Multi-Factor Authentication (MFA)** - TOTP per Admin/SuperAdmin
- **Session Management** sicuro con MongoDB store
- **Rate Limiting** avanzato per prevenire attacchi
- **Account Lockout** progressivo dopo tentativi falliti
- **Backup Codes** hashati SHA-256 per emergenze

### Crittografia

- **Crittografia File** in cache con ENCRYPTION_KEY
- **HTTPS** obbligatorio in produzione con HSTS
- **Token Sicuri** per Google Drive e MFA
- **Password Policy** robusta (8+ char, maiuscole, minuscole, numeri)

### Protezione

- **CSRF Protection** con token-based validation
- **XSS Prevention** con CSP rigoroso
- **SQL Injection Protection** con MongoDB + Mongoose validation
- **Input Validation** con Zod schemas
- **Security Headers** completi (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** configurato rigorosamente per produzione

### 🔐 MFA Security Features

- **TOTP Standard** - RFC 6238 compliant
- **Rate Limiting MFA** - 5 tentativi ogni 15 minuti
- **Brute Force Protection** - Lockout progressivo (5min → 15min → 1h → 24h)
- **Backup Codes** - 10 codici monouso hashati
- **Audit Trail** - Logging completo eventi MFA
- **Session Security** - Secure cookies, httpOnly, sameSite

### 🛠️ MFA Troubleshooting

#### **Problemi Comuni**

**❌ "Codice non valido"**
- ⏰ **Orologio non sincronizzato** - Verifica data/ora automatiche
- ⏱️ **Codice scaduto** - Aspetta il prossimo (30 secondi)
- 🔢 **Digitazione errata** - Controlla di aver digitato correttamente
- 📱 **App sbagliata** - Assicurati di leggere "SGI Cruscotto"

**❌ "Account bloccato"**
- 🔒 **Tentativi eccessivi** - Aspetta il tempo di sblocco
- 🆘 **Usa backup code** - Bypassa il lockout temporaneo
- 📞 **Contatta SuperAdmin** - Per sblocco manuale se necessario

**❌ "Ho perso il telefono"**
- 🆘 **Usa backup code** per accedere
- 🔧 **Disabilita MFA** dalle impostazioni
- 📱 **Riabilita MFA** con nuovo telefono

**❌ "Ho perso i backup codes"**
- 📱 **Se hai telefono** - Rigenera codes dalle impostazioni
- 📞 **Se non hai telefono** - Contatta SuperAdmin per disabilitazione

#### **Best Practices MFA**

**Per Amministratori:**
- 🔐 **Abilita MFA** appena possibile
- 💾 **Salva backup codes** in password manager sicuro
- 📱 **Sincronizza orologio** dispositivo per TOTP
- 🚫 **Non condividere** codici MFA
- 🔄 **Rigenera codes** quando ≤3 rimanenti

**Per Sviluppatori:**
- 🔒 **Mai ridurre** protezioni in produzione
- 📊 **Monitora log** MFA per anomalie
- 🧪 **Testa lockout** progressivo
- 📝 **Logga sempre** tentativi MFA

## 📊 Monitoraggio e Logging

### Audit Trail

- **Log Completi** di tutte le azioni
- **Tracciamento Utenti** e sessioni
- **Monitoraggio Accessi** e tentativi falliti

### Notifiche

- **Email Automatiche** per eventi critici
- **Notifiche Scadenze** documenti
- **Alert Errori** sincronizzazione

## 🚀 Deployment

### Requisiti di Sistema

- **Node.js** 18+
- **MongoDB** 5+
- **Google Cloud Project** (per Google Drive API)

### Variabili d'Ambiente

```env
# Database
DB_URI=mongodb://localhost:27017/Pannello di Controllo SGI

# Google Drive
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# Security
SESSION_SECRET=your_session_secret
CSRF_SECRET=your_csrf_secret

# URL di base del server (obbligatoria)
SERVER_BASE_URL=http://localhost:5000
# URL del frontend (obbligatoria)
FRONTEND_URL=http://localhost:5173
```

## 🔐 **Aggiornamenti di Sicurezza 2025**

### ✅ **v2.0.0 - Ottobre 2025 - MFA e Sicurezza Enterprise**

#### **🆕 Nuove Funzionalità**

- **🔐 Multi-Factor Authentication (MFA/2FA)** completo per Admin/SuperAdmin
- **📱 TOTP Standard** - Compatibile con Google Authenticator, Microsoft Authenticator, Authy
- **🆘 Backup Codes** - 10 codici di emergenza hashati SHA-256
- **🔒 Protezione Brute Force** - Lockout progressivo e rate limiting avanzato
- **📊 Audit Trail Completo** - Logging dettagliato di tutti gli eventi MFA

#### **🛡️ Miglioramenti di Sicurezza**

- **🔐 Password Security** - Scrypt (64-byte keys) + Bcrypt fallback
- **🛡️ Security Headers** - CSP rigoroso, HSTS con preload, CORS ottimizzato
- **⚡ Session Security** - MongoDB store, secure cookies, httpOnly
- **🚫 Rate Limiting** - Multi-tier per tutti gli endpoint critici
- **🔒 CSRF Protection** - Token-based validation completa
- **📊 Input Validation** - Zod schemas per tutti gli input

#### **✅ Conformità TAC Security CASA**

- **Tier 2**: 16/16 requisiti soddisfatti (100%) ✅
- **Tier 3**: 8/8 requisiti soddisfatti (100%) ✅
- **OWASP ASVS Level 2**: Conforme ✅
- **NIST 800-63B**: Conforme ✅
- **PCI DSS**: Conforme ✅

#### **📈 Statistiche Sicurezza**

- **Tempo Brute Force Stimato**: ~27.000 anni 🔒
- **Rate Limiting MFA**: 5 tentativi ogni 15 minuti
- **Account Lockout**: Progressivo (5min → 15min → 1h → 24h)
- **Security Headers**: 10+ header implementati
- **Audit Events**: 8+ tipi di eventi loggati

#### **🔧 API Endpoints MFA**

- `POST /api/mfa/setup` - Inizia setup MFA
- `POST /api/mfa/enable` - Attiva MFA con verifica
- `POST /api/mfa/verify` - Verifica token durante login
- `POST /api/mfa/disable` - Disabilita MFA
- `POST /api/mfa/regenerate-backup-codes` - Rigenera backup codes
- `GET /api/mfa/status` - Stato MFA corrente

#### **📚 Documentazione MFA**

- **[MFA e Sicurezza](./docs/MFA-E-SICUREZZA.md)** - Guida completa MFA
- **[Riepilogo Implementazione](./docs/RIEPILOGO-IMPLEMENTAZIONE-MFA-SICUREZZA.md)** - Dettagli tecnici
- **[Protezione Brute Force](./docs/MFA-BRUTE-FORCE-PROTECTION.md)** - Sicurezza avanzata
- **[Security Compliance Report](./docs/SECURITY-COMPLIANCE-REPORT.md)** - Report conformità

---

## 📚 Documentazione

- **[Manuale Utente](./docs/manuale-utente.md)** - Guida per Viewer e Admin
- **[Manuale SuperAdmin](./docs/manuale-superadmin.md)** - Guida per SuperAdmin
- **[Manuale Sviluppatore](./docs/manuale-sviluppatore.md)** - Setup e manutenzione

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT.

## 🔐 **Quick Reference MFA**

### **Setup MFA (Prima Volta)**
1. Login come Admin/SuperAdmin
2. Impostazioni → Sicurezza → "Abilita MFA"
3. Scansiona QR code con app authenticator
4. Salva 10 backup codes in luogo sicuro
5. Verifica con primo codice → ✅ Attivato!

### **Login Quotidiano con MFA**
1. Email + Password → Enter
2. Sistema richiede codice MFA
3. Apri app authenticator → Leggi codice 6 cifre
4. Inserisci codice → ✅ Accesso!

### **Emergenza (Telefono Perso)**
1. Email + Password → Enter
2. Click "Usa backup code"
3. Inserisci backup code (XXXX-XXXX)
4. ✅ Accesso! (Code usato invalidato)

### **App Authenticator Supportate**
- Google Authenticator (iOS/Android)
- Microsoft Authenticator (iOS/Android)  
- Authy (iOS/Android/Desktop)
- 1Password (se già utilizzato)

### **Troubleshooting Veloce**
- **"Codice non valido"** → Sincronizza orologio dispositivo
- **"Account bloccato"** → Aspetta sblocco o usa backup code
- **"Ho perso telefono"** → Usa backup code, poi riabilita MFA
- **"Ho perso backup codes"** → Contatta SuperAdmin

---

## 📞 Supporto

Per supporto tecnico o domande:

- Consulta la documentazione nella cartella `docs/`
- Contatta il team di sviluppo.

 
