# Fix: Problema Documenti Obsoleti

## Problema Identificato

Il sistema presentava un bug critico nella gestione dei documenti obsoleti. Ogni volta che un utente effettuava logout e login, tutti i documenti venivano automaticamente rivalutati e quelli con revisioni inferiori venivano marcati come obsoleti, indipendentemente dal fatto che fossero già stati processati correttamente.

### Comportamento Errato
- **Prima**: Tutti i documenti finivano in obsoleti dopo logout/login
- **Dopo**: Solo i documenti con revisioni effettivamente inferiori finiscono in obsoleti

## Causa del Problema

Il problema era nel metodo `getAllDocuments` in `mongo-storage.ts`. La logica di marcatura dei documenti obsoleti veniva eseguita **ogni volta** che si caricavano i documenti, non solo quando veniva aggiunto un nuovo documento.

```typescript
// CODICE PROBLEMATICO (rimosso)
for (let i = 1; i < sorted.length; i++) {
  if (!sorted[i].isObsolete)
    await this.markDocumentObsolete(sorted[i].legacyId);
}
```

## Soluzione Implementata

### 1. Separazione delle Responsabilità

- **`getAllDocuments`**: Ora si occupa solo di recuperare e filtrare i documenti
- **`markObsoleteRevisionsForClient`**: Nuovo metodo dedicato alla marcatura obsoleti

### 2. Chiamate Controllate

La marcatura obsoleti viene ora chiamata solo quando necessario:
- Durante l'upload di documenti da Google Drive
- Durante l'upload di documenti locali
- **NON** durante il caricamento della lista documenti

### 3. Logica Corretta

```typescript
// NUOVA LOGICA
async markObsoleteRevisionsForClient(clientId: number): Promise<void> {
  // Raggruppa per path+title
  // Ordina per revisione
  // Marca obsolete solo le revisioni inferiori
}
```

## File Modificati

### Backend
- `server/mongo-storage.ts`: Separazione logica marcatura obsoleti
- `server/storage.ts`: Aggiornamento interfaccia e implementazione MemStorage
- `server/google-drive.ts`: Uso del nuovo metodo per Google Drive
- `server/routes.ts`: Uso del nuovo metodo per upload locali

### Script di Correzione
- `server/scripts/fix-obsolete-documents.ts`: Script per correggere documenti esistenti

## Come Applicare la Correzione

### 1. Eseguire lo Script di Correzione

```bash
cd server
npm run fix-obsolete
```

Questo script:
- Analizza tutti i client
- Corregge la marcatura obsoleti per ogni client
- Mostra un report dei documenti corretti

### 2. Verificare i Risultati

Dopo l'esecuzione dello script, verificare che:
- Solo i documenti con revisioni effettivamente inferiori siano in obsoleti
- I documenti attivi mostrino solo le revisioni più recenti
- Il logout/login non causi più la marcatura errata

## Esempio di Comportamento Corretto

### Prima della Correzione
```
Documenti attivi: 0 (tutti finivano in obsoleti)
Documenti obsoleti: 10 (tutti i documenti)
```

### Dopo la Correzione
```
Documenti attivi: 8 (solo le revisioni più recenti)
Documenti obsoleti: 2 (solo le revisioni inferiori)
```

## Test di Verifica

1. **Test Logout/Login**: Verificare che i documenti non cambino stato
2. **Test Upload Nuovo**: Verificare che solo le revisioni inferiori diventino obsolete
3. **Test Revisioni Multiple**: Verificare che la logica di confronto funzioni correttamente

## Sicurezza

- ✅ Nessuna perdita di dati
- ✅ Logica di marcatura preservata
- ✅ Compatibilità con documenti esistenti
- ✅ Rollback possibile tramite backup

## Note Tecniche

- La correzione è **non distruttiva**
- I documenti esistenti vengono preservati
- La logica di business rimane invariata
- Performance migliorata (meno operazioni di marcatura) 