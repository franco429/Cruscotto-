# Google Cloud Storage Setup Guide

## 🎯 Perché Google Cloud Storage?

**Problema**: Su Render, l'uso dello storage temporaneo `/tmp` causa **fallimenti delle istanze** perché:
- Lo spazio è limitato (~512MB)
- I file possono accumularsi
- Ogni restart perde i file, causando inconsistenze

**Soluzione**: Google Cloud Storage elimina completamente l'uso di `/tmp`, prevenendo i fallimenti e permettendo:
- ✅ Storage illimitato
- ✅ Nessun impatto sulla memoria delle istanze Render
- ✅ Eliminazione automatica con lifecycle policies
- ✅ Maggiore parallelizzazione (no più limiti su Excel)

---

## 📋 Setup Passo-Passo

### 1. Creare Progetto Google Cloud (se non esiste già)

Se state già usando Google Drive API, probabilmente avete già un progetto. Usate quello stesso.

1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Seleziona il progetto esistente o creane uno nuovo
3. Prendi nota del **Project ID** (es: `sgi-cruscotto-123456`)

### 2. Abilitare Google Cloud Storage API

1. Nella Console, vai su **APIs & Services > Library**
2. Cerca "Cloud Storage API"
3. Click su **Enable**

### 3. Creare un Bucket

1. Vai su **Cloud Storage > Buckets** nel menu laterale
2. Click su **Create Bucket**
3. Configurazione:
   - **Name**: `sgi-cruscotto-temp` (o altro nome univoco)
   - **Location type**: Region
   - **Location**: `europe-west1` (o la regione più vicina a Render)
   - **Storage class**: Standard
   - **Access control**: Uniform
   - **Public access**: OFF (NON pubblico!)
4. Click **Create**

### 4. Configurare Lifecycle Policy (Eliminazione Automatica)

Questo eliminerà automaticamente i file temporanei dopo 1 giorno:

1. Nel bucket appena creato, vai alla tab **Lifecycle**
2. Click **Add a rule**
3. Configurazione:
   - **Action**: Delete object
   - **Condition**: Age = `1` day
   - **Object name prefix**: `temp_`
4. Click **Create**

### 5. Creare Service Account e Credenziali

#### Opzione A: Usando le stesse credenziali di Google Drive (CONSIGLIATO)

Se avete già un Service Account per Google Drive, potete riusarlo:

1. Vai su **IAM & Admin > Service Accounts**
2. Trova il Service Account che usate per Google Drive
3. Click sui 3 puntini → **Manage Keys**
4. Il file JSON che avete già include le credenziali necessarie
5. Aggiungi il ruolo **Storage Object Admin** al Service Account:
   - Vai su **Cloud Storage > Browser**
   - Seleziona il bucket `sgi-cruscotto-temp`
   - Click sulla tab **Permissions**
   - Click **Grant Access**
   - Aggiungi il Service Account email con ruolo **Storage Object Admin**

#### Opzione B: Creare un nuovo Service Account

1. Vai su **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Configurazione:
   - **Name**: `sgi-cloud-storage`
   - **Description**: `Service account for temporary file storage`
4. Click **Create and Continue**
5. Aggiungi il ruolo: **Storage Object Admin**
6. Click **Done**
7. Click sul Service Account appena creato
8. Vai alla tab **Keys**
9. Click **Add Key > Create new key**
10. Seleziona **JSON** e click **Create**
11. Salva il file JSON scaricato in un posto sicuro

### 6. Configurare Variabili d'Ambiente su Render

#### Metodo 1: Usando GOOGLE_APPLICATION_CREDENTIALS (CONSIGLIATO per Render)

1. Vai su Render Dashboard → Il tuo servizio
2. Vai su **Environment**
3. Aggiungi queste variabili:

```bash
# ID del progetto Google Cloud
GCS_PROJECT_ID=sgi-cruscotto-123456

# Nome del bucket creato
GCS_BUCKET_NAME=sgi-cruscotto-temp

# Contenuto del file JSON delle credenziali (TUTTO il contenuto)
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcs-credentials.json
```

4. Carica il file JSON delle credenziali:
   - Su Render, vai su **Settings > Secret Files**
   - Click **Add Secret File**
   - Filename: `gcs-credentials.json`
   - Path: `/etc/secrets/gcs-credentials.json`
   - Contents: Copia e incolla il contenuto del file JSON

#### Metodo 2: Usando variabili d'ambiente dirette

Se preferisci non usare secret files, puoi copiare il contenuto del JSON direttamente:

```bash
GCS_PROJECT_ID=sgi-cruscotto-123456
GCS_BUCKET_NAME=sgi-cruscotto-temp
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"..."}
```

Poi nel codice, salva questo JSON in un file temporaneo e usa quello.

### 7. Testare la Configurazione

Dopo il deployment, controlla i log di Render per verificare:

