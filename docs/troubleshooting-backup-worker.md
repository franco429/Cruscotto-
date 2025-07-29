# Troubleshooting Backup Worker

## Errore: "Cannot find module '/opt/render/project/src/server/dist/dist/backup-worker.cjs'"

### Causa del Problema
Questo errore si verifica quando il sistema non riesce a trovare il file del worker thread per il backup. Il problema principale è nel percorso del file, che viene costruito in modo errato.

### Soluzione Implementata

1. **Correzione del percorso del worker**: 
   - Il file `backup-service.ts` è stato aggiornato per utilizzare il percorso corretto
   - Rimosso il duplicato `dist/dist/` nel percorso

2. **Verifica dell'esistenza del file**:
   - Aggiunto controllo per verificare che il file del worker esista prima di tentare di avviarlo
   - Messaggio di errore più chiaro che indica il problema

3. **Miglioramento della gestione degli errori**:
   - Gestione più robusta degli errori del worker thread
   - Messaggi di errore più descrittivi

### Script di Verifica

È stato aggiunto uno script `verify-build` che controlla che il file del worker sia stato generato correttamente:

```bash
npm run verify-build
```

### Processo di Build

Il processo di build ora include automaticamente la verifica:

```bash
npm run build
```

Questo comando:
1. Compila il worker (`build-worker`)
2. Compila l'applicazione principale e il servizio di backup
3. Verifica che il file del worker esista (`verify-build`)

**Nota**: Il build ora include esplicitamente `backup-service.ts` per assicurarsi che venga compilato correttamente.

### Prevenzione Futura

Per evitare questo problema in futuro:

1. **Sempre eseguire il build completo** prima del deploy:
   ```bash
   npm run build
   ```

2. **Verificare che il file esista** dopo il build:
   ```bash
   npm run verify-build
   ```

3. **Controllare i log di build** per eventuali errori di compilazione

### Struttura dei File Attesa

Dopo il build, la struttura dovrebbe essere:

```
server/
├── dist/
│   ├── index.js
│   └── backup-worker.cjs  ← Questo file deve esistere
├── backup-worker.ts
└── backup-service.ts
```

### Debug

Se il problema persiste:

1. Controllare che il file `backup-worker.cjs` esista in `server/dist/`
2. Verificare i permessi del file
3. Controllare che esbuild sia installato e funzionante
4. Verificare che non ci siano errori di sintassi in `backup-worker.ts` 