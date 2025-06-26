# Sistema di Notifiche - DocumentiIso

## 📋 Panoramica

Il sistema DocumentiIso include un sistema completo di notifiche automatiche che invia email agli admin e superadmin per ricordare le scadenze dei documenti e altri eventi importanti del sistema.

## 🎯 Funzionalità Principali

### 1. **Notifiche Scadenze Documenti**
- **Scansione Automatica**: Controllo giornaliero delle scadenze
- **Email Personalizzate**: Template con documenti in scadenza
- **Soglie Configurabili**: Avvisi a 30, 7, 1 giorni prima
- **Escalation**: Promemoria per documenti non gestiti

### 2. **Notifiche Sistema**
- **Backup Completati/Falliti**: Conferme operazioni backup
- **Errori Critici**: Alert per problemi sistema
- **Aggiornamenti**: Notifiche modifiche sistema
- **Sicurezza**: Alert accessi sospetti

### 3. **Configurazione Flessibile**
- **Impostazioni Globali**: SuperAdmin configura sistema
- **Impostazioni Aziendali**: Admin personalizza per azienda
- **Template Personalizzabili**: Messaggi su misura
- **Filtri e Esclusioni**: Controllo granularità notifiche

## 🔧 Configurazione

### **Configurazione Globale (SuperAdmin)**

#### Accesso Impostazioni
1. Menu → "Configurazione Sistema" → "Notifiche"
2. Sezione "Configurazione Email"

#### Configurazione SMTP
```javascript
// Esempio configurazione
{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "noreply@documentiiso.com",
      "pass": "password_sicura"
    }
  }
}
```

#### Template Email
- **HTML Support**: Layout personalizzabili
- **Variabili Dinamiche**: {Nome}, {Azienda}, {Documenti}
- **Branding**: Logo e colori aziendali
- **Multilingua**: Supporto lingue multiple

#### Soglie di Avviso
- **Avviso Anticipato**: 30 giorni prima scadenza
- **Avviso Imminente**: 7 giorni prima scadenza
- **Avviso Urgente**: 1 giorno prima scadenza
- **Avviso Scaduto**: Documenti già scaduti

#### Destinatari
- **Admin Aziendali**: Tutti gli admin delle aziende
- **SuperAdmin**: Notifiche globali
- **Utenti Specifici**: Seleziona utenti per notifiche speciali

### **Configurazione Aziendale (Admin)**

#### Accesso Impostazioni
1. Menu → "Impostazioni" → "Notifiche"
2. Sezione "Configurazione Locale"

#### Opzioni Disponibili
- **Abilita/Disabilita**: Attiva notifiche per l'azienda
- **Frequenza**: Personalizza frequenza per l'azienda
- **Destinatari**: Seleziona admin che ricevono notifiche
- **Esclusioni**: Documenti da escludere dalle notifiche

#### Personalizzazione
- **Template Aziendale**: Messaggi specifici per l'azienda
- **Orari Invio**: Evita orari notturni
- **Filtri**: Escludi tipi di documento specifici

## 📧 Template Email

### **Template Scadenze Documenti**

#### Oggetto Email
```
[DocumentiIso] Avviso Scadenza Documenti - {Nome Azienda}
```

#### Corpo Email
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Avviso Scadenza Documenti</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Avviso Scadenza Documenti</h2>
        
        <p>Gentile <strong>{Nome Admin}</strong>,</p>
        
        <p>Il sistema ha rilevato i seguenti documenti in scadenza:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">📋 DOCUMENTI IN SCADENZA</h3>
            {Lista documenti con scadenze}
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">📅 PROSSIME SCADENZE</h3>
            {Lista documenti con scadenze future}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">🔗 AZIONE RICHIESTA</h3>
            <ul>
                <li>Verifica i documenti in scadenza</li>
                <li>Aggiorna le date se necessario</li>
                <li>Archivia i documenti scaduti</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="{Link Accesso}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Accedi al Sistema
            </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #7f8c8d; font-size: 12px;">
            Cordiali saluti,<br>
            Sistema DocumentiIso<br>
            <br>
            Questa email è stata inviata automaticamente. Non rispondere a questo messaggio.
        </p>
    </div>
