# 🎄 Documentazione Animazioni Natalizie

## 📅 Periodo di Attivazione Automatica

Le animazioni natalizie si attivano **automaticamente** ogni anno nel periodo:
- **Inizio**: 8 Dicembre
- **Fine**: 6 Gennaio (Epifania)

Non è necessaria alcuna configurazione o intervento manuale. Il sistema controlla automaticamente la data e attiva/disattiva le animazioni.

## 🎨 Animazioni Incluse

### 1. ❄️ Neve che Cade
- 60 fiocchi di neve con movimento realistico
- Rotazione e dissolvenza durante la caduta
- Velocità e dimensioni randomizzate

### 2. 🎁 Decorazioni Natalizie
- **Regali rossi** con fiocco
- **Stelle dorate** scintillanti
- **Campanelle dorate** natalizie
- 8 elementi che cadono dall'alto

### 3. 💡 Luci Colorate
- 25 luci lampeggianti nella parte superiore
- 6 colori diversi (rosso, verde, giallo, blu, magenta, rosa)
- Effetto "twinkle" con ombra luminosa

### 4. ⭐ Stelle Comete
- 3 stelle comete che attraversano lo schermo
- Effetto scia luminosa
- Movimento diagonale realistico

### 5. ✨ Particelle Scintillanti
- 20 particelle sparse che appaiono e scompaiono
- Posizioni casuali su tutto lo schermo
- Effetto di brillantezza delicato

## 📄 Pagine con Animazioni

Le animazioni sono attive su tutte le pagine principali:
- Home page pubblica
- Pagina di autenticazione
- Dashboard principale
- Impostazioni
- Gestione clienti
- Gestione utenti
- Gestione backup

## 🧪 Testing in Sviluppo

Per testare le animazioni anche fuori dal periodo natalizio:

1. Crea un file `.env` nella cartella `client/` (se non esiste già)
2. Aggiungi la seguente variabile:

```env
VITE_FORCE_CHRISTMAS=true
```

3. Riavvia il server di sviluppo:

```bash
npm run dev
```

4. Le animazioni saranno ora visibili tutto l'anno in ambiente di sviluppo

**⚠️ Importante**: Ricorda di rimuovere o commentare questa variabile prima del deploy in produzione!

## 🔧 Implementazione Tecnica

### Componente Principale
- **File**: `client/src/components/christmas-snow.tsx`
- Renderizza `null` quando non siamo nel periodo natalizio
- Controlla automaticamente la data ogni ora

### Hook Personalizzato
- **File**: `client/src/hooks/use-christmas-period.ts`
- Gestisce la logica di verifica del periodo
- Supporta la modalità di testing

### Animazioni CSS
- **File**: `client/src/index.css`
- Animazioni pure CSS per performance ottimali
- Keyframes per: snowfall, twinkle, falling-items, shooting-star, sparkle

## 🎯 Caratteristiche Tecniche

- ✅ **Performance**: Animazioni CSS pure (niente JavaScript pesante)
- ✅ **Non invasive**: `pointer-events-none` - non interferiscono con i click
- ✅ **Responsive**: Funzionano su tutti i dispositivi
- ✅ **Automatiche**: Si attivano e disattivano da sole
- ✅ **Leggere**: Minimal impact sulle performance
- ✅ **Z-index alto**: Appaiono sopra tutto il contenuto

## 📝 Note per gli Sviluppatori

### Modificare il Periodo
Per cambiare le date di attivazione, modifica la funzione nel file:
`client/src/hooks/use-christmas-period.ts`

```typescript
// Esempio: attivare dal 1 dicembre al 10 gennaio
if (month === 12 && day >= 1) {  // invece di day >= 8
  setIsChristmasPeriod(true);
  return;
}

if (month === 1 && day <= 10) {  // invece di day <= 6
  setIsChristmasPeriod(true);
  return;
}
```

### Disabilitare Completamente
Per disabilitare le animazioni anche nel periodo natalizio:

1. Rimuovi il componente `<ChristmasSnow />` dalle pagine
2. Oppure modifica il return del componente per restituire sempre `null`

### Personalizzare Animazioni
Per modificare numero di elementi o velocità, modifica le costanti nel file:
`client/src/components/christmas-snow.tsx`

```typescript
// Esempio: più fiocchi di neve
const flakes: Snowflake[] = Array.from({ length: 100 }, ...);  // invece di 60

// Esempio: più decorazioni
const items: FallingItem[] = Array.from({ length: 15 }, ...);  // invece di 8
```

## 🎅 Buone Feste!

Le animazioni sono state create per portare un po' di allegria festiva nell'applicazione.
Goditi la magia del Natale! 🎄✨🎁
