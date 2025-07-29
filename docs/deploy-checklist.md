# Checklist Deploy Produzione - Backup Worker Fix

## ✅ Pre-Deploy Checklist

### 1. Build e Compilazione
- [ ] Eseguire `npm run build` nella directory `server/`
- [ ] Verificare che il comando completi senza errori
- [ ] Controllare che il file `backup-worker.cjs` sia presente in `server/dist/`
- [ ] Verificare che il file `backup-service.js` sia stato compilato correttamente

### 2. Test Locali
- [ ] Eseguire `npm run verify-build` per verificare i file
- [ ] Testare il servizio di backup localmente
- [ ] Verificare che non ci siano errori di percorso

### 3. Controlli di Sicurezza
- [ ] Verificare che tutti i file abbiano i permessi corretti
- [ ] Controllare che le variabili d'ambiente siano configurate
- [ ] Assicurarsi che il database sia accessibile

## 🚀 Deploy in Produzione

### 1. Upload dei File
- [ ] Caricare tutti i file dalla directory `server/dist/` in produzione
- [ ] Assicurarsi che `backup-worker.cjs` sia presente
- [ ] Verificare che `backup-service.js` sia aggiornato

### 2. Verifica Post-Deploy
- [ ] Controllare i log del server per errori di avvio
- [ ] Testare la funzionalità di backup
- [ ] Verificare che l'errore precedente non si ripresenti

### 3. Monitoraggio
- [ ] Monitorare i log per 24-48 ore dopo il deploy
- [ ] Controllare che i backup vengano creati correttamente
- [ ] Verificare che non ci siano errori di worker thread

## 🔧 Comandi Utili

```bash
# Build completo
npm run build

# Verifica file
npm run verify-build

# Solo worker
npm run build-worker

# Avvio produzione
npm start
```

## 📋 File Critici da Verificare

1. `server/dist/backup-worker.cjs` - File del worker thread
2. `server/dist/backup-service.js` - Servizio di backup compilato
3. `server/dist/index.js` - Applicazione principale

## 🚨 Segnali di Allarme

Se vedi questi errori, il deploy non è andato a buon fine:
- `Cannot find module 'backup-worker.cjs'`
- `Cannot find module 'dist/dist/backup-worker.cjs'`
- `File del worker non trovato`

## ✅ Segnali di Successo

Il deploy è riuscito se:
- Il server si avvia senza errori
- I backup vengono creati correttamente
- Non ci sono errori nei log relativi al worker
- La funzionalità di backup risponde normalmente

## 📞 Supporto

Se riscontri problemi:
1. Controlla i log del server
2. Verifica che tutti i file siano presenti
3. Esegui nuovamente il build
4. Controlla la documentazione in `docs/troubleshooting-backup-worker.md` 