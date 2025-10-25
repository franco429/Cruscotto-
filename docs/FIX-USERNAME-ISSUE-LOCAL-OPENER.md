# Fix per Problema USERNAME in setup-local-opener-task.bat

## Problema Identificato

Il file `setup-local-opener-task.bat` presentava un errore durante l'installazione quando il nome utente Windows conteneva caratteri speciali, spazi o caratteri accentati.

### Sintomi
- Errore "user id strano" durante l'esecuzione dello script
- Fallimento nella creazione del task scheduler
- Messaggi di errore generici senza dettagli specifici

### Causa Root
Il comando `schtasks` alla riga 57 del file originale:
```batch
schtasks /create /tn "%TASK_NAME%" /tr "%WRAPPER_PATH%" /sc onlogon /ru "%USERNAME%" /rl highest /f /delay 0000:30
```

Non gestiva correttamente i caratteri speciali nella variabile `%USERNAME%`, causando errori di parsing nel Task Scheduler di Windows.

## Soluzione Implementata

### 1. Validazione del Nome Utente
```batch
:: Verifica se il nome utente contiene caratteri problematici
echo %SAFE_USERNAME% | findstr /R "[^a-zA-Z0-9._-]" >nul
```

### 2. Gestione Multi-Metodo
La soluzione implementa tre metodi di fallback:

1. **Metodo 1**: Tentativo con il nome utente originale
2. **Metodo 2**: Fallback su utente SYSTEM se il primo fallisce
3. **Metodo 3**: Creazione senza specificare utente se entrambi falliscono

### 3. Messaggi di Debug Migliorati
- Visualizzazione del nome utente corrente
- Avvisi per caratteri speciali rilevati
- Messaggi di stato per ogni tentativo
- Dettagli tecnici in caso di errore completo

### 4. Gestione Errori Robusta
```batch
if %errorlevel% neq 0 (
    echo ERRORE: Impossibile creare il task scheduler!
    echo.
    echo Possibili soluzioni:
    echo 1. Verifica che il nome utente non contenga caratteri speciali
    echo 2. Esegui lo script come amministratore
    echo 3. Controlla che il Task Scheduler sia abilitato
    echo 4. Prova a creare manualmente il task dal Task Scheduler
```

## File Modificati

1. `client/public/downloads/local-opener-complete-package/setup-local-opener-task.bat`
2. `client/public/downloads/temp-verify/setup-local-opener-task.bat`

## Test Consigliati

### Test Case 1: Nome Utente Standard
- Utente: `john.doe`
- Risultato atteso: Creazione task con nome utente originale

### Test Case 2: Nome Utente con Spazi
- Utente: `John Doe`
- Risultato atteso: Fallback su SYSTEM o creazione senza utente specifico

### Test Case 3: Nome Utente con Caratteri Speciali
- Utente: `José María`
- Risultato atteso: Fallback su SYSTEM o creazione senza utente specifico

### Test Case 4: Nome Utente con Simboli
- Utente: `user@domain`
- Risultato atteso: Fallback su SYSTEM o creazione senza utente specifico

## Note Tecniche

- La regex `[^a-zA-Z0-9._-]` identifica caratteri non alfanumerici (eccetto punto, underscore e trattino)
- Il fallback su SYSTEM garantisce che il task venga creato anche con nomi utente problematici
- La creazione senza specificare utente è l'ultimo tentativo per garantire la funzionalità

## Compatibilità

- Windows 10/11
- Task Scheduler di Windows
- Batch files con caratteri UTF-8

## Monitoraggio

Per verificare che la soluzione funzioni:
1. Controllare i log di sistema Windows
2. Verificare la creazione del task nel Task Scheduler
3. Testare l'esecuzione automatica al logon
4. Monitorare i log di Local Opener per errori

## Aggiornamenti Futuri

Considerare l'implementazione di:
- Escape automatico dei caratteri speciali
- Supporto per domini Windows (DOMAIN\username)
- Validazione più granulare dei caratteri problematici
- Logging dettagliato per debugging avanzato
