# Configurazione LINK_SECRET_KEY

## Problema Risolto

Prima di questa correzione, se `LINK_SECRET_KEY` non era configurata nelle variabili d'ambiente, il sistema generava automaticamente una chiave casuale. Questo causava:

- **Invalidazione di tutti i link sicuri esistenti** ad ogni riavvio del server
- **Impossibilità di accedere ai documenti condivisi** dopo un restart
- **Vulnerabilità di sicurezza** dovuta a chiavi non persistenti

## Soluzione Implementata

### 1. Verifica Obbligatoria
`LINK_SECRET_KEY` è ora **obbligatoria** e viene verificata all'avvio del server tramite `verify-env.ts`.

### 2. Errore Fatale
Se la chiave non è configurata, il server **non si avvia** e mostra un errore chiaro.

### 3. Persistenza Garantita
La chiave deve essere configurata una sola volta e rimane costante tra i riavvii.

## Configurazione

### Sviluppo Locale
Nel file `.env`:
```env
LINK_SECRET_KEY=your-secret-key-here-min-32-chars
```

### Produzione
Genera una chiave sicura:
```bash
# Genera una chiave di 64 caratteri esadecimali
openssl rand -hex 32

# Oppure usa Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Esempio di Chiave
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

## Best Practices

1. **Lunghezza minima**: 32 byte (64 caratteri esadecimali)
2. **Complessità**: Usa solo caratteri esadecimali (0-9, a-f)
3. **Sicurezza**: Non condividere mai questa chiave
4. **Backup**: Conserva la chiave in un luogo sicuro
5. **Rotazione**: Cambia la chiave solo se compromessa

## Impatto sui Link Esistenti

⚠️ **ATTENZIONE**: Se cambi `LINK_SECRET_KEY` in produzione, **tutti i link sicuri esistenti diventeranno invalidi**. Pianifica la rotazione con attenzione.

## Test della Configurazione

```bash
# Verifica che tutte le variabili d'ambiente siano configurate
npm run verify-env

# Se tutto ok, il comando termina con exit code 0
``` 