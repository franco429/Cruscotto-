# Manuale Utente - DocumentiIso

## 📖 Indice

1. [Introduzione](#introduzione)
2. [Accesso al Sistema](#accesso-al-sistema)
3. [Interfaccia Utente](#interfaccia-utente)
4. [Funzionalità Viewer](#funzionalità-viewer)
5. [Funzionalità Admin](#funzionalità-admin)
6. [Gestione Google Drive](#gestione-google-drive)
7. [Gestione Backup e Notifiche](#gestione-backup-e-notifiche)
8. [Risoluzione Problemi](#risoluzione-problemi)

---

## 🎯 Introduzione

**DocumentiIso** è un sistema di gestione documentale che permette di organizzare, sincronizzare e gestire documenti in modo sicuro e efficiente. Il sistema integra Google Drive per la sincronizzazione automatica e offre un'interfaccia web moderna per la consultazione e gestione dei documenti.

### Ruoli Utente

- **Viewer**: Può visualizzare e cercare i documenti
- **Admin**: Può gestire utenti, configurare Google Drive e amministrare i documenti

---

## 🔐 Accesso al Sistema

### Primo Accesso - Registrazione

#### Per Admin (Prima Registrazione Aziendale)

1. **Ricezione Codice Aziendale**

   - Il SuperAdmin fornisce un codice aziendale univoco
   - Il codice ha formato: `BULK-2024-XXXXXX` o simile

2. **Registrazione**

   - Vai alla pagina di registrazione: `/auth`
   - Compila il form con:
     - **Email**: La tua email aziendale
     - **Password**: Password sicura (min. 8 caratteri)
     - **Nome Azienda**: Nome della tua organizzazione
     - **Codice Aziendale**: Codice fornito dal SuperAdmin
     - **URL Cartella Google Drive**: Link alla cartella Drive da sincronizzare

3. **Configurazione Google Drive**
   - Dopo la registrazione, vai su **"Google Drive"** nel menu
   - Clicca **"Collega Drive"**
   - Autorizza l'accesso al tuo account Google

#### Per Viewer (Utenti Aziendali)

1. **Ricezione Credenziali**

   - L'Admin della tua azienda ti fornisce:
     - Email di accesso
     - Password temporanea

2. **Primo Login**
   - Vai alla pagina di login: `/auth`
   - Inserisci email e password
   - Cambia la password al primo accesso

### Login Normale

1. Vai alla pagina di login: `/auth`
2. Inserisci le tue credenziali
3. Clicca **"Accedi"**

### Recupero Password

1. Nella pagina di login, clicca **"Password dimenticata?"**
2. Inserisci la tua email
3. Controlla la casella email per il link di reset
4. Crea una nuova password

---

## 🖥️ Interfaccia Utente

### Header Bar

- **Logo**: Torna alla home
- **Barra di Ricerca**: Cerca documenti
- **Menu Utente**: Profilo, impostazioni, logout

### Sidebar (Desktop)

- **Dashboard**: Panoramica documenti
- **Documenti**: Gestione documenti
- **Utenti** (solo Admin): Gestione utenti aziendali
- **Google Drive** (solo Admin): Configurazione Drive
- **Audit Logs** (solo Admin): Log attività
- **Impostazioni**: Configurazione profilo

---

## 👁️ Funzionalità Viewer

### Dashboard Principale

#### Visualizzazione Documenti

- **Tabella Documenti**: Lista completa dei documenti
- **Filtri Avanzati**:
  - Per tipo di file (PDF, Excel, Word, etc.)
  - Per stato (Attivo, Scaduto, Obsoleto)
  - Per data di creazione/modifica
  - Per titolo o contenuto

#### Ricerca Documenti

1. **Ricerca Rapida**: Usa la barra di ricerca nell'header
2. **Ricerca Avanzata**:
   - Clicca sui filtri nella tabella
   - Combina più criteri di ricerca
   - Salva ricerche frequenti

#### Visualizzazione Documenti

- **Anteprima**: Clicca su un documento per l'anteprima
- **Informazioni**: Visualizza metadati del documento

---

## ⚙️ Funzionalità Admin

### Gestione Utenti

#### Creazione Nuovi Utenti

1. Vai su **"Utenti"** nel menu
2. Clicca **"Aggiungi Utente"**
3. Compila il form:
   - **Email**: Email del nuovo utente
   - **Password**: Password temporanea
   - **Ruolo**: Viewer (default)
4. Clicca **"Crea Utente"**

#### Gestione Utenti Esistenti

- **Modifica**: Cambia email, password, ruolo
- **Disattiva**: Disabilita temporaneamente un account
- **Elimina**: Rimuovi definitivamente un utente
- **Reset Password**: Invia email di reset

#### Ruoli e Permessi

- **Viewer**: Solo visualizzazione documenti
- **Admin**: Gestione completa (non può creare altri admin)

### Gestione Google Drive

#### Configurazione Iniziale

1. Vai su **"Google Drive"** nel menu
2. Clicca **"Collega Drive"**
3. Autorizza l'accesso al tuo account Google

#### Monitoraggio Sincronizzazione

- **Stato Connessione**: Verifica se Google Drive è connesso
- **Ultima Sincronizzazione**: Data e ora dell'ultima sync
- **File Sincronizzati**: Numero di file processati
- **Errori**: Eventuali problemi di sincronizzazione

#### Sincronizzazione Manuale solo Admin

1. Clicca **"Sincronizza Ora"**
2. Monitora il progresso
3. Controlla i risultati

#### Gestione Errori Drive

- **Token Scaduti**: Riconnetti Google Drive
- **Permessi**: Verifica i permessi sulla cartella
- **Rate Limiting**: Attendi e riprova
- **File Corrotti**: Controlla i log per dettagli

### Gestione Documenti

#### Organizzazione

- **Categorie**: Organizza documenti per tipo
- **Tag**: Aggiungi etichette per facilitare la ricerca
- **Versioni**: Gestisci diverse versioni dello stesso documento

#### Manutenzione

- **Pulizia**: Rimuovi documenti obsoleti
- **Archiviazione**: Sposta documenti vecchi in archivio

### Audit Logs

#### Visualizzazione Log

- **Attività Utenti**: Login, download, modifiche
- **Sincronizzazione**: Eventi di sync Google Drive
- **Errori**: Problemi e risoluzioni
- **Sicurezza**: Tentativi di accesso non autorizzati

#### Filtri Log

- Per utente
- Per tipo di attività
- Per data/ora
- Per livello di severità

---

## ☁️ Gestione Google Drive

### Configurazione Iniziale

#### Preparazione Google Drive

1. **Crea una Cartella Dedicata**:

   - Vai su Google Drive
   - Crea una nuova cartella per i documenti aziendali
   - Condividi la cartella con il team (opzionale)

2. **Organizza i Documenti**:
   - Struttura le sottocartelle per categoria
   - Usa nomi chiari e consistenti
   - Evita caratteri speciali nei nomi rispetta il pattern richiesto altrimenti i documenti non verranno visualizzati

#### Connessione al Sistema

1. **Autorizzazione**:

   - Il sistema richiederà accesso in lettura
   - Autorizza solo la cartella specifica
   - Non concedere accesso a tutto Drive

2. **Verifica Connessione**:
   - Controlla lo stato della connessione
   - Testa la sincronizzazione manuale
   - Verifica che i documenti appaiano nel sistema

### Sincronizzazione Automatica

#### Funzionamento

- **Frequenza**: Ogni 15 minuti automaticamente
- **Modalità**: Solo lettura (non modifica i file)
- **Gestione Errori**: Retry automatico in caso di problemi

#### Monitoraggio

- **Dashboard**: Visualizza stato sincronizzazione
- **Notifiche**: Email per errori critici
- **Log**: Dettagli completi delle operazioni

### Risoluzione Problemi Drive

#### Problemi Comuni

**Token Scaduto**

```
Sintomi: Errore "Refresh-token scaduto"
Soluzione: Riconnetti Google Drive
```

**Permessi Insufficienti**

```
Sintomi: Errore "Access denied"
Soluzione: Verifica i permessi sulla cartella
```

**Rate Limiting**

```
Sintomi: Errori temporanei di connessione
Soluzione: Attendi e riprova (gestito automaticamente)
```

**File Non Sincronizzati**

```
Sintomi: Documenti mancanti nel sistema
Soluzione: Verifica formato file e dimensioni
```

#### Procedure di Risoluzione

1. **Verifica Connessione**:

   - Vai su "Google Drive" nel menu
   - Controlla lo stato della connessione
   - Testa la sincronizzazione manuale

2. **Controlla Log**:

   - Vai su "Audit Logs"
   - Filtra per errori Google Drive
   - Analizza i messaggi di errore

3. **Riconnetti Drive**:

   - Disconnetti Google Drive
   - Riconnetti con le stesse credenziali
   - Verifica i permessi

4. **Contatta Supporto**:
   - Se i problemi persistono
   - Fornisci i log di errore
   - Descrivi i passaggi già tentati

---

## 🔄 Gestione Backup e Notifiche

### Sistema di Backup (Solo Admin)

#### Accesso e Permessi
- **Ruolo Richiesto**: Solo utenti con ruolo Admin
- **Autenticazione**: Richiesta per tutte le operazioni
- **Log**: Tutte le operazioni vengono registrate negli audit log
- **Ambito**: Backup limitato ai dati della propria azienda

#### Creazione Backup

##### Backup Rapido
1. **Accesso**: Dashboard principale → Pulsante "Backup"
2. **Esecuzione**: Clicca "Crea Backup"
3. **Monitoraggio**: Visualizza progresso in tempo reale
4. **Conferma**: Ricevi notifica di completamento

##### Backup Avanzato
1. **Accesso**: Menu → "Gestione Backup"
2. **Selezione Tipo**:
   - **Backup Completo**: Tutti i dati dell'azienda
   - **Backup Documenti**: Solo documenti e metadati
   - **Backup Utenti**: Solo utenti e configurazioni
3. **Configurazione**:
   - **Nome Backup**: Identificativo personalizzato
   - **Descrizione**: Note opzionali
   - **Crittografia**: Opzionale per backup sensibili
4. **Esecuzione**: Clicca "Crea Backup"

#### Gestione Backup Esistenti

##### Visualizzazione
- **Lista Backup**: Tutti i backup disponibili per l'azienda
- **Filtri**: Per data, tipo, dimensione
- **Ricerca**: Per nome o descrizione
- **Statistiche**: Dimensione totale, numero backup

##### Operazioni sui Backup
1. **Download**:
   - Clicca icona download (📥)
   - File scaricato in formato JSON
   - Possibilità di compressione ZIP

2. **Ripristino**:
   - ⚠️ **ATTENZIONE**: Sovrascrive dati esistenti
   - Conferma obbligatoria con password
   - Backup automatico prima del ripristino
   - Verifica integrità post-ripristino

3. **Eliminazione**:
   - Conferma obbligatoria
   - Log dell'operazione
   - Liberazione spazio disco

##### Monitoraggio e Statistiche

###### Dashboard Backup
- **Ultimo Backup**: Data e ora dell'ultimo backup
- **Backup Totali**: Numero di backup disponibili
- **Spazio Occupato**: Dimensione totale backup
- **Stato**: Indicatori di salute backup

###### Alert e Notifiche
- **Backup Obsoleti**: Avvisi per backup vecchi (>7 giorni)
- **Spazio Disco**: Alert quando spazio insufficiente
- **Backup Falliti**: Notifiche per errori di backup
- **Ripristino Completato**: Conferme operazioni

### Sistema di Notifiche Automatiche

#### Notifiche Scadenze Documenti

##### Configurazione Notifiche (Admin)

###### Impostazioni Aziendali
1. **Accesso**: Menu → "Impostazioni" → "Notifiche"
2. **Configurazione Locale**:
   - **Abilita/Disabilita**: Attiva notifiche per l'azienda
   - **Frequenza**: Personalizza frequenza per l'azienda
   - **Destinatari**: Seleziona admin che ricevono notifiche
   - **Esclusioni**: Documenti da escludere dalle notifiche

3. **Soglie di Avviso**:
   - **Avviso Anticipato**: 30 giorni prima della scadenza
   - **Avviso Imminente**: 7 giorni prima della scadenza
   - **Avviso Urgente**: 1 giorno prima della scadenza
   - **Avviso Scaduto**: Documenti già scaduti

4. **Personalizzazione**:
   - **Template Email**: Personalizza messaggi
   - **Orari Invio**: Evita orari notturni
   - **Filtri**: Escludi tipi di documento specifici

##### Funzionamento Sistema Notifiche

###### Processo Automatico
1. **Scansione Giornaliera**: Sistema controlla scadenze ogni giorno
2. **Identificazione Documenti**: Trova documenti in scadenza
3. **Generazione Notifiche**: Crea email personalizzate
4. **Invio Email**: Invia notifiche ai destinatari configurati
5. **Log Operazioni**: Registra tutte le attività

###### Template Email Esempio
```
Oggetto: [DocumentiIso] Avviso Scadenza Documenti - {Nome Azienda}

Gentile {Nome Admin},

Il sistema ha rilevato i seguenti documenti in scadenza:

📋 DOCUMENTI IN SCADENZA:
• Documento A - Scadenza: 15/01/2024
• Documento B - Scadenza: 20/01/2024

📅 PROSSIME SCADENZE:
• Documento C - Scadenza: 25/01/2024
• Documento D - Scadenza: 30/01/2024

🔗 AZIONE RICHIESTA:
- Verifica i documenti in scadenza
- Aggiorna le date se necessario
- Archivia i documenti scaduti

Per accedere al sistema: {Link Accesso}

Cordiali saluti,
Sistema DocumentiIso
```

##### Gestione Notifiche

###### Personalizzazione Messaggi
1. **Template HTML**: Personalizza layout email
2. **Variabili Dinamiche**: {Nome}, {Azienda}, {Documenti}
3. **Branding**: Logo e colori aziendali
4. **Lingua**: Supporto multilingua

###### Filtri e Esclusioni
1. **Tipi Documento**: Escludi tipi specifici
2. **Categorie**: Filtra per categoria documento
3. **Utenti**: Escludi utenti specifici
4. **Date**: Personalizza intervalli di notifica

##### Monitoraggio Notifiche

###### Dashboard Notifiche
- **Notifiche Inviate**: Numero email inviate
- **Tasso di Apertura**: Statistiche apertura email
- **Errori Invio**: Problemi di consegna
- **Feedback Utenti**: Risposte e richieste

###### Log Dettagliati
- **Data Invio**: Timestamp di ogni notifica
- **Destinatari**: Chi ha ricevuto la notifica
- **Contenuto**: Documenti inclusi nella notifica
- **Stato**: Consegnata, aperta, errore

#### Ricezione Notifiche (Tutti gli Utenti)

##### Tipi di Notifiche
1. **Scadenze Documenti**: Avvisi per documenti in scadenza
2. **Backup Completati**: Conferme backup aziendali
3. **Errori Sistema**: Alert per problemi critici
4. **Aggiornamenti**: Notifiche per modifiche sistema

##### Configurazione Personale
1. **Accesso**: Menu → "Profilo" → "Notifiche"
2. **Preferenze**:
   - **Email**: Abilita/disabilita notifiche email
   - **Frequenza**: Quanto spesso ricevere notifiche
   - **Tipi**: Seleziona tipi di notifica desiderati
   - **Orari**: Definisci orari di ricezione

##### Gestione Notifiche Ricevute
1. **Visualizzazione**: Controlla notifiche ricevute
2. **Azioni**: Segui link per azioni richieste
3. **Archiviazione**: Organizza notifiche per data/tipo
4. **Feedback**: Fornisci feedback sui contenuti

### Configurazione Avanzata

#### Automazione Backup

##### Backup Programmato
1. **Scheduling**: Configura backup automatici
   - **Giornaliero**: Backup completo ogni giorno
   - **Settimanale**: Backup incrementali
   - **Mensile**: Backup di archiviazione

2. **Retention Policy**: Gestione automatica backup
   - **Backup Recenti**: Mantieni ultimi 7 giorni
   - **Backup Settimanali**: Mantieni ultime 4 settimane
   - **Backup Mensili**: Mantieni ultimi 12 mesi

3. **Compressione**: Riduzione spazio disco
   - **Compressione Automatica**: Backup > 30 giorni
   - **Archiviazione**: Spostamento su storage esterno

#### Automazione Notifiche

##### Regole Personalizzate
1. **Condizioni**: Definisci quando inviare notifiche
   - **Scadenza**: X giorni prima della scadenza
   - **Modifica**: Quando un documento viene modificato
   - **Accesso**: Quando un documento viene visualizzato

2. **Azioni**: Cosa fare quando si verifica una condizione
   - **Email**: Invia notifica email
   - **Log**: Registra evento nei log
   - **Webhook**: Chiama API esterna

3. **Escalation**: Gestione notifiche non lette
   - **Reminder**: Invia promemoria dopo X giorni
   - **Escalation**: Notifica supervisore
   - **Urgenza**: Notifiche multiple per scadenze critiche

### Troubleshooting

#### Problemi Backup

##### Backup Fallito
1. **Verifica Spazio**: Controlla spazio disco disponibile
2. **Permessi**: Verifica permessi cartella backup
3. **Database**: Controlla connessione database
4. **Log**: Analizza log errori per dettagli

##### Ripristino Fallito
1. **Integrità File**: Verifica file backup non corrotto
2. **Versioni**: Controlla compatibilità versioni
3. **Permessi**: Verifica permessi database
4. **Rollback**: Ripristina da backup precedente

#### Problemi Notifiche

##### Email Non Inviate
1. **Configurazione SMTP**: Verifica impostazioni server
2. **Credenziali**: Controlla username/password
3. **Firewall**: Verifica blocco porte SMTP
4. **Rate Limiting**: Controlla limiti server email

##### Notifiche Duplicate
1. **Scheduling**: Verifica configurazione orari
2. **Filtri**: Controlla regole di esclusione
3. **Database**: Verifica duplicati nel database
4. **Log**: Analizza log per identificare causa

### Best Practices

#### Backup
- **Test Regolari**: Verifica integrità backup mensilmente
- **Backup Multipli**: Mantieni copie in luoghi diversi
- **Documentazione**: Registra procedure e configurazioni
- **Training**: Forma il team sulle procedure

#### Notifiche
- **Frequenza Ottimale**: Evita spam, mantieni efficacia
- **Contenuto Chiaro**: Messaggi concisi e azionabili
- **Personalizzazione**: Adatta messaggi al pubblico
- **Feedback**: Raccogli feedback per miglioramenti

---

## 🔧 Risoluzione Problemi

### Problemi di Accesso

#### Login Non Funziona

1. **Verifica Credenziali**:

   - Controlla email e password
   - Assicurati che Caps Lock sia spento

2. **Account Bloccato**:

   - Troppi tentativi di login
   - Attendi 15 minuti o contatta l'admin
   - Reset password se necessario

3. **Problemi di Sessione**:
   - Pulisci i cookie del browser
   - Prova in modalità incognito
   - Usa un browser diverso

#### Password Dimenticata

1. Clicca "Password dimenticata?"
2. Inserisci la tua email
3. Controlla la casella email (anche spam)
4. Clicca il link nel messaggio
5. Crea una nuova password

### Problemi di Visualizzazione

#### Documenti Non Appaiono

1. **Verifica Filtri**:

   - Controlla i filtri applicati
   - Rimuovi tutti i filtri
   - Ricarica la pagina

2. **Sincronizzazione**:

   - Verifica che Google Drive sia connesso
   - Controlla l'ultima sincronizzazione
   - Avvia sync manuale se necessario

3. **Permessi**:
   - Verifica di avere accesso ai documenti
   - Contatta l'admin se necessario

#### Interfaccia Non Responsive

1. **Browser**:

   - Aggiorna il browser
   - Prova un browser diverso
   - Pulisci cache e cookie

2. **Dispositivo**:
   - Verifica la connessione internet
   - Riavvia il dispositivo
   - Controlla le impostazioni di sicurezza

### Problemi di Sincronizzazione

#### Sync Non Funziona

1. **Connessione Internet**:

   - Verifica la connessione
   - Prova a ricaricare la pagina

2. **Google Drive**:

   - Controlla lo stato della connessione
   - Verifica i permessi sulla cartella
   - Riconnetti se necessario

3. **Sistema**:
   - Controlla i log di errore
   - Contatta il supporto tecnico

### Contatti Supporto

#### Informazioni da Fornire

- **Descrizione Problema**: Dettagli chiari del problema
- **Passaggi Riproduzione**: Come riprodurre l'errore
- **Log Errori**: Messaggi di errore completi
- **Browser/Dispositivo**: Informazioni sul sistema

#### Canali di Supporto

- **Email**: isodocs187@gmail.com
- **Chat**: Chat integrata nel sistema
- **Telefono**: Numero di supporto tecnico
- **Documentazione**: Consulta questa guida

---

## 🔒 Sicurezza e Privacy

### Protezione Dati

- **Crittografia**: Tutti i dati sono crittografati
- **Accesso Sicuro**: HTTPS obbligatorio
- **Session Management**: Sessioni sicure e automatiche

### Best Practices

- **Password Forti**: Usa password complesse
- **Logout**: Disconnetti sempre dopo l'uso
- **Dispositivi**: Non condividere l'accesso
- **Aggiornamenti**: Mantieni browser e sistema aggiornati

### Privacy

- **Dati Personali**: Minimizzazione della raccolta
- **Conservazione**: Dati mantenuti solo se necessario
- **Accesso**: Solo personale autorizzato
- **Trasparenza**: Politiche di privacy chiare

---

**DocumentiIso** - Gestione documentale intelligente e sicura
