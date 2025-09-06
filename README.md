# 🎯 SGI Cruscotto - Sistema di Gestione Documentale

## 📖 Benvenuto in SGI Cruscotto

**SGI Cruscotto** è il sistema di gestione documentale che trasforma la gestione dei documenti aziendali da "complessa e lenta" a "semplice e veloce". Integra Google Drive per la sincronizzazione automatica e offre un'interfaccia web moderna per la gestione completa dei documenti.

### 🚀 **Per Iniziare Subito**
👉 **[Vai alla Guida Cliente](README-CLIENTE.md)** - Setup rapido e istruzioni complete

### 🎯 Funzionalità Principali

- **📁 Organizzazione Perfetta** dei documenti aziendali
- **⚡ Apertura Istantanea** senza download (Local Opener)
- **🔄 Sincronizzazione Automatica** con Google Drive
- **🔍 Ricerca Potente** e filtri avanzati
- **👥 Gestione Team** con ruoli differenziati
- **💾 Backup Automatici** e sicurezza totale
- **📧 Notifiche Intelligenti** per scadenze

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
DB_URI=mongodb://localhost:27017/documentiiso

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

### Passo 3: Creazione del Primo SuperAdmin

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

**Opzione A: Google Drive (Raccomandato)**
- Configura l'URL della cartella Google Drive durante la registrazione
- Sincronizzazione automatica ogni 15 minuti
- Backup automatico su Google Drive

**Opzione B: Documenti Locali**
- Carica cartelle di documenti direttamente dal computer
- Processamento automatico dei metadati
- Controllo completo sui file
- Funziona offline

**Opzione C: Modalità Ibrida**
- Combina entrambe le modalità
- Documenti Google Drive e locali nella stessa interfaccia
- Massima flessibilità per l'azienda

Per utilizzare i documenti locali:
1. Durante la registrazione, seleziona "Carica Cartella Locale" invece di inserire l'URL Google Drive
2. Oppure, dopo la registrazione, usa il pulsante "Aggiorna documenti locali" nella dashboard admin
3. Seleziona una cartella contenente i documenti da caricare
4. Il sistema processerà automaticamente tutti i file

### 🔧 Tools di Amministrazione

Il sistema include strumenti per la gestione amministrativa:

- **`create-superadmin.js`** - Crea il primo SuperAdmin
- **`create-company-code.js`** - Crea codici aziendali singoli
- **`check-company-codes.js`** - Verifica codici esistenti

Per maggiori dettagli sui tool, consulta [tools/README.md](./tools/README.md).

## 🏗️ Architettura del Sistema

Il progetto è strutturato come un'applicazione **full-stack** con architettura client-server:

```
DocumentiIso/
├── client/          # Frontend React + TypeScript
├── server/          # Backend Node.js + Express
├── shared-types/    # Tipi TypeScript condivisi
├── docs/           # Documentazione
└── tools/          # Script di utilità
```

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
- **Storage Manager**: Gestisce file locali e Drive in modo unificato
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

2. **Admin** - Amministratore aziendale

   - Tutte le funzioni Viewer
   - Gestione utenti aziendali
   - Configurazione Google Drive
   - **Gestione Documenti Locali** (upload cartelle, aggiornamento documenti)
   - **Gestione Eliminazione Documenti** (eliminazione sicura con conferma)
   - Gestione documenti
   - Visualizzazione audit logs

3. **SuperAdmin** - Amministratore di sistema
   - Tutte le funzioni Admin
   - Gestione codici aziendali
   - Gestione globale utenti
   - Accesso completo audit logs
   - Configurazione sistema

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
    - Tipi consentiti: PDF, DOC, DOCX, XLS, XLSX, ODS, CSV, immagini (JPG/PNG), TXT
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
  - Esempio: `10.2.3_Manuale Qualità_Rev.4_2024-12-31.pdf`
  - Estrazioni:
    - `path`: `10.2.3` (o `cartella/subcartella/10.2.3` se presente gerarchia)
    - `title`: `Manuale Qualità`
    - `revision`: `Rev.4`
    - `fileType`: `pdf|docx|xlsx|...`
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

- **Excel**: XLSX, XLS, ODS, CSV
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

#### Operazioni Supportate

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
- Excel (XLSX, XLS, ODS, CSV)
- Word (DOCX, DOC)
- Google Sheets (GSheet)

### Funzionalità Documenti

- **Ricerca Avanzata** per titolo, contenuto, tipo
- **Filtri** per stato, scadenza, tipo file
- **Visualizzazione Integrata Universale** - Preview diretta di PDF, XLSX, XLS, DOCX senza download
- **Apertura Locale Diretta** - Apri i documenti con l'applicazione predefinita del sistema (vedere [local-opener-setup.md](docs/local-opener-setup.md))
- **Gestione Versioni** e revisioni
- **Notifiche Scadenze** automatiche
- **Supporto Ibrido** - Documenti Google Drive e locali nella stessa interfaccia
- **Gestione Eliminazione** - Eliminazione sicura di documenti con conferma toast moderna
- **Sistema di Conferma Moderno** - Toast eleganti per operazioni critiche invece di modali bloccanti

## 🔒 Sicurezza

### Autenticazione

- **Password Hashing** con bcrypt
- **Session Management** sicuro
- **Rate Limiting** per prevenire attacchi
- **Lockout Account** dopo tentativi falliti

### Crittografia

- **Crittografia File** in cache
- **HTTPS** obbligatorio in produzione
- **Token Sicuri** per Google Drive

### Protezione

- **CSRF Protection**
- **XSS Prevention**
- **SQL Injection Protection**
- **Input Validation** con Zod

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
DB_URI=mongodb://localhost:27017/documentiiso

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

## 📞 Supporto

Per supporto tecnico o domande:

- Consulta la documentazione nella cartella `docs/`
- Contatta il team di sviluppo

---

**DocumentiIso** - Gestione documentale intelligente e sicura

## 🆕 Funzionalità Recenti

### Sistema di Conferma Moderno
- **Toast di Conferma**: Sostituzione modali con toast eleganti per operazioni critiche
- **Eliminazione Sicura**: Gestione eliminazione documenti con conferma moderna
- **UX Migliorata**: Interfaccia non bloccante e responsive

### Gestione Documenti Locali
- **Upload Cartelle**: Caricamento completo di cartelle di documenti
- **Processamento Intelligente**: Estrazione automatica metadati
- **Analisi Excel**: Estrazione scadenze da file Excel
- **Modalità Ibrida**: Supporto simultaneo Google Drive e documenti locali

### Sicurezza Avanzata
- **Conferme Obbligatorie**: Per tutte le operazioni critiche
- **Crittografia File**: Protezione documenti locali
- **Audit Trail**: Tracciamento completo delle operazioni
- **Controllo Accessi**: Gestione permessi granulare
