# Manuale Sviluppatore - DocumentiIso

## 📖 Indice

1. [Introduzione](#introduzione)
2. [Requisiti di Sistema](#requisiti-di-sistema)
3. [Setup Iniziale](#setup-iniziale)
4. [Configurazione Ambiente](#configurazione-ambiente)
5. [Avvio del Progetto](#avvio-del-progetto)
6. [Struttura del Codice](#struttura-del-codice)
7. [Sviluppo e Debug](#sviluppo-e-debug)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Manutenzione](#manutenzione)
11. [Sistema Backup e Notifiche](#sistema-backup-e-notifiche)

---

## 🎯 Introduzione

Questo manuale è destinato agli sviluppatori che lavorano sul progetto **DocumentiIso**. Fornisce tutte le informazioni necessarie per configurare l'ambiente di sviluppo, comprendere l'architettura del progetto e contribuire al suo sviluppo.

### Tecnologie Utilizzate

#### Frontend
- **React 19** - Framework UI
- **TypeScript** - Tipizzazione statica
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **Radix UI** - Componenti UI
- **React Query** - Gestione stato server
- **Wouter** - Routing

#### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipizzazione statica
- **MongoDB** - Database NoSQL
- **Mongoose** - ODM per MongoDB
- **Passport.js** - Autenticazione
- **Google APIs** - Integrazione Google Drive

---

## 💻 Requisiti di Sistema

### Software Richiesto

#### Node.js
```bash
# Versione minima: 18.x
node --version  # Deve essere >= 18.0.0
npm --version   # Deve essere >= 8.0.0
```

#### MongoDB
```bash
# Versione minima: 5.x
mongod --version  # Deve essere >= 5.0.0
```

#### Git
```bash
git --version  # Deve essere >= 2.0.0
```

### Strumenti Consigliati

#### Editor/IDE
- **VS Code** (consigliato)
  - Estensioni consigliate:
    - TypeScript and JavaScript Language Features
    - Tailwind CSS IntelliSense
    - MongoDB for VS Code
    - GitLens
    - Prettier - Code formatter

#### Browser
- **Chrome** o **Firefox** (per sviluppo)
- **DevTools** abilitati

#### Strumenti CLI
- **curl** o **Postman** (per test API)
- **MongoDB Compass** (GUI per MongoDB)

---

## 🚀 Setup Iniziale

### Clonazione Repository

```bash
# Clona il repository
git clone https://github.com/your-org/documentiiso.git
cd documentiiso

# Verifica la struttura del progetto
ls -la
```

### Struttura del Progetto

```
DocumentiIso/
├── client/              # Frontend React
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/              # Backend Node.js
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared-types/        # Tipi TypeScript condivisi
├── docs/               # Documentazione
├── tools/              # Script di utilità
├── package.json        # Root package.json
└── README.md
```

### Installazione Dipendenze

#### Root Dependencies
```bash
# Installa dipendenze root
npm install
```

#### Client Dependencies
```bash
# Installa dipendenze frontend
cd client
npm install
cd ..
```

#### Server Dependencies
```bash
# Installa dipendenze backend
cd server
npm install
cd ..
```

### Verifica Installazione

```bash
# Verifica che tutto sia installato correttamente
npm run check          # TypeScript check
cd client && npm run build  # Build frontend
cd ../server && npm run check  # TypeScript check backend
```

---

## ⚙️ Configurazione Ambiente

### Variabili d'Ambiente

#### File .env (Development)
Crea il file `.env` nella root del progetto:

```env
# Database
DB_URI=mongodb://localhost:27017/documentiiso_dev

# Google Drive API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Security
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here

# URL Applicazione (OBBLIGATORIE)
SERVER_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
PORT=5000
```

#### File .env.production
Per l'ambiente di produzione:

```env
# Database
DB_URI=mongodb://your_production_db_uri

# Google Drive API
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_production_email
SMTP_PASSWORD=your_production_password

# Security
SESSION_SECRET=your_production_session_secret
CSRF_SECRET=your_production_csrf_secret

# URL Applicazione (OBBLIGATORIE)
SERVER_BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Environment
NODE_ENV=production
PORT=5000
```

### Configurazione Google Drive API

#### 1. Google Cloud Console
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita le API necessarie:
   - Google Drive API
   - Google+ API

#### 2. Credenziali OAuth
1. Vai su "Credentials"
2. Crea "OAuth 2.0 Client IDs"
3. Configura:
   - **Application type**: Web application
   - **Authorized redirect URIs**:
     - `http://localhost:5000/auth/google/callback` (dev)
     - `https://yourdomain.com/auth/google/callback` (prod)

#### 3. Download Credenziali
1. Scarica il file JSON delle credenziali
2. Estrai `client_id` e `client_secret`
3. Aggiungi al file `.env`

### Configurazione MongoDB

#### MongoDB Locale
```bash
# Avvia MongoDB (se installato localmente)
mongod --dbpath /path/to/data/db

# Oppure usa Docker
docker run -d -p 27017:27017 --name mongodb mongo:5
```

#### MongoDB Atlas (Cloud)
1. Crea un account su [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea un nuovo cluster
3. Configura l'accesso:
   - Crea un utente database
   - Configura IP whitelist
4. Ottieni la connection string
5. Aggiungi al `DB_URI` nel file `.env`

---

## 🏃‍♂️ Avvio del Progetto

### Modalità Sviluppo

#### 1. Avvio Database
```bash
# Se usi MongoDB locale
mongod

# Se usi Docker
docker start mongodb

# Se usi MongoDB Atlas, non serve nulla
```

#### 2. Avvio Backend
```bash
# Dalla root del progetto
npm run dev

# Oppure dalla cartella server
cd server
npm run dev
```

Il server sarà disponibile su: `http://localhost:5000`

#### 3. Avvio Frontend
```bash
# In un nuovo terminale, dalla cartella client
cd client
npm run dev
```

Il client sarà disponibile su: `http://localhost:5173`

### Modalità Produzione

#### Build e Avvio
```bash
# Build completo
npm run build

# Avvio produzione
npm start
```

### Script Disponibili

#### Root Scripts
```bash
npm run dev          # Avvia server in development
npm run build        # Build completo
npm run start        # Avvia in produzione
npm run check        # TypeScript check
```

#### Client Scripts
```bash
cd client
npm run dev          # Avvia dev server
npm run build        # Build per produzione
npm run preview      # Preview build
npm run test         # Esegui test
```

#### Server Scripts
```bash
cd server
npm run dev          # Avvia con tsx
npm run build        # Build con esbuild
npm run start        # Avvia in produzione
npm run test         # Esegui test
npm run check-env    # Verifica variabili ambiente
```

---

## 🏗️ Struttura del Codice

### Frontend (Client)

#### Struttura Cartelle
```
client/src/
├── components/       # Componenti React
│   ├── ui/          # Componenti UI base
│   └── ...          # Componenti specifici
├── hooks/           # Custom hooks
├── lib/             # Utility e configurazioni
├── pages/           # Pagine dell'applicazione
├── App.tsx          # Componente principale
├── main.tsx         # Entry point
└── index.css        # Stili globali
```

#### Componenti Principali
- **App.tsx**: Routing e layout principale
- **components/**: Componenti riutilizzabili
- **pages/**: Pagine dell'applicazione
- **hooks/**: Custom hooks per logica di business

#### Gestione Stato
- **React Query**: Per stato server
- **useState/useReducer**: Per stato locale
- **Context API**: Per stato globale (auth, theme)

### Backend (Server)

#### Struttura Cartelle
```
server/
├── src/             # Codice sorgente
├── models/          # Modelli Mongoose
├── routes/          # Route handlers
├── middleware/      # Middleware Express
├── services/        # Business logic
├── utils/           # Utility functions
├── index.ts         # Entry point
└── tsconfig.json    # Configurazione TypeScript
```

#### Moduli Principali
- **index.ts**: Setup server Express
- **routes.ts**: Definizione API routes
- **auth.ts**: Autenticazione e autorizzazione
- **google-drive.ts**: Integrazione Google Drive
- **storage.ts**: Layer di accesso ai dati

#### Architettura
- **Controller Pattern**: Separazione logica
- **Service Layer**: Business logic isolata
- **Repository Pattern**: Accesso ai dati
- **Middleware**: Autenticazione, logging, error handling

### Shared Types

#### Tipi Condivisi
```typescript
// shared-types/
├── client.ts        # Tipi per client
├── companycode.ts   # Tipi per codici aziendali
├── schema.ts        # Schema principali
└── validators.ts    # Validatori Zod
```

---

## 🐛 Sviluppo e Debug

### Debug Frontend

#### React DevTools
1. Installa l'estensione React DevTools
2. Apri DevTools nel browser
3. Usa i tab "Components" e "Profiler"

#### Console Debug
```typescript
// Debug componenti
console.log('Component state:', state);

// Debug props
console.log('Component props:', props);

// Debug API calls
console.log('API response:', data);
```

#### Vite DevTools
- Hot Module Replacement (HMR)
- Error overlay
- Source maps per debugging

### Debug Backend

#### Logging
```typescript
// Usa il logger configurato
import logger from './logger';

logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { context: 'additional data' });
```

#### Debug Express
```typescript
// Middleware per logging richieste
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

#### Debug MongoDB
```typescript
// Abilita debug Mongoose
mongoose.set('debug', true);
```

### Strumenti di Debug

#### VS Code Debug
1. Crea `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "runtimeArgs": ["-r", "tsx/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

#### Chrome DevTools
- Network tab per debug API
- Application tab per debug storage
- Sources tab per debug JavaScript

---

## 🧪 Testing

### Test Frontend

#### Jest + React Testing Library
```bash
# Esegui test
cd client
npm test

# Test in watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

#### Esempio Test
```typescript
// __tests__/component.test.tsx
import { render, screen } from '@testing-library/react';
import { Component } from '../Component';

test('renders component', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Test Backend

#### Vitest
```bash
# Esegui test
cd server
npm test

# Test in watch mode
npm run test:watch
```

#### Esempio Test
```typescript
// __tests__/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { authenticateUser } from '../auth';

describe('Authentication', () => {
  it('should authenticate valid user', async () => {
    const result = await authenticateUser('user@example.com', 'password');
    expect(result.success).toBe(true);
  });
});
```

### Test di Integrazione

#### API Testing
```bash
# Usa curl per testare API
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### E2E Testing
```bash
# Installa Playwright
npm install -D @playwright/test

# Esegui test E2E
npx playwright test
```

---

## 🚀 Deployment

### Preparazione Produzione

#### Build
```bash
# Build frontend
cd client
npm run build

# Build backend
cd ../server
npm run build
```

#### Variabili Ambiente
1. Configura `.env.production`
2. Verifica tutte le variabili
3. Testa in ambiente staging

### Deployment Options

#### Vercel (Frontend)
```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Railway (Full Stack)
```bash
# Installa Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

#### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
# Build e run
docker build -t documentiiso .
docker run -p 5000:5000 documentiiso
```

### CI/CD

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      # Deploy steps...
```

---

## 🔧 Manutenzione

### Monitoraggio

#### Logs
```bash
# Visualizza log applicazione
tail -f logs/app.log

# Log errori
tail -f logs/error.log

# Log accessi
tail -f logs/access.log
```

#### Performance
```bash
# Monitora CPU/Memoria
htop

# Monitora database
mongosh --eval "db.stats()"

# Monitora rete
netstat -tulpn
```

### Backup

#### Database Backup
```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/documentiiso" --out=./backup

# Restore
mongorestore --uri="mongodb://localhost:27017/documentiiso" ./backup
```

#### File Backup
```bash
# Backup configurazioni
tar -czf config-backup.tar.gz .env* server/config/

# Backup uploads
tar -czf uploads-backup.tar.gz server/uploads/
```

### Aggiornamenti

#### Dipendenze
```bash
# Check aggiornamenti
npm outdated

# Update dipendenze
npm update

# Update major versions
npx npm-check-updates -u
npm install
```

#### Database Migrations
```typescript
// Esempio migration
export async function migrateDatabase() {
  // Aggiungi nuovi campi
  await UserModel.updateMany({}, { $set: { newField: 'default' } });
  
  // Crea nuovi indici
  await UserModel.createIndex({ email: 1 });
}
```

### Troubleshooting

#### Problemi Comuni

**Server non si avvia**
```bash
# Verifica porte
lsof -i :5000
lsof -i :5173

# Verifica variabili ambiente
npm run check-env

# Verifica database
mongosh --eval "db.adminCommand('ping')"
```

**Build fallisce**
```bash
# Pulisci cache
npm run clean
rm -rf node_modules
npm install

# Verifica TypeScript
npm run check
```

**Test falliscono**
```bash
# Verifica ambiente test
npm run test:setup

# Debug test specifici
npm test -- --verbose
```

### Performance

#### Ottimizzazioni Frontend
```typescript
// Lazy loading componenti
const LazyComponent = lazy(() => import('./Component'));

// Memoization
const MemoizedComponent = memo(Component);

// Code splitting
const routes = [
  {
    path: '/admin',
    component: lazy(() => import('./pages/AdminPage'))
  }
];
```

#### Ottimizzazioni Backend
```typescript
// Caching
import { cache } from './cache';

const cachedData = await cache.get('key', async () => {
  return await expensiveOperation();
});

// Database indexing
await UserModel.createIndex({ email: 1 });
await DocumentModel.createIndex({ clientId: 1, createdAt: -1 });
```

---

## 🔄 Sistema Backup e Notifiche

### Architettura del Sistema

#### Componenti Principali
- **Backup Service**: Gestione backup database
- **Notification Service**: Sistema notifiche email
- **Scheduler**: Orchestrazione operazioni automatiche
- **Template Engine**: Generazione email personalizzate

#### Flusso Dati
```
Scheduler → Backup Service → Database
Scheduler → Notification Service → SMTP → Email
```

### API Endpoints

#### Backup Endpoints

##### GET /api/backup
```typescript
// Lista backup disponibili
interface BackupListResponse {
  backups: Backup[];
  total: number;
  stats: {
    totalSize: number;
    oldestBackup: Date;
    newestBackup: Date;
  };
}

interface Backup {
  id: string;
  name: string;
  description?: string;
  type: 'complete' | 'documents' | 'users' | 'config';
  companyId?: string; // Solo per admin
  size: number;
  createdAt: Date;
  status: 'completed' | 'failed' | 'in_progress';
}
```

##### POST /api/backup
```typescript
// Crea nuovo backup
interface CreateBackupRequest {
  name: string;
  description?: string;
  type: 'complete' | 'documents' | 'users' | 'config';
  companyId?: string; // Solo per admin
  encryption?: boolean;
  compression?: boolean;
}

interface CreateBackupResponse {
  backupId: string;
  status: 'started' | 'failed';
  estimatedTime?: number;
}
```

##### GET /api/backup/:id
```typescript
// Dettagli backup specifico
interface BackupDetailsResponse {
  backup: Backup;
  metadata: {
    documentCount: number;
    userCount: number;
    companyCount: number;
    integrity: 'valid' | 'invalid' | 'unknown';
  };
}
```

##### GET /api/backup/:id/download
```typescript
// Download backup file
// Response: File stream con Content-Type: application/json
// Headers: Content-Disposition: attachment; filename="backup_YYYY-MM-DD.json"
```

##### POST /api/backup/:id/restore
```typescript
// Ripristina da backup
interface RestoreBackupRequest {
  password: string; // Conferma password
  options?: {
    skipUsers?: boolean;
    skipDocuments?: boolean;
    skipConfig?: boolean;
  };
}

interface RestoreBackupResponse {
  status: 'started' | 'failed';
  estimatedTime?: number;
}
```

##### DELETE /api/backup/:id
```typescript
// Elimina backup
interface DeleteBackupResponse {
  status: 'deleted' | 'failed';
  freedSpace: number;
}
```

#### Notification Endpoints

##### GET /api/notifications/config
```typescript
// Configurazione notifiche
interface NotificationConfigResponse {
  global: {
    enabled: boolean;
    smtp: SMTPConfig;
    templates: EmailTemplate[];
    thresholds: NotificationThresholds;
    recipients: NotificationRecipients;
  };
  company?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    recipients: string[];
    exclusions: string[];
  };
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

interface NotificationThresholds {
  early: number; // 30 giorni
  warning: number; // 7 giorni
  urgent: number; // 1 giorno
  expired: boolean; // true per documenti scaduti
}
```

##### PUT /api/notifications/config
```typescript
// Aggiorna configurazione notifiche
interface UpdateNotificationConfigRequest {
  global?: Partial<NotificationConfigResponse['global']>;
  company?: Partial<NotificationConfigResponse['company']>;
}
```

##### POST /api/notifications/test
```typescript
// Test invio notifica
interface TestNotificationRequest {
  recipient: string;
  template: string;
  variables?: Record<string, any>;
}

interface TestNotificationResponse {
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
}
```

##### GET /api/notifications/stats
```typescript
// Statistiche notifiche
interface NotificationStatsResponse {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  byType: {
    documentExpiry: number;
    backup: number;
    system: number;
  };
  byDate: {
    date: string;
    sent: number;
    failed: number;
  }[];
}
```

### Database Schemas

#### Backup Schema
```typescript
interface BackupDocument {
  _id: ObjectId;
  name: string;
  description?: string;
  type: 'complete' | 'documents' | 'users' | 'config';
  companyId?: ObjectId; // Solo per admin
  userId: ObjectId; // Chi ha creato il backup
  size: number;
  path: string; // Percorso file backup
  metadata: {
    documentCount: number;
    userCount: number;
    companyCount: number;
    version: string;
    checksum: string;
  };
  status: 'completed' | 'failed' | 'in_progress';
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date; // Per retention policy
}
```

#### Notification Schema
```typescript
interface NotificationDocument {
  _id: ObjectId;
  type: 'document_expiry' | 'backup' | 'system' | 'security';
  recipient: string;
  subject: string;
  content: string;
  template: string;
  variables: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'opened';
  sentAt?: Date;
  openedAt?: Date;
  error?: string;
  retryCount: number;
  companyId?: ObjectId;
  userId?: ObjectId;
  createdAt: Date;
}
```

#### NotificationConfig Schema
```typescript
interface NotificationConfigDocument {
  _id: ObjectId;
  scope: 'global' | 'company';
  companyId?: ObjectId;
  enabled: boolean;
  smtp?: SMTPConfig;
  templates: EmailTemplate[];
  thresholds: NotificationThresholds;
  recipients: NotificationRecipients;
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    time: string; // HH:mm
    timezone: string;
    daysOfWeek?: number[]; // Per weekly
  };
  exclusions: {
    documentTypes: string[];
    companies: ObjectId[];
    users: ObjectId[];
  };
  updatedAt: Date;
  updatedBy: ObjectId;
}
```

### Implementazione Servizi

#### Backup Service
```typescript
class BackupService {
  // Crea backup
  async createBackup(options: CreateBackupOptions): Promise<BackupResult> {
    const backup = new Backup({
      name: options.name,
      type: options.type,
      companyId: options.companyId,
      userId: options.userId,
      status: 'in_progress'
    });

    try {
      // Backup basato sul tipo
      const data = await this.extractData(options.type, options.companyId);
      
      // Compressione se richiesta
      if (options.compression) {
        data = await this.compressData(data);
      }
      
      // Crittografia se richiesta
      if (options.encryption) {
        data = await this.encryptData(data, options.encryptionKey);
      }
      
      // Salva file
      const path = await this.saveBackupFile(data, backup.id);
      
      // Aggiorna backup
      backup.path = path;
      backup.size = data.length;
      backup.status = 'completed';
      backup.completedAt = new Date();
      backup.metadata = await this.generateMetadata(data);
      
      await backup.save();
      
      return { success: true, backupId: backup.id };
    } catch (error) {
      backup.status = 'failed';
      backup.error = error.message;
      await backup.save();
      
      throw error;
    }
  }

  // Ripristina backup
  async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult> {
    const backup = await Backup.findById(backupId);
    if (!backup) throw new Error('Backup non trovato');
    
    // Verifica integrità
    const isValid = await this.verifyBackupIntegrity(backup);
    if (!isValid) throw new Error('Backup corrotto');
    
    // Backup automatico prima del ripristino
    await this.createBackup({
      name: `pre_restore_${new Date().toISOString()}`,
      type: 'complete',
      userId: options.userId
    });
    
    // Ripristina dati
    const data = await this.loadBackupFile(backup.path);
    
    if (backup.encrypted) {
      data = await this.decryptData(data, options.encryptionKey);
    }
    
    if (backup.compressed) {
      data = await this.decompressData(data);
    }
    
    await this.restoreData(data, options);
    
    return { success: true };
  }

  private async extractData(type: string, companyId?: string): Promise<any> {
    switch (type) {
      case 'complete':
        return await this.extractAllData();
      case 'documents':
        return await this.extractDocuments(companyId);
      case 'users':
        return await this.extractUsers(companyId);
      case 'config':
        return await this.extractConfig();
      default:
        throw new Error('Tipo backup non supportato');
    }
  }
}
```

#### Notification Service
```typescript
class NotificationService {
  // Invia notifica scadenze documenti
  async sendDocumentExpiryNotifications(): Promise<void> {
    const config = await this.getNotificationConfig();
    if (!config.global.enabled) return;
    
    // Trova documenti in scadenza
    const expiringDocuments = await this.findExpiringDocuments(config.thresholds);
    
    // Raggruppa per azienda
    const documentsByCompany = this.groupDocumentsByCompany(expiringDocuments);
    
    // Invia notifiche per ogni azienda
    for (const [companyId, documents] of documentsByCompany) {
      const companyConfig = await this.getCompanyNotificationConfig(companyId);
      if (!companyConfig?.enabled) continue;
      
      const admins = await this.getCompanyAdmins(companyId);
      
      for (const admin of admins) {
        await this.sendNotification({
          type: 'document_expiry',
          recipient: admin.email,
          template: 'document_expiry',
          variables: {
            adminName: admin.name,
            companyName: admin.company.name,
            documents: documents,
            thresholds: config.thresholds
          },
          companyId: companyId
        });
      }
    }
  }

  // Invia notifica
  async sendNotification(options: SendNotificationOptions): Promise<void> {
    const notification = new Notification({
      type: options.type,
      recipient: options.recipient,
      template: options.template,
      variables: options.variables,
      companyId: options.companyId,
      userId: options.userId,
      status: 'pending'
    });
    
    try {
      // Genera email
      const email = await this.generateEmail(options);
      
      // Invia email
      const result = await this.sendEmail(email);
      
      // Aggiorna notifica
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.messageId = result.messageId;
      
      await notification.save();
    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      notification.retryCount += 1;
      
      await notification.save();
      
      // Retry automatico
      if (notification.retryCount < 3) {
        await this.scheduleRetry(notification);
      }
    }
  }

  private async generateEmail(options: SendNotificationOptions): Promise<EmailMessage> {
    const template = await this.getTemplate(options.template);
    const config = await this.getNotificationConfig();
    
    // Sostituisci variabili
    let subject = template.subject;
    let html = template.html;
    
    for (const [key, value] of Object.entries(options.variables || {})) {
      const placeholder = `{${key}}`;
      subject = subject.replace(placeholder, value);
      html = html.replace(placeholder, value);
    }
    
    return {
      to: options.recipient,
      subject: subject,
      html: html,
      from: config.global.smtp.auth.user
    };
  }

  private async sendEmail(email: EmailMessage): Promise<SendResult> {
    const config = await this.getNotificationConfig();
    
    const transporter = nodemailer.createTransporter({
      host: config.global.smtp.host,
      port: config.global.smtp.port,
      secure: config.global.smtp.secure,
      auth: config.global.smtp.auth
    });
    
    return await transporter.sendMail(email);
  }
}
```

#### Scheduler Service
```typescript
class SchedulerService {
  // Avvia scheduler
  async startScheduler(): Promise<void> {
    // Scheduler backup automatici (solo SuperAdmin)
    cron.schedule('0 2 * * *', async () => {
      await this.runAutomaticBackups();
    });
    
    // Scheduler notifiche scadenze
    cron.schedule('0 9 * * *', async () => {
      await this.runDocumentExpiryNotifications();
    });
    
    // Scheduler pulizia backup obsoleti
    cron.schedule('0 3 * * 0', async () => {
      await this.cleanupOldBackups();
    });
    
    // Scheduler retry notifiche fallite
    cron.schedule('*/15 * * * *', async () => {
      await this.retryFailedNotifications();
    });
  }

  private async runAutomaticBackups(): Promise<void> {
    const superAdmins = await User.find({ role: 'superadmin' });
    
    for (const admin of superAdmins) {
      try {
        await backupService.createBackup({
          name: `auto_backup_${new Date().toISOString().split('T')[0]}`,
          type: 'complete',
          userId: admin._id,
          compression: true
        });
      } catch (error) {
        console.error(`Errore backup automatico per ${admin.email}:`, error);
      }
    }
  }

  private async runDocumentExpiryNotifications(): Promise<void> {
    try {
      await notificationService.sendDocumentExpiryNotifications();
    } catch (error) {
      console.error('Errore notifiche scadenze:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const oldBackups = await Backup.find({
      createdAt: { $lt: cutoffDate },
      status: 'completed'
    });
    
    for (const backup of oldBackups) {
      try {
        await fs.unlink(backup.path);
        await backup.remove();
      } catch (error) {
        console.error(`Errore pulizia backup ${backup.id}:`, error);
      }
    }
  }
}
```

### Frontend Components

#### Backup Management Component
```typescript
// components/BackupManagement.tsx
interface BackupManagementProps {
  userRole: 'admin' | 'superadmin';
  companyId?: string;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({ userRole, companyId }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const createBackup = async (options: CreateBackupOptions) => {
    setLoading(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) throw new Error('Errore creazione backup');
      
      // Polling per stato backup
      await pollBackupStatus(response.data.backupId);
      
      // Ricarica lista
      await loadBackups();
    } catch (error) {
      toast.error('Errore creazione backup');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/${backupId}/download`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Errore download backup');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestione Backup</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          Crea Backup
        </Button>
      </div>
      
      <BackupList 
        backups={backups}
        onDownload={downloadBackup}
        onRestore={setSelectedBackup}
        onDelete={deleteBackup}
      />
      
      <CreateBackupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createBackup}
        userRole={userRole}
      />
      
      <RestoreBackupModal
        backup={selectedBackup}
        onClose={() => setSelectedBackup(null)}
        onRestore={restoreBackup}
      />
    </div>
  );
};
```

#### Notification Settings Component
```typescript
// components/NotificationSettings.tsx
export const NotificationSettings: React.FC = () => {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const updateConfig = async (updates: Partial<NotificationConfig>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Errore aggiornamento configurazione');
      
      setConfig(response.data);
      toast.success('Configurazione aggiornata');
    } catch (error) {
      toast.error('Errore aggiornamento configurazione');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: config?.global.smtp.auth.user,
          template: 'document_expiry',
          variables: {
            adminName: 'Test Admin',
            companyName: 'Test Company',
            documents: [
              { name: 'Documento Test', expiryDate: '2024-02-15' }
            ]
          }
        })
      });
      
      toast.success('Email di test inviata');
    } catch (error) {
      toast.error('Errore invio email di test');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurazione Notifiche</h2>
        <Button onClick={testNotification}>
          Test Notifica
        </Button>
      </div>
      
      <NotificationConfigForm
        config={config}
        onSubmit={updateConfig}
        loading={loading}
      />
      
      <NotificationStats />
    </div>
  );
};
```

### Testing

#### Unit Tests
```typescript
// __tests__/backup-service.test.ts
describe('BackupService', () => {
  let backupService: BackupService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    backupService = new BackupService(mockDb);
  });

  test('should create backup successfully', async () => {
    const options = {
      name: 'Test Backup',
      type: 'complete' as const,
      userId: 'user123'
    };

    const result = await backupService.createBackup(options);

    expect(result.success).toBe(true);
    expect(result.backupId).toBeDefined();
    expect(mockDb.backups.insertOne).toHaveBeenCalled();
  });

  test('should handle backup creation failure', async () => {
    mockDb.backups.insertOne.mockRejectedValue(new Error('DB Error'));

    const options = {
      name: 'Test Backup',
      type: 'complete' as const,
      userId: 'user123'
    };

    await expect(backupService.createBackup(options)).rejects.toThrow('DB Error');
  });
});

// __tests__/notification-service.test.ts
describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockSmtp: any;

  beforeEach(() => {
    mockSmtp = createMockSMTP();
    notificationService = new NotificationService(mockSmtp);
  });

  test('should send notification successfully', async () => {
    const options = {
      type: 'document_expiry' as const,
      recipient: 'test@example.com',
      template: 'document_expiry',
      variables: { adminName: 'Test Admin' }
    };

    await notificationService.sendNotification(options);

    expect(mockSmtp.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Test Admin')
      })
    );
  });
});
```

#### Integration Tests
```typescript
// __tests__/backup-api.test.ts
describe('Backup API', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    authToken = await createTestUser('admin');
  });

  test('GET /api/backup should return backup list', async () => {
    const response = await request(app)
      .get('/api/backup')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('backups');
    expect(response.body).toHaveProperty('total');
  });

  test('POST /api/backup should create new backup', async () => {
    const backupData = {
      name: 'Test Backup',
      type: 'complete'
    };

    const response = await request(app)
      .post('/api/backup')
      .set('Authorization', `Bearer ${authToken}`)
      .send(backupData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('backupId');
    expect(response.body.status).toBe('started');
  });
});
```

### Deployment

#### Environment Variables
```env
# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=false
BACKUP_STORAGE_PATH=/var/backups/documentiiso

# Notification Configuration
NOTIFICATION_SMTP_HOST=smtp.gmail.com
NOTIFICATION_SMTP_PORT=587
NOTIFICATION_SMTP_USER=noreply@documentiiso.com
NOTIFICATION_SMTP_PASSWORD=your_app_password
NOTIFICATION_FROM_ADDRESS=noreply@documentiiso.com

# Scheduler Configuration
SCHEDULER_BACKUP_TIME=02:00
SCHEDULER_NOTIFICATION_TIME=09:00
SCHEDULER_CLEANUP_TIME=03:00
SCHEDULER_TIMEZONE=Europe/Rome
```

#### Docker Configuration
```dockerfile
# Dockerfile per backup e notifiche
FROM node:18-alpine

WORKDIR /app

# Installa dipendenze
COPY package*.json ./
RUN npm ci --only=production

# Copia codice
COPY . .

# Crea directory backup
RUN mkdir -p /var/backups/documentiiso

# Esponi porte
EXPOSE 5000

# Avvia applicazione
CMD ["npm", "start"]
```

### Monitoring e Logging

#### Log Structure
```typescript
// Logger per backup e notifiche
const backupLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/backup.log' }),
    new winston.transports.Console()
  ]
});

const notificationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/notifications.log' }),
    new winston.transports.Console()
  ]
});
```

#### Metrics
```typescript
// Metriche per monitoring
const backupMetrics = {
  totalBackups: new prometheus.Counter({
    name: 'documentiiso_backups_total',
    help: 'Total number of backups created'
  }),
  
  backupDuration: new prometheus.Histogram({
    name: 'documentiiso_backup_duration_seconds',
    help: 'Backup duration in seconds'
  }),
  
  backupSize: new prometheus.Histogram({
    name: 'documentiiso_backup_size_bytes',
    help: 'Backup size in bytes'
  })
};

const notificationMetrics = {
  notificationsSent: new prometheus.Counter({
    name: 'documentiiso_notifications_sent_total',
    help: 'Total number of notifications sent'
  }),
  
  notificationErrors: new prometheus.Counter({
    name: 'documentiiso_notification_errors_total',
    help: 'Total number of notification errors'
  }),
  
  notificationDeliveryTime: new prometheus.Histogram({
    name: 'documentiiso_notification_delivery_seconds',
    help: 'Notification delivery time in seconds'
  })
};
```

---

## 📚 Risorse Utili

### Documentazione
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Strumenti
- [Postman](https://www.postman.com/) - Test API
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI MongoDB
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Debug browser

### Community
- [Stack Overflow](https://stackoverflow.com/) - Q&A
- [GitHub Issues](https://github.com/your-org/documentiiso/issues) - Bug reports
- [Discord/Slack] - Team communication

---

## 🤝 Contribuire

### Workflow Git
```bash
# Crea branch per feature
git checkout -b feature/nuova-funzionalita

# Commit frequenti
git add .
git commit -m "feat: aggiungi nuova funzionalità"

# Push e PR
git push origin feature/nuova-funzionalita
# Crea Pull Request su GitHub
```

### Code Style
- **Prettier**: Formattazione automatica
- **ESLint**: Linting JavaScript/TypeScript
- **Conventional Commits**: Standard per commit messages

### Review Process
1. Crea PR con descrizione dettagliata
2. Aggiungi test per nuove funzionalità
3. Verifica che tutti i test passino
4. Richiedi review da team member
5. Merge dopo approvazione

---

**DocumentiIso** - Gestione documentale intelligente e sicura 