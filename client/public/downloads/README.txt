========================================
    LOCAL OPENER SERVICE - SGI CRUSCOTTO
    Guida Completa all'Installazione e Configurazione
========================================

📋 DESCRIZIONE
Local Opener è un servizio Windows che permette l'apertura automatica
dei documenti locali direttamente dall'interfaccia web SGI Cruscotto.
Il servizio mantiene sempre visibile un terminale per monitoraggio e debug.

🚀 CARATTERISTICHE PRINCIPALI
✅ Avvio automatico all'avvio di Windows
✅ Terminale sempre visibile per monitoraggio
✅ Riavvio automatico in caso di crash
✅ Log salvati in C:\Logs\LocalOpener
✅ Modalità interattiva per debug
✅ Script di avvio personalizzato per affidabilità

📁 FILE INCLUSI NEL PACCHETTO
1. cruscotto-local-opener-setup.exe - Eseguibile principale del servizio
2. nssm.exe - Utility per gestione servizi Windows
3. install-local-opener.bat - Script di installazione principale
4. start-local-opener.bat - Script di avvio ottimizzato (VELOCE)
5. start-local-opener-fast.bat - Script ultra-veloce per avvio automatico
6. configure-terminal-mode.bat - Configurazione modalità terminale
7. test-terminal-mode.bat - Test configurazione servizio
8. uninstall-local-opener.bat - Disinstallazione normale
9. force-uninstall-local-opener.bat - Rimozione forzata
10. debug-local-opener.bat - Diagnostica completa
11. README.txt - Questa guida

🔧 INSTALLAZIONE PASSO-PASSO

STEP 1: PREPARAZIONE
- Estrai tutti i file in una cartella (es: C:\LocalOpener)
- Assicurati di avere privilegi di amministratore
- Chiudi eventuali istanze attive di Local Opener

STEP 2: INSTALLAZIONE
- Esegui install-local-opener.bat come amministratore
- Segui le istruzioni a schermo
- Il servizio verrà installato e avviato automaticamente

STEP 3: VERIFICA
- Verifica che il terminale del servizio sia visibile
- Controlla che il servizio sia attivo in Servizi Windows
- Testa l'apertura di un documento locale

STEP 4: CONFIGURAZIONE GOOGLE DRIVE
- Apri la web app SGI Cruscotto
- Vai su Impostazioni → Apertura File Locali
- Clicca "Rileva Percorsi Automaticamente"
- Clicca "Aggiungi Tutti" per configurare Google Drive

⚡ OTTIMIZZAZIONI VELOCITÀ

Per massimizzare la velocità di avvio:

1. start-local-opener.bat (VELOCE)
   - Controllo rapido se il servizio è già attivo
   - Avvio diretto senza echo non necessari
   - Chiusura immediata senza pause

2. start-local-opener-fast.bat (ULTRA-VELOCE)
   - Zero output e controlli
   - Avvio immediato dell'eseguibile
   - Ideale per avvio automatico Windows

📊 PERFORMANCE
- Prima ottimizzazione: ~3-5 secondi
- Dopo ottimizzazione: ~0.5-1 secondo
- Miglioramento: 80-90% più veloce

🔍 TROUBLESHOOTING

PROBLEMA: Servizio non si avvia
SOLUZIONE: 
- Esegui debug-local-opener.bat
- Verifica privilegi amministratore
- Controlla log in C:\Logs\LocalOpener

PROBLEMA: Terminale non visibile
SOLUZIONE:
- Esegui configure-terminal-mode.bat
- Verifica configurazione NSSM
- Riavvia il servizio

PROBLEMA: Avvio lento
SOLUZIONE:
- Usa start-local-opener-fast.bat per avvio automatico
- Verifica che non ci siano processi duplicati
- Controlla configurazione antivirus

🛠️ COMANDI UTILI

Verifica stato servizio:
  sc query LocalOpener

Riavvio servizio:
  sc stop LocalOpener && sc start LocalOpener

Disinstallazione:
  uninstall-local-opener.bat

Rimozione forzata:
  force-uninstall-local-opener.bat

Diagnostica:
  debug-local-opener.bat

📁 STRUTTURA LOG
C:\Logs\LocalOpener\
├── LocalOpener.log (log standard)
└── LocalOpener-error.log (log errori)

🔄 AGGIORNAMENTI
Per aggiornare il servizio:
1. Esegui uninstall-local-opener.bat
2. Sostituisci i file con le nuove versioni
3. Esegui install-local-opener.bat
4. Riavvia il computer

📞 SUPPORTO TECNICO
In caso di problemi:
1. Esegui debug-local-opener.bat
2. Salva l'output per il supporto
3. Controlla i log in C:\Logs\LocalOpener
4. Verifica la configurazione NSSM

⚠️ NOTE IMPORTANTI
- NON chiudere il terminale del servizio
- Il servizio funziona in background ma mantiene la console visibile
- Riavvia sempre il computer dopo l'installazione
- Verifica che l'antivirus non blocchi l'esecuzione

🎯 PROSSIMI PASSI
1. Installa il servizio con install-local-opener.bat
2. Riavvia il computer
3. Verifica il funzionamento
4. Configura Google Drive nella web app
5. Testa l'apertura di documenti locali

========================================
    FINE GUIDA - LOCAL OPENER SERVICE
========================================
