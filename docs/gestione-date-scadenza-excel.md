# Gestione Date di Scadenza Excel e Google Sheets

## Panoramica

Il sistema DocumentiIso ora supporta la lettura automatica delle date di scadenza dai file Excel e Google Sheets. La funzionalità legge il valore della cella A1 di ogni file Excel o Google Sheets e lo utilizza per calcolare lo stato di allerta del documento.

## Come Funziona

### 1. Posizionamento della Data di Scadenza
- **Cella A1**: La data di scadenza deve essere posizionata nella cella A1 del primo foglio di lavoro
- **Formati Supportati**: Il sistema riconosce automaticamente diversi formati di data:
  - DD/MM/YYYY (es. 31/12/2024)
  - MM/DD/YYYY (es. 12/31/2024)
  - YYYY-MM-DD (es. 2024-12-31)
  - DD-MM-YYYY (es. 31-12-2024)
  - DD.MM.YYYY (es. 31.12.2024)
  - YYYY/MM/DD (es. 2024/12/31)

### 2. Tipi di File Supportati
Il sistema supporta sia:
- **File Excel nativi** (.xlsx, .xls)
- **Google Sheets** (fogli di calcolo Google)

### 3. Formule Excel/Google Sheets Supportate
Il sistema può leggere sia valori statici che formule che restituiscono date:

```excel
# Esempi di formule valide nella cella A1:

# Data fissa
=TODAY()+30

# Data basata su un'altra cella
=B1+90

# Data calcolata
=DATE(YEAR(TODAY()), MONTH(TODAY())+3, DAY(TODAY()))

# Data di scadenza basata su data di creazione
=DATE(YEAR(C1), MONTH(C1)+6, DAY(C1))

# Data di fine anno
=DATE(YEAR(TODAY()), 12, 31)

# Formule specifiche Google Sheets
=EDATE(TODAY(), 6)  # 6 mesi da oggi
=WORKDAY(TODAY(), 30)  # 30 giorni lavorativi da oggi

# Formule condizionali (italiano)
=SE(OGGI()<O1;"";O1)  # Se oggi < O1, vuoto, altrimenti O1
=SE(OGGI()>O1;"SCADUTO";O1)  # Se oggi > O1, "SCADUTO", altrimenti O1

# Formule condizionali (inglese)
=IF(TODAY()<O1,"",O1)  # Se oggi < O1, vuoto, altrimenti O1
=IF(TODAY()>O1,"EXPIRED",O1)  # Se oggi > O1, "EXPIRED", altrimenti O1
```

### 4. Stati di Allerta
Il sistema calcola automaticamente lo stato di allerta basato sulla data di scadenza:

- **🟢 Valido**: Documento non scaduto e non in scadenza
- **🟡 In Scadenza**: Documento che scadrà entro 30 giorni
- **🔴 Scaduto**: Documento già scaduto

## Utilizzo nell'Interfaccia

### Per gli Amministratori

1. **Aggiornamento Manuale**: 
   - Vai alla pagina Documenti
   - Clicca su "Aggiorna Date Excel" per aggiornare tutti i documenti Excel e Google Sheets esistenti

2. **Sincronizzazione Automatica**:
   - Durante la sincronizzazione con Google Drive, i nuovi file Excel e Google Sheets vengono automaticamente analizzati
   - Le date di scadenza vengono lette e salvate nel database

### Visualizzazione degli Stati

- **Tabella Documenti**: Ogni documento Excel/Google Sheets mostra un badge colorato con lo stato di allerta
- **Dettaglio Documento**: Nella pagina di dettaglio è visibile la data di scadenza e lo stato
- **Notifiche**: Il sistema invia notifiche email per documenti scaduti o in scadenza

## Configurazione

### Giorni di Preavviso
Il sistema è configurato per mostrare l'allerta 30 giorni prima della scadenza. Questa configurazione può essere modificata nel codice:

```typescript
// In server/google-drive.ts, riga ~270
const warningDays = 30; // Modifica questo valore per cambiare i giorni di preavviso
```

