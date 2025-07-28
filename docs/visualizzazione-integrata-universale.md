# Visualizzazione Integrata Universale

## Panoramica

La funzionalità di **Visualizzazione Integrata Universale** permette di visualizzare direttamente nel browser tutti i documenti supportati (PDF, XLSX, XLS, DOCX, DOC) senza bisogno di download o plugin esterni.

## Caratteristiche

### ✅ Formati Supportati

- **PDF**: Visualizzazione nativa tramite iframe
- **XLSX/XLS**: Conversione automatica in PDF tramite LibreOffice
- **DOCX/DOC**: Conversione automatica in PDF tramite LibreOffice
- **Google Sheets**: Link diretto a Google Drive (come prima)

### 🔧 Funzionalità Tecniche

1. **Conversione Automatica**: I file Office vengono convertiti in PDF al momento della visualizzazione
2. **Cache Intelligente**: I PDF generati vengono salvati per performance future
3. **Fallback Robusto**: Se la conversione fallisce, viene offerto il download originale
4. **Gestione Errori**: Messaggi di errore chiari e opzioni di retry

## Architettura

### Backend

#### Endpoint `/api/documents/:id/preview`
- **Autenticazione**: Richiesta
- **Funzionalità**: 
  - Serve PDF nativi direttamente
  - Converte file Office in PDF usando LibreOffice
  - Gestisce cache dei PDF generati
  - Restituisce errori dettagliati

#### Endpoint `/api/documents/:id/download`
- **Autenticazione**: Richiesta
- **Funzionalità**:
  - Download file originali per file locali
  - Reindirizzamento a Google Drive per file Drive

### Frontend

#### Componente `DocumentPreviewModal`
- **Anteprima Integrata**: iframe per visualizzazione PDF
- **Loading States**: Indicatori di caricamento
- **Error Handling**: Gestione errori con retry
- **Fallback UI**: Download alternativo se preview fallisce

## Flusso Utente

1. **Clic su Documento**: L'utente clicca su un documento nella tabella
2. **Controllo Tipo**: Il sistema determina se il file è supportato per preview
3. **Visualizzazione**:
   - **PDF**: Visualizzazione diretta
   - **Office**: Conversione automatica → Visualizzazione PDF
   - **Google Drive**: Link esterno
4. **Fallback**: Se errore → Download originale

## Sicurezza

### ✅ Protezioni Implementate

- **Autenticazione**: Tutti gli endpoint richiedono autenticazione
- **Autorizzazione**: Controllo accesso ai documenti per client
- **Validazione**: Verifica esistenza file e permessi
- **Sanitizzazione**: Path validation per prevenire directory traversal

### 🔒 File System

- **Isolamento**: File in directory protetta `server/uploads/`
- **Cache Sicura**: PDF generati in `server/uploads/previews/`
- **Cleanup**: Gestione automatica spazio disco

## Performance

### 🚀 Ottimizzazioni

1. **Cache PDF**: Conversione una tantum, riutilizzo successivo
2. **Streaming**: File serviti tramite stream per memoria efficiente
3. **Lazy Loading**: Conversione solo quando richiesta
4. **Error Recovery**: Retry automatico su errori temporanei

### 📊 Metriche

- **Tempo Conversione**: ~2-5 secondi per file Office
- **Dimensione Cache**: ~10-50MB per documento convertito
- **Throughput**: Supporto concorrente per multiple conversioni

## Configurazione

### Dipendenze

```json
{
  "libreoffice-convert": "^1.4.1"
}
```

### Variabili Ambiente

```env
# Directory per cache PDF (opzionale)
PREVIEW_CACHE_DIR=server/uploads/previews
```

### LibreOffice

La conversione richiede LibreOffice installato sul server:

```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# CentOS/RHEL
sudo yum install libreoffice

# Windows
# Scaricare e installare LibreOffice da https://www.libreoffice.org/
```

## Troubleshooting

### Errori Comuni

#### "Errore conversione PDF"
- **Causa**: LibreOffice non installato o non accessibile
- **Soluzione**: Installare LibreOffice e verificare PATH

#### "File non trovato"
- **Causa**: File originale rimosso o spostato
- **Soluzione**: Verificare integrità file system

#### "Formato non supportato"
- **Causa**: Tipo file non riconosciuto
- **Soluzione**: Verificare estensione file

### Log

Gli errori vengono loggati con dettagli completi:

```javascript
console.error("Errore conversione PDF:", err);
console.error("Errore generazione anteprima:", error);
```

## Manutenzione

### Pulizia Cache

```bash
# Rimuovere PDF cache più vecchi di 30 giorni
find server/uploads/previews -name "*.pdf" -mtime +30 -delete
```

### Monitoraggio

- **Spazio Disco**: Monitorare dimensione directory `previews/`
- **Performance**: Controllare tempi di conversione
- **Errori**: Verificare log per conversioni fallite

## Estensioni Future

### Possibili Miglioramenti

1. **Formati Aggiuntivi**: Supporto per PPTX, RTF, ODT
2. **Preview Thumbnail**: Miniature per lista documenti
3. **Batch Conversion**: Conversione in background
4. **Cloud Storage**: Cache su storage esterno
5. **OCR Integration**: Estrazione testo per ricerca

### API Estese

```javascript
// Endpoint per pulizia cache
DELETE /api/admin/preview-cache

// Endpoint per statistiche
GET /api/admin/preview-stats

// Endpoint per conversione batch
POST /api/admin/convert-batch
```

## Test

### Test Unitari

```bash
npm run test -- document-preview.test.ts
```

### Test Manuali

1. **PDF**: Verificare visualizzazione diretta
2. **XLSX**: Testare conversione e cache
3. **Errori**: Simulare file corrotti
4. **Performance**: Test con file grandi
5. **Concorrenza**: Multiple richieste simultanee

## Changelog

### v1.0.0 (Implementazione Iniziale)
- ✅ Endpoint preview e download
- ✅ Conversione LibreOffice
- ✅ Cache PDF
- ✅ Gestione errori
- ✅ UI responsive
- ✅ Sicurezza e autenticazione 