# Configurazione del Servizio Local Opener

Il servizio Local Opener permette di aprire i documenti locali direttamente con l'applicazione predefinita del sistema operativo (es. PDF con Acrobat Reader, Word con Microsoft Word, ecc.).

## Perché serve?

Per motivi di sicurezza, i browser non possono aprire direttamente file locali sul tuo computer. Il servizio Local Opener agisce come ponte sicuro tra il browser e il sistema operativo, permettendo l'apertura dei file solo dalle cartelle autorizzate.

## Come funziona?

1. Quando clicchi sul pulsante "Visualizza" per un documento locale, il browser tenta di contattare il servizio sulla porta 17654
2. Se il servizio è attivo, cerca il file nelle cartelle configurate (principalmente Google Drive) e lo apre
3. Se il servizio non è attivo, viene offerta l'opzione di scaricare il file

## Installazione e Avvio

### Pre-requisiti
- Node.js installato sul computer (versione 14 o superiore)

### Passaggi

1. **Navigare alla cartella del servizio**
   ```bash
   cd local-opener
   ```

2. **Installare le dipendenze**
   ```bash
   npm install
   ```

3. **Avviare il servizio**
   ```bash
   npm start
   ```

   Dovresti vedere un messaggio simile a:
   ```
   [local-opener] Listening on http://127.0.0.1:17654 with roots=C:\Users\[nome]\Google Drive, ...
   ```

### Avvio Automatico (Opzionale)

Per avviare automaticamente il servizio all'avvio del computer:

**Windows:**
1. Crea un file `.bat` con il contenuto:
   ```batch
   cd /d "C:\percorso\al\tuo\progetto\local-opener"
   npm start
   ```
2. Aggiungi questo file all'avvio automatico di Windows

**macOS/Linux:**
1. Crea un servizio systemd o usa `cron` con `@reboot`

## Configurazione delle Cartelle

Il servizio cerca automaticamente i file nelle seguenti posizioni:

### Windows
- `%USERPROFILE%\Google Drive` (Mirror)
- Lettere di unità D-Z che contengono "Il mio Drive" o "My Drive" (Stream)

### macOS
- `/Volumes/GoogleDrive` (Stream)
- `~/Google Drive` (Mirror)

### Aggiungere Cartelle Personalizzate

Se i tuoi file sono in altre posizioni, puoi aggiungere cartelle personalizzate:

```bash
# Via API REST (con il servizio in esecuzione)
curl -X POST http://127.0.0.1:17654/config \
  -H "Content-Type: application/json" \
  -d '{"addRoot": "C:\\percorso\\alla\\tua\\cartella"}'
```

Le configurazioni vengono salvate in `~/.local-opener/config.json`

## Risoluzione Problemi

### Il servizio non si avvia
- Verifica che la porta 17654 non sia già in uso
- Controlla che Node.js sia installato correttamente

### I file non vengono trovati
- Verifica che le cartelle configurate siano corrette
- Controlla che i file esistano effettivamente nel percorso indicato
- Il servizio cerca i file basandosi su nome, revisione e tipo file

### Errore di apertura file
- Verifica che l'applicazione predefinita per quel tipo di file sia configurata nel sistema operativo

## Sicurezza

- Il servizio ascolta solo su localhost (127.0.0.1), non è accessibile da altri computer
- Può aprire file solo dalle cartelle esplicitamente configurate
- Non può eseguire comandi arbitrari, solo aprire file

## Alternative

Se non vuoi o non puoi usare il servizio Local Opener:

1. **Download Manuale**: Quando il servizio non è disponibile, viene offerta l'opzione di scaricare il file
2. **Upload su Google Drive**: Carica i documenti su Google Drive per visualizzarli direttamente nel browser
3. **Anteprima Integrata**: Per alcuni tipi di file (PDF, immagini) è disponibile l'anteprima direttamente nel browser (tramite il pulsante di anteprima)

## Note per gli Sviluppatori

Il codice sorgente del servizio si trova in `local-opener/index.js`. Le principali funzionalità:

- Discovery automatico delle cartelle Google Drive
- Ricerca fuzzy dei file basata su metadati
- Supporto per ricerca profonda nelle sottocartelle (configurabile)
- API REST per gestione configurazione

Per debug, imposta le variabili d'ambiente:
- `LOCAL_OPENER_ROOT`: cartella root personalizzata
- `LOCAL_OPENER_DEEP_SEARCH`: abilita/disabilita ricerca profonda (default: true)
- `LOCAL_OPENER_DEEP_MAX_DEPTH`: profondità massima ricerca (default: 12)
- `LOCAL_OPENER_DEEP_MAX_VISITED`: numero massimo di cartelle da visitare (default: 40000)
