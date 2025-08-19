# 🚀 Cruscotto Local Opener - Versione Portable con AVVIO AUTOMATICO

## 📦 Cosa è incluso
- local-opener.exe: L'applicazione principale (36MB)
- nssm.exe: Utility per installare come servizio Windows
- INSTALLA-COME-AMMINISTRATORE.bat: ⭐ INSTALLAZIONE AUTOMATICA (RACCOMANDATO)
- installa-servizio-admin.ps1: Script PowerShell avanzato per installazione
- installa-servizio.bat: Script base (richiede esecuzione manuale come Admin)
- diagnostica-servizio.bat: Verifica stato e risoluzione problemi
- disinstalla-servizio.bat: Rimozione completa servizio
- avvia-manualmente.bat: Test modalità console
- assets/: Risorse dell'applicazione (icone, ecc.)

## 🚀 Come usare - PROCEDURA CORRETTA

### ⭐ METODO RACCOMANDATO: Installazione Automatica
1. **ESEGUI**: "INSTALLA-COME-AMMINISTRATORE.bat"
2. **CLICCA "SÌ"** quando Windows richiede privilegi Amministratore (UAC)
3. **ATTENDI** che lo script completi l'installazione
4. **RIAVVIA IL PC** per testare l'avvio automatico
5. **VERIFICA**: Dopo il riboot, vai su http://127.0.0.1:17654

### 🔧 Metodo Alternativo: Installazione Manuale
1. Tasto destro su "installa-servizio.bat" → "Esegui come amministratore"
2. Se fallisce, usa il metodo raccomandato sopra

### 📊 Verifica Installazione
1. Esegui "diagnostica-servizio.bat" per controllare lo stato
2. Vai su http://127.0.0.1:17654 per testare la connessione
3. Il servizio dovrebbe essere "RUNNING" e configurato per "AUTO_START"

## Configurazione
Il Local Opener si configura automaticamente al primo avvio.
I file di configurazione sono salvati in: %APPDATA%\.local-opener\

## Supporto
Per assistenza, visita: https://cruscotto-sgi.onrender.com

## Requisiti
- Windows 10/11
- Connessione internet per la comunicazione con Cruscotto SGI