### Controllo Automatico
Il sistema esegue controlli automatici delle scadenze ogni 24 ore e invia notifiche agli amministratori.

## Troubleshooting

### Problemi Comuni

1. **Data non riconosciuta**:
   - Verifica che la cella A1 contenga una data valida
   - Controlla che il formato sia uno di quelli supportati
   - Assicurati che la formula Excel/Google Sheets restituisca una data

2. **Stato non aggiornato**:
   - Usa il pulsante "Aggiorna Date Excel" per forzare l'aggiornamento
   - Verifica che il file Excel/Google Sheets sia accessibile su Google Drive

3. **Errore di lettura**:
   - Controlla i log del server per errori specifici
   - Verifica che il file Excel/Google Sheets non sia corrotto
   - Assicurati che ExcelJS sia installato correttamente

4. **Google Sheets non riconosciuti**:
   - Verifica che il file sia un Google Sheets (non un file Excel caricato su Drive)
   - Controlla che l'utente abbia i permessi di accesso al file
   - Assicurati che Google Drive API sia configurata correttamente

### Log e Debug

Il sistema registra dettagliatamente tutte le operazioni di lettura:

```typescript
// Esempi di log
logger.info('Cell A1 value found', { 
  filePath, 
  value: cellA1.value,
  type: typeof cellA1.value 
});

logger.info('File analysis completed', {
  filePath,
  mimeType,
  isGoogleSheet,
  expiryDate: expiryDate.toISOString(),
  alertStatus,
  daysUntilExpiry: Math.ceil((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
});
```

## Best Practices

### Per i Clienti

1. **Standardizzazione**: Usa sempre la cella A1 per la data di scadenza
2. **Formule**: Utilizza formule Excel/Google Sheets per calcoli automatici
3. **Formato**: Mantieni un formato di data consistente
4. **Aggiornamento**: Aggiorna regolarmente le date di scadenza
5. **Google Sheets**: Se usi Google Sheets, assicurati che siano condivisi correttamente

### Per gli Amministratori

1. **Monitoraggio**: Controlla regolarmente i documenti in scadenza
2. **Notifiche**: Verifica che le notifiche email funzionino correttamente
3. **Backup**: Mantieni backup dei file Excel/Google Sheets importanti
4. **Documentazione**: Documenta le formule utilizzate per facilitare la manutenzione
5. **Permessi**: Verifica che gli utenti abbiano i permessi corretti sui Google Sheets

## API Endpoints

### Aggiornamento Date di Scadenza
```http
POST /api/excel/update-expiry-dates
Authorization: Bearer <token>
Content-Type: application/json

Response:
{
  "message": "Aggiornamento date di scadenza Excel/Google Sheets avviato",
  "updateId": "1234567890"
}
```

### Sincronizzazione Documenti
```http
POST /api/sync
Authorization: Bearer <token>
Content-Type: application/json

Response:
{
  "message": "Processo di sincronizzazione avviato",
  "syncId": "1234567890"
}
```

## Sicurezza

- Solo gli amministratori possono aggiornare le date di scadenza
- I file Excel/Google Sheets vengono scaricati temporaneamente e poi eliminati
- Tutte le operazioni sono registrate nei log di audit
- Le connessioni a Google Drive utilizzano OAuth2 sicuro
- I Google Sheets vengono esportati in formato Excel per l'analisi 

### 4. Gestione Formule Condizionali
Il sistema gestisce correttamente le formule condizionali che restituiscono:
- **Stringa vuota** (`""`) quando la condizione è vera
- **Data di scadenza** quando la condizione è falsa

**Esempio**: `=SE(OGGI()<O1;"";O1)`
- **Prima della scadenza**: A1 = vuoto → Sistema: `alertStatus: "none"`
- **Dopo la scadenza**: A1 = data da O1 → Sistema: calcola stato di allerta

**Comportamento atteso**:
- ✅ **Cella vuota**: Nessun allarme, documento considerato valido
- ✅ **Data presente**: Calcolo automatico dello stato di allerta
- ✅ **Aggiornamento dinamico**: Ogni sincronizzazione ricalcola lo stato 