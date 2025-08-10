# Sistema di Caricamento File Moderno con Toast

## Panoramica

È stato implementato un sistema moderno di caricamento file che sostituisce il modale predefinito del browser con un'interfaccia drag & drop moderna e toast di conferma eleganti.

## Caratteristiche Implementate

### 1. Componente ModernFileUpload

**File:** `client/src/components/modern-file-upload.tsx`

- **Drag & Drop**: Supporto completo per trascinare e rilasciare file e cartelle
- **Selezione Cartelle**: Possibilità di selezionare intere cartelle mantenendo la gerarchia
- **Selezione File Multipli**: Selezione di file singoli o multipli
- **Progress Bar**: Indicatore di progresso durante il caricamento
- **Preview File**: Anteprima dei file selezionati con icone e dettagli
- **Gestione Errori**: Toast di errore per file non supportati o errori di caricamento

### 2. Hook useUploadConfirmation

**File:** `client/src/hooks/use-upload-confirmation.tsx`

- **Toast di Conferma**: Sostituisce il modale del browser con toast moderni
- **Dettagli File**: Mostra numero di file, dimensione totale e lista dei file
- **Progress Tracking**: Toast con barra di progresso durante il caricamento
- **Gestione Stati**: Gestione completa degli stati di caricamento

### 3. Gestione Gerarchia Cartelle

**File:** `server/google-drive.ts` e `server/routes.ts`

- **Preservazione Path**: Mantiene la struttura gerarchica delle cartelle
- **Parsing Migliorato**: Funzioni di parsing aggiornate per gestire path completi
- **Visualizzazione Gerarchica**: Mostra la struttura delle cartelle nella tabella documenti

### 4. Aggiornamenti UI/UX

#### Auth Page
- Sostituito l'input file standard con il componente ModernFileUpload
- Migliorata l'esperienza di registrazione con drag & drop

#### Actions Bar
- Dialog moderno per il caricamento di documenti locali
- Integrazione con il sistema di toast per feedback utente

#### Document Table
- Visualizzazione migliorata dei path gerarchici
- Indicatori visivi per la struttura delle cartelle

## Funzionalità Tecniche

### Drag & Drop
```typescript
const { getRootProps, getInputProps, isDragReject } = useDropzone({
  onDrop,
  onDragEnter: () => setIsDragActive(true),
  onDragLeave: () => setIsDragActive(false),
  accept: accept.reduce((acc, ext) => {
    acc[ext] = [];
    return acc;
  }, {} as Record<string, string[]>),
  maxFiles,
  disabled
});
```

### Gestione Path Gerarchici
```typescript
// Se il file ha un webkitRelativePath (cartella selezionata), lo usiamo per mantenere la gerarchia
if ((file as any).webkitRelativePath) {
  filePath = (file as any).webkitRelativePath;
}
```

### Toast di Conferma
```typescript
toast({
  title: `Caricamento ${fileCount} file`,
  description: (
    <div className="space-y-2">
      <p>Dimensione totale: {sizeInMB} MB</p>
      <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
        <pre className="whitespace-pre-wrap">{fileList}{moreFiles}</pre>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => options.onConfirm(files)}>Conferma</button>
        <button onClick={() => options.onCancel?.()}>Annulla</button>
      </div>
    </div>
  ),
  duration: 10000,
});
```

## Vantaggi del Nuovo Sistema

1. **UX Migliorata**: Interfaccia moderna e intuitiva
2. **Nessun Modale Browser**: Eliminazione del popup predefinito del browser
3. **Gerarchia Preservata**: Mantenimento completo della struttura delle cartelle
4. **Feedback Immediato**: Toast informativi per ogni azione
5. **Responsive Design**: Funziona perfettamente su desktop e mobile
6. **Accessibilità**: Supporto completo per screen reader e navigazione da tastiera

## Compatibilità

- **Browser**: Chrome, Firefox, Safari, Edge (moderni)
- **File Supportati**: .xlsx, .xls, .docx, .pdf, .ods, .csv
- **Dimensioni**: Fino a 1000 file per sessione
- **Gerarchia**: Supporto completo per cartelle annidate

## Utilizzo

### Per gli Utenti
1. Trascina e rilascia file o cartelle nell'area di drop
2. Oppure clicca per selezionare file o cartelle manualmente
3. Conferma il caricamento tramite il toast
4. Monitora il progresso durante l'upload
5. Ricevi conferma del completamento

### Per gli Sviluppatori
```typescript
import ModernFileUpload from '../components/modern-file-upload';

<ModernFileUpload
  onFilesSelected={(files) => {
    // Gestisci i file selezionati
  }}
  onUploadComplete={() => {
    // Callback opzionale
  }}
  accept={[".xlsx", ".xls", ".docx", ".pdf"]}
  maxFiles={1000}
  disabled={false}
/>
```

## Sicurezza

- Validazione dei tipi di file
- Limitazione delle dimensioni
- Sanitizzazione dei nomi file
- Controllo degli accessi lato server
- Logging completo delle operazioni

## Performance

- Caricamento asincrono
- Progress tracking in tempo reale
- Gestione efficiente della memoria
- Ottimizzazione per file di grandi dimensioni 