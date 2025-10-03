# Giustificazione Scope drive.readonly - Versione Breve
## Per form di verifica Google OAuth (versione italiana)

---

## DESCRIZIONE APPLICAZIONE (max 4000 caratteri)

**Nome Applicazione:** SGI-Cruscotto  
**Tipologia:** Sistema di gestione documentale per conformità normativa aziendale

### Funzionalità Principale

SGI-Cruscotto è una piattaforma web professionale che aiuta le aziende a monitorare documenti normativi (certificazioni ISO, licenze, documenti qualità) già presenti nel loro Google Drive personale, fornendo:
- Sincronizzazione automatica dei metadati documentali
- Tracking delle scadenze con sistema di alert
- Dashboard di conformità per audit e management
- Visualizzazione documenti tramite Google Drive Viewer

**Valore per l'utente:** Le aziende mantengono i documenti nel PROPRIO Google Drive (sovranità dei dati) mentre ottengono tracking professionale e alert automatici senza dover ricaricare file su piattaforme terze.

### Flusso Utente Completo

**1. Registrazione**
- L'utente crea account con email/password (bcrypt-hashed)
- Ogni cliente ottiene account isolato con autenticazione JWT + HTTP-only cookies

**2. Autorizzazione Google Drive (clients-page.tsx)**
- L'utente accede alla pagina "Configurazione Google Drive"
- Click su "Seleziona Cartella" → popup OAuth di Google (500x600px)
- L'utente autorizza lo scope `drive.readonly` nella schermata di consenso ufficiale Google
- Backend riceve authorization code e lo scambia server-side per access_token + refresh_token
- Token memorizzati CRIPTATI nel database MongoDB (mai esposti al frontend)

**3. Selezione Cartella (Google Picker API)**
- Dopo OAuth, si apre automaticamente Google Picker
- L'utente NAVIGA nel proprio Drive e SELEZIONA la cartella aziendale da monitorare
  (es: "Azienda/Documenti Qualità/Certificazioni")
- L'app memorizza: driveFolderId + folderName
- Configurazione salvata nel record cliente

**4. Sincronizzazione Documenti**
- Click "Sincronizza Ora" (o sync automatico configurato)
- Backend usa refresh_token per ottenere access_token fresco
- Chiamate API: `drive.files.list(folderId)` → recupera SOLO METADATI:
  * Nome file
  * Tipo MIME (PDF, DOCX, XLSX)
  * Data ultima modifica
  * Drive File ID
- Parsing informazioni: titolo, revisione, data scadenza (dal nome file)
- **NESSUN contenuto file scaricato sul server**
- Salvataggio metadati nel database con link Drive per accesso futuro

**5. Visualizzazione Dashboard (document-table.tsx)**
- L'utente vede tabella documenti con:
  * Riferimento/percorso documento
  * Titolo e revisione
  * Badge stato (Valido/In scadenza/Scaduto)
  * Data ultimo aggiornamento
- Click "Visualizza" → redirect a Google Drive Viewer ufficiale (iframe)
- L'utente vede SOLO i propri documenti (isolamento multi-tenant per clientId)

### Perché drive.readonly È NECESSARIO (non drive.file)

**PROBLEMA CON drive.file:**
- `drive.file` permette accesso SOLO a file creati/aperti dall'app stessa
- I documenti dei clienti ESISTONO GIÀ nel loro Drive PRIMA di usare la nostra app
- L'app NON crea file, NON carica file → NON HA creato questi documenti
- **RISULTATO: drive.file restituirebbe 0 file → app inutilizzabile**

**Scenario reale:**
```
Cliente ha cartella Drive: "Certificazioni ISO/"
  - ISO9001_Cert_Rev3_Scad20251231.pdf (caricato dal cliente nel 2023)
  - Quality_Manual_v5.docx (creato dal cliente)
  - Audit_Report_2024.pdf (caricato da consulente esterno)

CON drive.file:
  → App richiede lista file → Google restituisce []
  → Motivo: app non ha creato questi file
  → FUNZIONALITÀ IMPOSSIBILE

CON drive.readonly:
  → App richiede lista file → Google restituisce tutti i 3 file
  → App legge metadati (nome, data, tipo)
  → App mostra in dashboard con tracking scadenze
  → File rimangono nel Drive del cliente, sicuri e controllati
```

