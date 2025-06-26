# DocumentiIso - Sistema di Gestione Documentale

## 📋 Panoramica del Progetto

**DocumentiIso** è un sistema completo di gestione documentale progettato per aziende che necessitano di organizzare, sincronizzare e gestire documenti in modo sicuro e efficiente. Il sistema integra Google Drive per la sincronizzazione automatica dei documenti e offre un'interfaccia web moderna per la gestione e la consultazione.

### 🎯 Obiettivi Principali

- **Sincronizzazione Automatica** con Google Drive
- **Gestione Multi-utente** con ruoli differenziati (Viewer, Admin, SuperAdmin)
- **Sicurezza Avanzata** con crittografia e autenticazione robusta
- **Interfaccia Moderna** e responsive
- **Notifiche Automatiche** per scadenze documentali
- **Audit Trail** completo delle attività

## 🚀 Setup Iniziale del Sistema

### Prerequisiti

- **Node.js** 18+ installato
- **MongoDB** 5+ installato e in esecuzione
- **Google Cloud Project** configurato con Google Drive API

### Passo 1: Installazione

```bash
# Clona il repository
git clone <repository-url>
cd DocumentiIso-main

# Installa le dipendenze
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### Passo 2: Configurazione Variabili d'Ambiente

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

### Tipi di Documenti Supportati

- PDF
- Excel (XLSX, XLS)
- Word (DOCX, DOC)

### Funzionalità Documenti

- **Ricerca Avanzata** per titolo, contenuto, tipo
- **Filtri** per stato, scadenza, tipo file
- **Anteprima** documenti
- **Gestione Versioni** e revisioni
- **Notifiche Scadenze** automatiche

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
