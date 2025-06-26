# Gestione Backup - DocumentiIso

## 📋 Panoramica

Il sistema DocumentiIso include una funzionalità completa di backup e ripristino del database, accessibile agli utenti con ruolo **admin** e **superadmin**, con diverse funzionalità in base al ruolo.

## 🎯 Funzionalità Disponibili

### 1. **Backup Rapido**
- **Posizione**: Dashboard principale (pulsante "Backup")
- **Accesso**: Admin e SuperAdmin
- **Funzione**: Crea un backup completo con un clic
- **Ambito**: 
  - **Admin**: Backup della propria azienda
  - **SuperAdmin**: Backup completo del sistema

### 2. **Gestione Backup Completa**
- **Posizione**: Menu laterale → "Gestione Backup"
- **Accesso**: Admin e SuperAdmin
- **Funzioni**:
  - Visualizza tutti i backup disponibili
  - Crea nuovi backup
  - Scarica backup esistenti
  - Ripristina da backup
  - Monitora stato e dimensioni

### 3. **Gestione Backup Globale** (Solo SuperAdmin)
- **Posizione**: Menu laterale → "Gestione Backup Globale"
- **Accesso**: Solo SuperAdmin
- **Funzioni**:
  - Backup di tutte le aziende
  - Backup selettivo per aziende specifiche
  - Backup configurazioni sistema
  - Scheduling backup automatici

### 4. **Monitoraggio Stato**
- **Posizione**: Dashboard principale (card "Stato Backup")
- **Accesso**: Admin e SuperAdmin
- **Funzioni**:
  - Visualizza ultimo backup
  - Controlla età del backup
  - Avvisi per backup obsoleti
  - Statistiche backup

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
3. Il sistema creerà automaticamente un backup completo
4. Riceverai una notifica di conferma

#### Metodo 2: Gestione Completa (Admin)
1. Accedi come admin
2. Nel menu laterale, clicca **"Gestione Backup"**
3. Clicca **"Crea Backup"**
4. Seleziona il tipo di backup:
   - **Backup Completo Azienda**: Tutti i dati dell'azienda
   - **Backup Documenti**: Solo documenti e metadati
   - **Backup Utenti**: Solo utenti e configurazioni
5. Configura nome e descrizione
6. Attendi il completamento dell'operazione

#### Metodo 3: Gestione Globale (SuperAdmin)
1. Accedi come superadmin
2. Nel menu laterale, clicca **"Gestione Backup Globale"**
3. Seleziona l'ambito del backup:
   - **Backup Sistema Completo**: Tutto il database
   - **Backup Multi-Azienda**: Seleziona aziende specifiche
   - **Backup Configurazioni**: Solo impostazioni sistema
4. Configura opzioni avanzate (compressione, crittografia)
5. Attendi il completamento dell'operazione

### **Scaricare un Backup**
1. Vai alla pagina **"Gestione Backup"** (o **"Gestione Backup Globale"** per SuperAdmin)
2. Trova il backup desiderato nella lista
3. Clicca l'icona **"Download"** (📥)
4. Il file verrà scaricato automaticamente

### **Ripristinare da Backup**
⚠️ **ATTENZIONE**: Il ripristino sovrascriverà tutti i dati attuali!

1. Vai alla pagina **"Gestione Backup"**
2. Trova il backup da ripristinare
3. Clicca l'icona **"Ripristina"** (📤)
4. Conferma l'operazione nel popup
5. Inserisci la password per confermare
6. Attendi il completamento del ripristino

## 📊 Monitoraggio e Statistiche

### **Stato Backup nella Dashboard**
La card "Stato Backup" mostra:
- **Ultimo backup**: Data e ora dell'ultimo backup
- **Backup totali**: Numero di backup disponibili
- **Dimensione totale**: Spazio occupato dai backup
- **Stato**: Indicatore visivo dello stato

### **Indicatori di Stato**
- 🟢 **Verde**: Backup recente (≤ 1 giorno)
- 🟡 **Giallo**: Backup da aggiornare (≤ 7 giorni)
- 🔴 **Rosso**: Backup obsoleto (> 7 giorni)
- ⚠️ **Rosso**: Nessun backup disponibile

## 🔔 Sistema di Notifiche

### **Configurazione Notifiche**

#### Impostazioni Globali (SuperAdmin)
1. **Accesso**: Menu → "Configurazione Sistema" → "Notifiche"
2. **Configurazione Email**:
   - **SMTP Server**: Configurazione server email
   - **Template Email**: Personalizzazione messaggi
   - **Frequenza Invio**: Giornaliera, settimanale, personalizzata
   - **Orari Invio**: Evita orari notturni

3. **Soglie di Avviso**:
   - **Avviso Anticipato**: 30 giorni prima della scadenza
   - **Avviso Imminente**: 7 giorni prima della scadenza
   - **Avviso Urgente**: 1 giorno prima della scadenza
   - **Avviso Scaduto**: Documenti già scaduti

4. **Destinatari**:
   - **Admin Aziendali**: Tutti gli admin delle aziende
   - **SuperAdmin**: Notifiche globali
   - **Utenti Specifici**: Seleziona utenti per notifiche speciali

