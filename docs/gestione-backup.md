# Gestione Backup - DocumentiIso

## 📋 Panoramica

Il sistema DocumentiIso include una funzionalità completa di backup e ripristino del database con **isolamento per client** e **controllo degli accessi basato sui ruoli**. Gli utenti con ruolo **admin** e **superadmin** hanno accesso a diverse funzionalità in base al loro livello di autorizzazione.

## 🔐 Sistema di Isolamento e Permessi

### **Admin (Amministratori Client)**

- **Backup**: Possono creare backup **solo del proprio client**
- **Visualizzazione**: Vedono solo i backup del proprio client o quelli che hanno creato personalmente
- **Ripristino**: Possono ripristinare solo i backup del proprio client
- **Download**: Possono scaricare solo i backup del proprio client o quelli che hanno creato

### **SuperAdmin (Amministratori Sistema)**

- **Backup**: Possono creare backup **completi** (tutto il sistema) o **specifici per client**
- **Visualizzazione**: Vedono **tutti i backup** del sistema
- **Ripristino**: Possono ripristinare qualsiasi backup
- **Download**: Possono scaricare qualsiasi backup

## 🎯 Funzionalità Disponibili

### 1. **Backup Rapido**

- **Posizione**: Dashboard principale (pulsante "Backup")
- **Accesso**: Admin e SuperAdmin
- **Funzione**: Crea un backup con un clic
- **Ambito**:
  - **Admin**: Backup automatico del proprio client
  - **SuperAdmin**: Backup completo del sistema

### 2. **Gestione Backup Completa**

- **Posizione**: Menu laterale → "Gestione Backup"
- **Accesso**: Admin e SuperAdmin
- **Funzioni**:
  - Visualizza backup disponibili (filtrati per ruolo)
  - Crea nuovi backup
  - Scarica backup esistenti
  - Ripristina da backup
  - Monitora stato e dimensioni
  - Visualizza metadati dettagliati (chi ha creato, quando, per quale client)

### 3. **Metadati dei Backup**

Ogni backup include informazioni dettagliate:

- **Creato da**: Email e ruolo dell'utente che ha creato il backup
- **Tipo**: Completo o specifico per client
- **Client ID**: Per i backup specifici per client
- **Statistiche**: Numero di utenti, documenti, log, client, codici aziendali
- **Timestamp**: Data e ora di creazione

### 4. **Monitoraggio Stato**

- **Posizione**: Dashboard principale (card "Stato Backup")
- **Accesso**: Admin e SuperAdmin
- **Funzioni**:
  - Visualizza ultimo backup
  - Controlla età del backup
  - Avvisi per backup obsoleti
  - Statistiche backup (filtrate per ruolo)

### 5. **Sistema di Notifiche Automatiche**

- **Posizione**: Configurazione sistema/impostazioni
- **Accesso**: Admin e SuperAdmin
- **Funzioni**:
  - Notifiche scadenze documenti
  - Notifiche backup completati/falliti
  - Notifiche errori sistema
  - Personalizzazione messaggi

## 🔧 Come Utilizzare

### **Creare un Backup**

#### Metodo 1: Backup Rapido

1. Accedi come admin/superadmin
2. Nella dashboard principale, clicca il pulsante **"Backup"**
3. Il sistema creerà automaticamente:
   - **Admin**: Backup del proprio client
   - **SuperAdmin**: Backup completo del sistema

#### Metodo 2: Gestione Backup Completa

1. Accedi come admin/superadmin
2. Vai su Menu laterale → "Gestione Backup"
3. Clicca "Crea Backup"
4. Il sistema creerà il backup appropriato in base al tuo ruolo

### **Visualizzare i Backup**

#### Per Admin:

- Vedrai solo i backup del tuo client o quelli che hai creato personalmente
- Ogni backup mostra:
  - Nome file e dimensione
  - Data di creazione
  - Tipo di backup (Specifico Client)
  - Chi ha creato il backup
  - Client ID associato
  - Statistiche dei dati inclusi

#### Per SuperAdmin:

