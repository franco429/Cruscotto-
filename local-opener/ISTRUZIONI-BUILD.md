# 🚀 Guida Rapida al Build

## ✅ Problema Risolto
L'errore `"iscc" non è riconosciuto` è stato risolto! Ora il sistema funziona anche senza Inno Setup installato.

## 📋 Comandi Disponibili

### Raccomandato: Versione Portable
```bash
npm run build:portable
```
✅ **Sempre funziona** - Non richiede software aggiuntivo  
📁 **Output**: `dist/portable/` con tutto il necessario  
🎯 **Per**: Distribuzione manuale, testing, uso immediato

### Automatico: Installer (con fallback)
```bash
npm run build:installer
```
🔍 **Rileva automaticamente** se Inno Setup è disponibile  
✅ Se disponibile → Crea installer completo  
🔄 Se NON disponibile → Crea versione portable automaticamente

### Solo Eseguibile
```bash
npm run build
```
📦 **Output**: Solo `dist/local-opener.exe`  
🎯 **Per**: Sviluppo, testing rapido

## 🎯 Quale Usare?

| Situazione | Comando |
|------------|---------|
| **Uso normale** | `npm run build:portable` |
| **Non so cosa ho** | `npm run build:installer` |
| **Sviluppo/test** | `npm run build` |

## 📁 Cosa Ottieni

### Con `build:portable`
```
dist/portable/
├── local-opener.exe         # Applicazione principale
├── nssm.exe                # Per installare come servizio
├── installa-servizio.bat   # Script di installazione automatica
├── disinstalla-servizio.bat # Script di rimozione
├── avvia-manualmente.bat   # Per test rapidi
├── README.txt              # Istruzioni complete
└── config-esempio.json     # Configurazione di esempio
```

**Pronto per:**
- ✅ Copiare su altri PC
- ✅ Installazione automatica come servizio Windows
- ✅ Distribuzione senza dipendenze

## 🛠️ Installazione Inno Setup (Opzionale)

Se vuoi l'installer completo con wizard:
1. Scarica: https://jrsoftware.org/isinfo.php
2. Installa Inno Setup 6.x
3. Riprova: `npm run build:installer`

## ✨ Vantaggi della Soluzione

- 🚫 **Niente più errori**: Funziona sempre, con o senza Inno Setup
- 🎯 **Scelta flessibile**: Portable per uso immediato, installer per enterprise
- 🔄 **Auto-fallback**: Se Inno Setup non c'è, crea automaticamente il portable
- 📋 **Tutto incluso**: Scripts, documentazione, configurazione di esempio