```
✅ Google Cloud Storage client initialized
✅ Google Cloud Storage is configured and ready
✅ Using Cloud Storage for file analysis
```

Se vedi errori, verifica:
- Le credenziali sono corrette
- Il Service Account ha i permessi sul bucket
- Il bucket esiste e il nome è corretto
- Il Project ID è corretto

---

## 🔧 Variabili d'Ambiente Complete

### Obbligatorie per Cloud Storage

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `GCS_PROJECT_ID` | ID del progetto Google Cloud | `sgi-cruscotto-123456` |
| `GCS_BUCKET_NAME` | Nome del bucket per file temporanei | `sgi-cruscotto-temp` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path al file JSON credenziali | `/etc/secrets/gcs-credentials.json` |

### Opzionali

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `GCS_KEY_FILE` | Path alternativo al file credenziali | - |

---

## 📊 Monitoraggio e Manutenzione

### Controllare Uso Storage

Nel codice è incluso un monitor che ogni 30 minuti logga:
- Numero di file nel bucket
- Dimensione totale in MB
- File più vecchio/nuovo

Controlla i log di Render per vedere:

```
Cloud Storage monitor check: {
  totalFiles: 5,
  totalSizeMB: 12.34,
  oldestFile: "temp_1234567890_file.xlsx"
}
```

### Cleanup Manuale

Se necessario, puoi pulire manualmente i file:

1. Vai su **Cloud Storage > Browser** nella Console
2. Seleziona il bucket `sgi-cruscotto-temp`
3. Puoi eliminare file manualmente o tutti insieme

### Costi Stimati

Con i pattern d'uso tipici:

- **Storage**: ~$0.02/GB/mese
- **Operazioni**: ~$0.005 per 1000 operazioni
- **Network**: Gratis (egress interno Google Cloud)

**Stima mensile totale**: **< $1/mese** per uso tipico (100-200 file/giorno)

---

## 🔒 Sicurezza

### Best Practices Implementate

✅ **Bucket non pubblico**: Solo il Service Account può accedere  
✅ **Lifecycle automatico**: File eliminati dopo 1 giorno  
✅ **Credenziali sicure**: Stored in Render secret files  
✅ **Prefisso temp_**: Facile identificare file temporanei  
✅ **Metadata tracking**: Ogni file ha timestamp di scadenza  

### Controlli Accesso

- Solo il Service Account può leggere/scrivere
- Nessun accesso pubblico
- Nessun file permanente (tutto temp)

---

## 🚨 Troubleshooting

### Errore: "Google Cloud Storage initialization failed"

**Causa**: Credenziali non valide o mancanti

**Soluzione**:
1. Verifica che `GOOGLE_APPLICATION_CREDENTIALS` punti al file corretto
2. Verifica che il file JSON sia valido
3. Verifica che il Project ID sia corretto

### Errore: "Google Cloud Storage bucket does not exist"

**Causa**: Bucket non trovato o nome errato

**Soluzione**:
1. Verifica che `GCS_BUCKET_NAME` sia corretto
2. Verifica che il bucket esista nella Console
3. Verifica che il Service Account abbia accesso al bucket

### Fallback a /tmp ancora attivo

**Causa**: Cloud Storage non configurato, sistema usa fallback

**Soluzione**:
1. Verifica che tutte le variabili d'ambiente siano impostate
2. Controlla i log per errori di inizializzazione
3. Il fallback è normale in sviluppo locale, ma NON su Render

### File non vengono eliminati

**Causa**: Lifecycle policy non configurata o non attiva

**Soluzione**:
1. Verifica che la lifecycle rule sia attiva nel bucket
2. Può richiedere fino a 24 ore per attivarsi la prima volta
3. Il cleanup manuale nel codice elimina file dopo 1 ora comunque

---

## 📚 Risorse

- [Google Cloud Storage Docs](https://cloud.google.com/storage/docs)
- [Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

---

## ✅ Checklist Setup Completo

- [ ] Progetto Google Cloud creato/selezionato
- [ ] Cloud Storage API abilitata
- [ ] Bucket `sgi-cruscotto-temp` creato
- [ ] Lifecycle policy configurata (1 giorno)
- [ ] Service Account creato o esistente con ruolo Storage Object Admin
- [ ] File JSON credenziali scaricato
- [ ] Variabili d'ambiente configurate su Render
- [ ] Secret file caricato su Render
- [ ] Deploy effettuato
- [ ] Log controllati per conferma funzionamento
- [ ] Test analisi Excel completato con successo

---

## 🎉 Risultati Attesi

Dopo il setup completo:

✅ **Nessun fallimento istanze Render** per storage  
✅ **Analisi Excel più veloci** (parallelizzazione aumentata)  
✅ **Log puliti** senza warning /tmp  
✅ **Costi minimi** (<$1/mese)  
✅ **Scalabilità illimitata** per file temporanei  

---

**Data documento**: Dicembre 2024  
**Versione**: 1.0  
**Autore**: SGI Cruscotto Team