**PERCHÉ READ-ONLY È SUFFICIENTE:**
- La nostra app è ESCLUSIVAMENTE un servizio di MONITORING
- NON creiamo, NON modifichiamo, NON eliminiamo file nel Drive
- Operazioni API usate: SOLO `files.list()` e `files.get(metadata)`
- Operazioni NON usate: `files.create()`, `files.update()`, `files.delete()`
- Read-only PROTEGGE l'utente: impossibile modifiche accidentali o malevole ai suoi documenti

---

## GIUSTIFICAZIONE SCOPE (max 2000 caratteri)

**Motivo richiesta drive.readonly:**

La nostra applicazione monitora documenti aziendali PRE-ESISTENTI nel Google Drive del cliente. Scenario tipico:
1. Azienda ha già cartella "Certificazioni" con ISO, licenze, documenti sicurezza
2. Vuole tracking scadenze senza caricare file altrove (data sovereignty)
3. Seleziona cartella con Google Picker dopo OAuth
4. App legge SOLO metadati (nome, data, tipo) per creare dashboard conformità
5. Click preview → redirect a Drive viewer ufficiale

**drive.file NON funziona perché:**
- Limita accesso a file creati DALL'APP
- I file del cliente esistevano PRIMA dell'app
- App non crea file → drive.file restituisce 0 risultati → servizio inutilizzabile

**drive.readonly è necessario perché:**
- Accede a file PRE-ESISTENTI selezionati dall'utente
- Permette lettura cartelle organizzate dall'utente stesso
- È il MINIMO privilegio per leggere documenti non creati dall'app

**Sicurezza implementata:**
- Token OAuth criptati in database (mai esposti a frontend)
- Isolamento multi-tenant: ogni cliente vede SOLO i propri dati
- ZERO download contenuti file (solo metadati)
- Preview tramite Drive viewer (nessun proxy)
- HTTPS, bcrypt, JWT, CSRF protection, rate limiting
- Conformità GDPR e Google API Data Policy

**Beneficio utente:**
- Documenti rimangono nel PROPRIO Drive
- Zero ricaricamenti
- Controllo totale (revoca OAuth = stop immediato)
- Alert automatici scadenze

---

## DICHIARAZIONE LIMITED USE

SGI-Cruscotto utilizza dati da Google APIs esclusivamente per:
- Fornire servizio di tracking documentale richiesto dall'utente
- Mostrare dashboard metadati documenti
- Inviare notifiche scadenze

Ci impegniamo a:
- ✅ NON trasferire dati Drive a terze parti
- ✅ NON usare dati per pubblicità
- ✅ NON permettere accesso umano a contenuti (eccetto per sicurezza/legge)
- ✅ Conformità totale con Google API Services User Data Policy
- ✅ Privacy policy completa su /privacy.html
- ✅ Trasparenza totale su OAuth consent screen

---

## DICHIARAZIONE USO DATI (max 1000 caratteri)

SGI-Cruscotto accede a Google Drive per:
1. Leggere metadati file (nome, data modifica, tipo MIME) dalla cartella selezionata dall'utente
2. Memorizzare metadati nel nostro database per dashboard tracking
3. Generare link Drive per preview documenti

NON accediamo a:
- Contenuto file (mai scaricato)
- Cartelle non selezionate dall'utente
- Drive di altri utenti

Dati memorizzati:
- Metadati documenti (nome, tipo, data, Drive ID)
- Drive folder ID selezionato dall'utente
- OAuth tokens (criptati, solo per API calls)

Sicurezza:
- Crittografia database
- Isolamento per-cliente
- Token server-side only
- Conformità GDPR

L'utente controlla:
- Quale cartella condividere (Google Picker)
- Revoca accesso anytime (Google Account settings)
- Eliminazione account e dati

ZERO trasferimento dati a terzi. ZERO pubblicità.

---

## ALTERNATIVE CONSIDERATE (max 500 caratteri)

**drive.file:** ❌ Impossibile - accede solo a file creati dall'app, non a file pre-esistenti del cliente
**drive.metadata.readonly:** ❌ Insufficiente - non include info navigazione cartelle e tipo file necessarie
**drive.appdata:** ❌ Solo per dati app nascosti, non per documenti utente
**drive (full):** ❌ Eccessivo - include write/delete che non servono e violano principio minimo privilegio

**drive.readonly:** ✅ IDEALE - minimo privilegio per leggere file esistenti senza capacità modifica

---

*Documento preparato per Google OAuth Verification*  
*SGI-Cruscotto Development Team*

