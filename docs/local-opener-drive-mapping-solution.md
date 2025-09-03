# Soluzione Problema Drive Mappati Google Drive Desktop

## Il Problema Tecnico

### Contesto di Esecuzione dei Servizi Windows
Quando si usa NSSM (Non-Sucking Service Manager) per installare un servizio Windows:
- Il servizio viene eseguito nel contesto **SYSTEM** (Local System Account)
- Questo contesto NON ha accesso ai drive mappati dell'utente
- Google Drive Desktop mappa i suoi drive (es. G:/) **solo per l'utente loggato**

### Perché Funziona Manualmente ma Non come Servizio
- **Esecuzione Manuale come Admin**: L'exe gira nel contesto dell'utente admin che ha accesso ai suoi drive mappati
- **Esecuzione come Servizio NSSM**: Gira come SYSTEM che non vede i drive dell'utente

## La Soluzione: Task Scheduler

### Vantaggi di Task Scheduler vs NSSM

| Aspetto | NSSM (Servizio) | Task Scheduler |
|---------|-----------------|----------------|
| Contesto | SYSTEM | Utente specificato |
| Drive Mappati | ❌ Non visibili | ✅ Visibili |
| Complessità | Media | Bassa |
| Native Windows | No (tool esterno) | Sì |
| Multi-utente | Complesso | Semplice |

### Come Task Scheduler Risolve il Problema
```batch
schtasks /create /tn "LocalOpener" /ru "%USERNAME%" /rl highest
```
- `/ru "%USERNAME%"`: Esegue nel contesto dell'utente corrente
- `/rl highest`: Con privilegi elevati ma sempre come utente
- L'utente vede i SUOI drive mappati (G:/, H:/, etc.)

## Implementazione Migliorata

### 1. Delay per Google Drive
Google Drive Desktop potrebbe non essere ancora montato al logon. Soluzione:
```batch
/delay 0000:00:30  # Attende 30 secondi prima di avviare
```

### 2. Multi-Utente per Aziende
Per PC condivisi da più utenti:
```xml
<GroupId>S-1-5-32-545</GroupId>  <!-- Gruppo Users -->
```
Il task gira per OGNI utente che fa login, vedendo i SUOI drive.

### 3. Resilienza
```batch
/ri 1 /rc 3  # Riprova 3 volte ogni minuto se fallisce
```

## Deployment Scalabile (200+ Aziende)

### Architettura Consigliata
```
┌─────────────────┐
│   Intune/GPO    │
│  (Deployment)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Task   │──────► Esegue come Utente
    │Scheduler│       (vede G:/, H:/, etc.)
    └─────────┘
         │
    ┌────▼────┐
    │  Local  │
    │ Opener  │──────► Porta 17654
    └─────────┘
```

### Script Enterprise Features
1. **Log Centralizzati**: `C:\ProgramData\LocalOpener\Logs\%USERNAME%\`
2. **Config Condivisa**: `C:\ProgramData\LocalOpener\Config\`
3. **Firewall Auto**: Apre porta 17654 automaticamente
4. **Antivirus Whitelist**: Esclude percorsi automaticamente

### Monitoraggio e Troubleshooting

#### Verifica Drive Visibili
```batch
# Dal servizio Local Opener
curl http://127.0.0.1:17654/detect-drive-paths
```

#### Log Strutturati
```
C:\ProgramData\LocalOpener\Logs\
├── mario.rossi\
│   ├── LocalOpener.log
│   └── LocalOpener-error.log
├── luigi.bianchi\
│   ├── LocalOpener.log
│   └── LocalOpener-error.log
```

#### Telemetria (Opzionale)
Il servizio può inviare metriche al backend per monitoraggio centralizzato:
- Percorsi rilevati
- Errori comuni
- Performance

## Best Practices

### Sicurezza
1. **Firma Digitale**: Usa certificato EV per l'exe
2. **Least Privilege**: Gira come utente, non SYSTEM
3. **Binding Localhost**: Ascolta solo su 127.0.0.1
4. **No Credenziali**: Non salva/trasmette credenziali

### Performance
1. **Caching**: Cache dei percorsi rilevati
2. **Lazy Loading**: Scansione incrementale
3. **Timeout Brevi**: Max 5 secondi per operazione

### Affidabilità
1. **Retry Logic**: Riprova automaticamente
2. **Fallback**: Download se apertura locale fallisce
3. **Health Check**: Endpoint /health per monitoring

## Conclusione

La soluzione con Task Scheduler è:
- ✅ **Tecnicamente corretta**: Risolve il problema dei drive mappati
- ✅ **Scalabile**: Adatta per 200+ aziende
- ✅ **Sicura**: Segue best practices di sicurezza
- ✅ **Manutenibile**: Log e monitoring integrati

Per deployment enterprise, usa `setup-local-opener-enterprise.bat` che implementa tutte queste best practices automaticamente.