</body>
</html>
```

### **Template Backup Completato**

#### Oggetto Email
```
[DocumentiIso] Backup Completato - {Nome Azienda}
```

#### Corpo Email
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Backup Completato</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✅ Backup Completato con Successo</h2>
        
        <p>Gentile <strong>{Nome Admin}</strong>,</p>
        
        <p>Il backup del sistema è stato completato con successo.</p>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">📊 Dettagli Backup</h3>
            <ul>
                <li><strong>Data:</strong> {Data Backup}</li>
                <li><strong>Ora:</strong> {Ora Backup}</li>
                <li><strong>Tipo:</strong> {Tipo Backup}</li>
                <li><strong>Dimensione:</strong> {Dimensione}</li>
                <li><strong>Durata:</strong> {Durata}</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="{Link Accesso}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Gestisci Backup
            </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #7f8c8d; font-size: 12px;">
            Cordiali saluti,<br>
            Sistema DocumentiIso
        </p>
    </div>
</body>
</html>
```

## 🔄 Funzionamento Sistema

### **Processo Automatico**

#### Scansione Scadenze
1. **Scheduler Giornaliero**: Esegue ogni giorno alle 9:00
2. **Query Database**: Cerca documenti in scadenza
3. **Filtri Applicati**: Esclude documenti con esclusioni
4. **Raggruppamento**: Organizza per azienda e admin

#### Generazione Notifiche
1. **Template Selection**: Sceglie template appropriato
2. **Variabili Sostituzione**: Inserisce dati dinamici
3. **Personalizzazione**: Applica impostazioni aziendali
4. **Validazione**: Controlla formato email

#### Invio Email
1. **Connessione SMTP**: Stabilisce connessione sicura
2. **Invio Batch**: Invia email in gruppi
3. **Gestione Errori**: Retry automatico per errori
4. **Log Operazioni**: Registra tutte le attività

### **Gestione Errori**

#### Errori SMTP
- **Retry Automatico**: 3 tentativi con backoff
- **Fallback Server**: Server SMTP alternativo
- **Log Dettagliati**: Registrazione errori specifici
- **Alert Admin**: Notifica errori persistenti

#### Errori Template
- **Validazione**: Controllo sintassi template
- **Fallback**: Template di default
- **Log Errori**: Registrazione problemi template
- **Debug Mode**: Modalità debug per sviluppo

## 📊 Monitoraggio e Statistiche

### **Dashboard Notifiche**

#### Metriche Principali
- **Notifiche Inviate**: Numero totale email inviate
- **Tasso di Consegna**: Percentuale email consegnate
- **Tasso di Apertura**: Percentuale email aperte
- **Errori Invio**: Numero errori di invio

#### Statistiche Temporali
- **Giornaliere**: Notifiche inviate oggi
- **Settimanali**: Trend ultima settimana
- **Mensili**: Confronto con mese precedente
- **Annuamente**: Trend annuale

### **Log Dettagliati**

#### Informazioni Registrate
- **Timestamp**: Data e ora invio
- **Destinatario**: Email destinatario
- **Tipo Notifica**: Scadenza, backup, errore
- **Contenuto**: Documenti inclusi
- **Stato**: Consegnata, aperta, errore
- **Errori**: Dettagli errori specifici

#### Filtri e Ricerca
- **Per Data**: Filtra per periodo specifico
- **Per Tipo**: Filtra per tipo notifica
- **Per Destinatario**: Filtra per utente
- **Per Stato**: Filtra per stato consegna

## ⚙️ Configurazione Avanzata

### **Regole Personalizzate**