- Vedrai tutti i backup del sistema
- Ogni backup mostra:
  - Nome file e dimensione
  - Data di creazione
  - Tipo di backup (Completo o Specifico Client)
  - Chi ha creato il backup
  - Client ID (se applicabile)
  - Statistiche complete dei dati

### **Scaricare un Backup**

1. Nella lista dei backup, clicca "Scarica" accanto al backup desiderato
2. Il file verrà scaricato automaticamente
3. **Nota**: Puoi scaricare solo i backup per cui hai i permessi

### **Ripristinare da Backup**

1. Nella lista dei backup, clicca "Ripristina" accanto al backup desiderato
2. Conferma l'operazione (⚠️ **ATTENZIONE**: Sovrascrive i dati attuali)
3. Il sistema ripristinerà i dati appropriati:
   - **Backup completo**: Ripristina tutto il database
   - **Backup specifico per client**: Ripristina solo i dati del client specifico

## 📊 Tipi di Backup

### **Backup Completo**

- **Creato da**: Solo SuperAdmin
- **Contenuto**: Tutti i dati del sistema (utenti, documenti, log, client, codici aziendali)
- **Utilizzo**: Ripristino completo del sistema
- **File**: `backup_complete_YYYY-MM-DDTHH-MM-SS.json`

### **Backup Specifico per Client**

- **Creato da**: Admin (proprio client) o SuperAdmin (qualsiasi client)
- **Contenuto**: Solo i dati del client specifico
- **Utilizzo**: Ripristino selettivo per client
- **File**: `backup_client_X_YYYY-MM-DDTHH-MM-SS.json`

## 🔒 Sicurezza e Controllo Accessi

### **Verifiche di Sicurezza**

- **Path Traversal**: Protezione contro tentativi di accesso a file esterni
- **Permessi**: Verifica dei ruoli prima di ogni operazione
- **Isolamento**: Admin non possono accedere ai dati di altri client
- **Logging**: Tutte le operazioni vengono registrate per audit

### **Controllo Accessi**

- **Admin**: Accesso limitato ai propri dati
- **SuperAdmin**: Accesso completo a tutto il sistema
- **Verifiche**: Controlli automatici sui permessi per ogni operazione

## 🚨 Avvertenze Importanti

### **Ripristino**

- ⚠️ Il ripristino **sovrascrive** i dati attuali
- ⚠️ L'operazione **non può essere annullata**
- ⚠️ Assicurati di avere un backup recente prima del ripristino

### **Permessi**

- 🔒 Gli admin possono accedere solo ai propri dati
- 🔒 I backup sono isolati per client
- 🔒 Tutte le operazioni vengono tracciate nei log

### **Performance**

- 📈 I backup vengono creati in background per non bloccare l'applicazione
- 📈 I backup specifici per client sono più veloci e occupano meno spazio
- 📈 Il ripristino viene eseguito in transazioni per garantire la consistenza

## 🛠️ Risoluzione Problemi

### **Backup Fallito**

1. Verifica i permessi dell'utente
2. Controlla lo spazio disponibile su disco
3. Verifica la connessione al database
4. Controlla i log per errori specifici

### **Ripristino Fallito**

1. Verifica che il file di backup sia valido
2. Controlla i permessi per il ripristino
3. Assicurati che il database sia accessibile
4. Verifica la compatibilità della versione del backup

### **Accesso Negato**

1. Verifica il ruolo dell'utente
2. Controlla che l'admin appartenga al client corretto
3. Verifica che il backup sia del client appropriato
4. Controlla i log per dettagli sull'errore

## 📝 Note Tecniche

### **Formato File**

- I backup sono salvati in formato JSON
- Includono metadati completi per tracciabilità
- Versioning per compatibilità futura

### **Storage**

- I backup sono salvati nella cartella `backups/`
- Naming convention: `backup_[tipo]_[timestamp].json`
- Compressione automatica per risparmiare spazio

### **Logging**

- Tutte le operazioni vengono registrate
- Include dettagli su chi, quando, cosa
- Disponibile per audit e troubleshooting
