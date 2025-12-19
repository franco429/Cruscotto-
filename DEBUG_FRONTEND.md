# Debug Frontend - Documenti Non Visualizzati

## Problema
La sincronizzazione completa correttamente sul server (432 documenti processati, 148 attivi), ma il frontend mostra una tabella vuota.

## Checklist Debug

### 1. Verifica Console Browser (F12)
Apri la console del browser e controlla:
- [ ] Ci sono errori JavaScript?
- [ ] Ci sono errori di rete?
- [ ] Ci sono warning di React Query?

### 2. Verifica Network Tab (F12 → Network)
Controlla:
- [ ] Viene fatta una richiesta a `/api/documents?paginated=true...`?
- [ ] Se sì, qual è la risposta HTTP (status code)?
- [ ] Se sì, cosa contiene il body della risposta?
- [ ] Se no, perché non viene fatta la richiesta?

### 3. Verifica Autenticazione
Nella console del browser, esegui:
```javascript
// Controlla se l'utente è loggato
console.log('User:', localStorage.getItem('user'));
```

### 4. Verifica React Query DevTools
Se hai React Query DevTools installato:
- [ ] La query `/api/documents` è presente?
- [ ] Qual è lo stato della query (loading, error, success)?
- [ ] Cosa contiene `data`?

### 5. Testa Manualmente l'Endpoint
Nella console del browser, esegui:
```javascript
fetch('/api/documents?paginated=true&page=1&limit=50&status=all&search=&sortBy=path&sortOrder=asc', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('Documenti:', data))
  .catch(err => console.error('Errore:', err));
```

## Possibili Cause

1. **Query disabilitata**: L'hook `useDocumentsPaginated` potrebbe avere `enabled: false`
2. **Errore autenticazione**: Cookie di sessione scaduto o mancante
3. **CORS/Proxy**: Problema di configurazione tra frontend (5173) e backend
4. **Error boundary**: Un errore React che impedisce il rendering
5. **Filtro nasconde tutti**: Un filtro attivo nasconde tutti i documenti

## Output Atteso

Se tutto funziona, nella Network tab dovresti vedere:
- **Request**: `GET /api/documents?paginated=true&page=1&limit=50&status=all&search=&sortBy=path&sortOrder=asc`
- **Response**: 
```json
{
  "documents": [ /* array di documenti */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 148,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "stats": {
    "total": 148,
    "expired": 8,
    "warning": 3,
    "valid": 137
  }
}
```

## Prossimi Passi

Dopo aver raccolto queste informazioni, potremo identificare esattamente dove si blocca il caricamento dei documenti.