#### Condizioni Trigger
- **Scadenza Documento**: X giorni prima scadenza
- **Modifica Documento**: Quando documento modificato
- **Accesso Documento**: Quando documento visualizzato
- **Evento Sistema**: Backup, errori, aggiornamenti

#### Azioni Automatiche
- **Email**: Invia notifica email
- **Log**: Registra evento nei log
- **Webhook**: Chiama API esterna
- **SMS**: Invia notifica SMS (futuro)

#### Escalation
- **Reminder**: Invia promemoria dopo X giorni
- **Escalation**: Notifica supervisore
- **Urgenza**: Notifiche multiple per scadenze critiche

### **Integrazione API**

#### Webhook
```javascript
// Esempio webhook
{
  "url": "https://api.azienda.com/notifiche",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "body": {
    "tipo": "scadenza_documento",
    "azienda": "nome_azienda",
    "documenti": [...],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Slack/Discord
- **Webhook URL**: Configurazione canale
- **Template Messaggio**: Formato per chat
- **Menzioni**: @admin per notifiche urgenti
- **Thread**: Conversazioni organizzate

## 🚨 Troubleshooting

### **Problemi Comuni**

#### Email Non Inviate
1. **Verifica SMTP**: Controlla configurazione server
2. **Credenziali**: Verifica username/password
3. **Firewall**: Controlla blocco porte SMTP
4. **Rate Limiting**: Verifica limiti server email

#### Notifiche Duplicate
1. **Scheduling**: Controlla configurazione orari
2. **Filtri**: Verifica regole di esclusione
3. **Database**: Controlla duplicati nel database
4. **Log**: Analizza log per identificare causa

#### Template Non Funzionanti
1. **Sintassi**: Verifica sintassi HTML
2. **Variabili**: Controlla nomi variabili
3. **Encoding**: Verifica codifica caratteri
4. **Preview**: Testa template in modalità debug

### **Procedure di Risoluzione**

#### Debug Mode
1. **Attiva Debug**: Abilita modalità debug
2. **Log Dettagliati**: Abilita log completi
3. **Test Template**: Verifica template
4. **Test SMTP**: Controlla connessione email

#### Backup e Ripristino
1. **Backup Configurazione**: Salva impostazioni
2. **Reset Configurazione**: Ripristina default
3. **Verifica Database**: Controlla integrità dati
4. **Test Completo**: Verifica funzionamento

## 📈 Best Practices

### **Configurazione Email**
- **Server Affidabile**: Usa server SMTP stabili
- **Credenziali Sicure**: Password complesse
- **SSL/TLS**: Usa connessioni crittografate
- **Rate Limiting**: Rispetta limiti server

### **Template Design**
- **Responsive**: Design mobile-friendly
- **Branding**: Logo e colori aziendali
- **Chiarezza**: Messaggi concisi e azionabili
- **Accessibilità**: Contrasto e font appropriati

### **Gestione Notifiche**
- **Frequenza Ottimale**: Evita spam, mantieni efficacia
- **Personalizzazione**: Adatta messaggi al pubblico
- **Feedback**: Raccogli feedback per miglioramenti
- **Monitoraggio**: Controlla regolarmente statistiche

### **Sicurezza**
- **Autenticazione**: Verifica identità destinatari
- **Crittografia**: Usa connessioni sicure
- **Privacy**: Proteggi dati personali
- **Audit**: Mantieni log completi

## 🔮 Roadmap

### **Funzionalità Future**
- [x] Notifiche email automatiche
- [x] Template personalizzabili
- [x] Configurazione per ruolo
- [ ] Notifiche SMS per urgenze
- [ ] Integrazione Slack/Discord
- [ ] Push notification browser
- [ ] Notifiche in-app
- [ ] Analytics avanzate
- [ ] Machine learning per personalizzazione

---

**Nota**: Il sistema di notifiche è progettato per mantenere gli utenti informati sui documenti in scadenza e sugli eventi importanti del sistema. La configurazione corretta garantisce comunicazioni efficaci e tempestive. 