#### Impostazioni Aziendali (Admin)
1. **Accesso**: Menu → "Impostazioni" → "Notifiche"
2. **Configurazione Locale**:
   - **Abilita/Disabilita**: Attiva notifiche per l'azienda
   - **Frequenza**: Personalizza frequenza per l'azienda
   - **Destinatari**: Seleziona admin che ricevono notifiche
   - **Esclusioni**: Documenti da escludere dalle notifiche

### **Tipi di Notifiche**

#### Notifiche Scadenze Documenti
- **Scansione Automatica**: Sistema controlla scadenze ogni giorno
- **Email Personalizzate**: Template con documenti in scadenza
- **Azioni Richieste**: Link diretti per gestire documenti
- **Escalation**: Promemoria per documenti non gestiti

#### Notifiche Backup
- **Backup Completato**: Conferma backup riuscito
- **Backup Fallito**: Alert per errori di backup
- **Backup Obsoleto**: Avvisi per backup vecchi
- **Spazio Disco**: Alert quando spazio insufficiente

### **Template Email Esempio**
```
Oggetto: [DocumentiIso] Avviso Scadenza Documenti - {Azienda}

Gentile {Nome Admin},

Il sistema ha rilevato i seguenti documenti in scadenza:

📋 DOCUMENTI IN SCADENZA:
{Lista documenti con scadenze}

📅 PROSSIME SCADENZE:
{Lista documenti con scadenze future}

🔗 AZIONE RICHIESTA:
- Verifica i documenti in scadenza
- Aggiorna le date se necessario
- Archivia i documenti scaduti

Per accedere al sistema: {Link Accesso}

Cordiali saluti,
Sistema DocumentiIso
```

## 🛡️ Sicurezza e Permessi

### **Controllo Accessi**
- Solo utenti con ruolo `admin` o `superadmin`
- Autenticazione richiesta per tutte le operazioni
- Log di audit per tutte le azioni
- Conferma password per operazioni critiche

### **Protezione Dati**
- Backup crittografati (opzionale)
- Transazioni atomiche per il ripristino
- Verifica integrità dei file di backup
- Backup automatico prima del ripristino

### **Differenze di Permessi**

| Funzionalità | Admin | SuperAdmin |
|--------------|-------|------------|
| Backup aziendale | ✅ | ✅ |
| Backup globale | ❌ | ✅ |
| Backup configurazioni | ❌ | ✅ |
| Notifiche aziendali | ✅ | ✅ |
| Notifiche globali | ❌ | ✅ |
| Scheduling backup | ❌ | ✅ |

## 📁 Struttura Backup

### **Dati Inclusi**
Il backup include tutti i dati del sistema:
- **Utenti**: Profili, ruoli, sessioni
- **Documenti**: Metadati, stati, scadenze
- **Clienti**: Informazioni aziendali
- **Codici Aziendali**: Codici di registrazione
- **Log**: Registro attività completo
- **Contatori**: ID sequenziali

### **Formato File**
- **Estensione**: `.json`
- **Nome**: `backup_all_YYYY-MM-DDTHH-MM-SS-sssZ.json`
- **Posizione**: `server/backups/`
- **Compressione**: Opzionale per ridurre dimensione

## 🔄 Operazioni Automatiche

### **Backup Automatici** (Solo SuperAdmin)
- Backup giornalieri automatici
- Retention policy configurabile
- Notifiche per backup falliti
- Compressione automatica backup vecchi

### **Pulizia Automatica** (Solo SuperAdmin)
- Rimozione backup obsoleti
- Compressione backup vecchi
- Ottimizzazione spazio disco
- Archiviazione su storage esterno

### **Notifiche Automatiche**
- Scansione giornaliera scadenze
- Invio email personalizzate
- Log di tutte le operazioni
- Gestione errori di invio

## 🚨 Risoluzione Problemi

### **Backup Fallito**
1. Verifica i permessi di scrittura nella cartella `backups`
2. Controlla lo spazio disco disponibile
3. Verifica la connessione al database
4. Controlla i log del server

### **Ripristino Fallito**
1. Verifica l'integrità del file di backup
2. Controlla i permessi di lettura
3. Verifica la connessione al database
4. Controlla i log del server

### **Accesso Negato**
1. Verifica di essere loggato come admin/superadmin
2. Controlla la validità della sessione
3. Effettua nuovamente l'accesso se necessario

### **Notifiche Non Inviate**
1. Verifica configurazione SMTP
2. Controlla credenziali email
3. Verifica firewall e porte SMTP
4. Controlla log errori email

## 📞 Supporto

Per problemi con i backup:
1. Controlla i log del server
2. Verifica i permessi utente
3. Contatta l'amministratore di sistema
4. Consulta la documentazione tecnica

## 🔮 Roadmap

### **Funzionalità Future**
- [x] Backup manuali per admin e superadmin
- [x] Notifiche automatiche scadenze
- [x] Template email personalizzabili
- [ ] Backup incrementali
- [ ] Backup su cloud esterno
- [ ] Dashboard analytics backup
- [ ] Test automatici integrità backup
- [ ] Notifiche SMS per urgenze
- [ ] Integrazione Slack/Discord

---

**Nota**: Le funzionalità di backup sono critiche per la sicurezza dei dati. Assicurati di testare regolarmente i backup e mantenere copie in luoghi sicuri. Le notifiche automatiche aiutano a mantenere aggiornati sui documenti in scadenza e sullo stato del sistema. 