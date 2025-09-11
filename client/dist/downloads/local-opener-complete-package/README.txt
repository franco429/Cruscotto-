========================================
    LOCAL OPENER SERVICE - Pannello Di Controllo SGI
    Guida Completa all'Installazione e Configurazione
    CON APERTURA AUTOMATICA DEL TERMINALE
========================================

📋 DESCRIZIONE
Local Opener è un servizio Windows che permette l'apertura automatica
dei documenti locali direttamente dall'interfaccia web Pannello Di Controllo SGI.
Il servizio mantiene sempre visibile un terminale per monitoraggio e debug.
ORA CON APERTURA AUTOMATICA DEL TERMINALE ALL'AVVIO DI WINDOWS!

🚀 CARATTERISTICHE PRINCIPALI
 Avvio automatico all'avvio di Windows
 Terminale sempre visibile per monitoraggio
 Riavvio automatico in caso di crash
 Log salvati in C:\Logs\LocalOpener
 Modalità interattiva per debug
 Script di avvio personalizzato per affidabilità
 Task Scheduler per apertura automatica del terminale
 Loop infinito per mantenere il terminale sempre attivo
 Apertura automatica del terminale ad ogni avvio di Windows

📁 FILE INCLUSI NEL PACCHETTO
1. cruscotto-local-opener-setup.exe - Eseguibile principale del servizio
2. nssm.exe - Utility per gestione servizi Windows
3. install-local-opener.bat - Script di installazione principale
4. start-local-opener.bat - Script di avvio personalizzato con loop infinito
5. start-local-opener-fast.bat - Script ultra-veloce per avvio automatico
6. configure-terminal-mode.bat - Configurazione modalità terminale
7. test-terminal-mode.bat - Test configurazione servizio
8. uninstall-local-opener.bat - Disinstallazione completa
9. force-uninstall-local-opener.bat - Rimozione forzata
10. debug-local-opener.bat - Diagnostica completa
11. verify-installation.bat - Verifica rapida installazione
12. fix-installation.bat - Ripristino rapido installazione difettosa
13. auto-open-terminal.bat - Script per task scheduler automatico
14. configure-google-drive-paths.bat - Configurazione automatica Google Drive
15. README.txt - Questa guida

🔧 INSTALLAZIONE PASSO-PASSO

STEP 1: PREPARAZIONE
- Estrai tutti i file in una cartella (es: C:\LocalOpener)
- Assicurati di avere privilegi di amministratore
- Chiudi eventuali istanze attive di Local Opener

STEP 2: INSTALLAZIONE
- Esegui install-local-opener.bat come amministratore
- Segui le istruzioni a schermo
- Il servizio verrà installato e avviato automaticamente
- IL TASK SCHEDULER PER APERTURA AUTOMATICA SARÀ CONFIGURATO

STEP 3: VERIFICA
- Esegui verify-installation.bat per controllo completo
- Verifica che il terminale del servizio sia visibile
- Controlla che il servizio sia attivo in Servizi Windows
- Verifica che il task scheduler sia configurato

STEP 4: CONFIGURAZIONE GOOGLE DRIVE
- Apri la web app Pannello Di Controllo SGI
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

🆕 NUOVE FUNZIONALITÀ - APERTURA AUTOMATICA TERMINALE

 **Task Scheduler Automatico**
- Crea automaticamente un task Windows che si avvia ad ogni login utente
- Apre automaticamente il terminale del servizio Local Opener
- Funziona anche se Google Drive Desktop non è ancora montato

 **Rilevamento Completo Percorsi Google Drive**
- **SCANSIONE COMPLETA**: Controlla TUTTE le unità da A: a Z:
- **Percorsi Supportati**:
  • A:\IL MIO DRIVE, A:\MY DRIVE, A:\Google Drive, A:\GoogleDrive
  • B:\IL MIO DRIVE, B:\MY DRIVE, B:\Google Drive, B:\GoogleDrive
  • C:\Users\[Username]\Google Drive, C:\Users\[Username]\My Drive
  • D:\Users\[Username]\Google Drive, D:\Users\[Username]\My Drive
  • E:\Users\[Username]\Google Drive, E:\Users\[Username]\My Drive
  • F:\Users\[Username]\Google Drive, F:\Users\[Username]\My Drive
  • G:\IL MIO DRIVE, G:\MY DRIVE, G:\Google Drive, G:\GoogleDrive
  • H:\IL MIO DRIVE, H:\MY DRIVE, H:\Google Drive, H:\GoogleDrive
  • I:\IL MIO DRIVE, I:\MY DRIVE, I:\Google Drive, I:\GoogleDrive
  • J:\IL MIO DRIVE, J:\MY DRIVE, J:\Google Drive, J:\GoogleDrive
  • K:\IL MIO DRIVE, K:\MY DRIVE, K:\Google Drive, K:\GoogleDrive
  • L:\IL MIO DRIVE, L:\MY DRIVE, L:\Google Drive, L:\GoogleDrive
  • M:\IL MIO DRIVE, M:\MY DRIVE, M:\Google Drive, M:\GoogleDrive
  • N:\IL MIO DRIVE, N:\MY DRIVE, N:\Google Drive, N:\GoogleDrive
  • O:\IL MIO DRIVE, O:\MY DRIVE, O:\Google Drive, O:\GoogleDrive
  • P:\IL MIO DRIVE, P:\MY DRIVE, P:\Google Drive, P:\GoogleDrive
  • Q:\IL MIO DRIVE, Q:\MY DRIVE, Q:\Google Drive, Q:\GoogleDrive
  • R:\IL MIO DRIVE, R:\MY DRIVE, R:\Google Drive, R:\GoogleDrive
  • S:\IL MIO DRIVE, S:\MY DRIVE, S:\Google Drive, S:\GoogleDrive
  • T:\IL MIO DRIVE, T:\MY DRIVE, T:\Google Drive, T:\GoogleDrive
  • U:\IL MIO DRIVE, U:\MY DRIVE, U:\Google Drive, U:\GoogleDrive
  • V:\IL MIO DRIVE, V:\MY DRIVE, V:\Google Drive, V:\GoogleDrive
  • W:\IL MIO DRIVE, W:\MY DRIVE, W:\Google Drive, W:\GoogleDrive
  • X:\IL MIO DRIVE, X:\MY DRIVE, X:\Google Drive, X:\GoogleDrive
  • Y:\IL MIO DRIVE, Y:\MY DRIVE, Y:\Google Drive, Y:\GoogleDrive
  • Z:\IL MIO DRIVE, Z:\MY DRIVE, Z:\Google Drive, Z:\GoogleDrive

 **Rilevamento Avanzato**
- Controlla anche percorsi come: GDrive, DriveFS, GoogleDriveFS
- Verifica File Stream, Desktop, Sync, Backup, Mirror, Clone
- Scansione registro Windows per percorsi nascosti
- Rilevamento automatico con retry per avvio automatico

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

PROBLEMA: Terminale non si apre automaticamente all'avvio
SOLUZIONE:
- Verifica che il task scheduler sia configurato
- Esegui: schtasks /query /tn LocalOpenerTerminal
- Se mancante, esegui configure-terminal-mode.bat
- Riavvia il computer per testare

PROBLEMA: Avvio lento
SOLUZIONE:
- Usa start-local-opener-fast.bat per avvio automatico
- Verifica che non ci siano processi duplicati
- Controlla configurazione antivirus

🛠️ COMANDI UTILI

Verifica stato servizio:
  sc query LocalOpener

Verifica task scheduler:
  schtasks /query /tn LocalOpenerTerminal

Riavvio servizio:
  sc stop LocalOpener && sc start LocalOpener

Esegui task scheduler manualmente:
  schtasks /run /tn LocalOpenerTerminal

Disinstallazione completa:
  uninstall-local-opener.bat

Rimozione forzata:
  force-uninstall-local-opener.bat

Diagnostica:
  debug-local-opener.bat

Test configurazione:
  test-terminal-mode.bat

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
5. Verifica il task scheduler

⚠️ NOTE IMPORTANTI
- NON chiudere il terminale del servizio
- Il servizio funziona in background ma mantiene la console visibile
- Riavvia sempre il computer dopo l'installazione
- Verifica che l'antivirus non blocchi l'esecuzione
- Il task scheduler garantisce l'apertura automatica del terminale
- Il servizio mantiene il terminale sempre aperto con loop infinito

🚀 PROSSIMI PASSI
echo 1. Verifica che il terminale del servizio sia visibile
echo 2. Riavvia il computer per testare l'avvio automatico
echo 3. Verifica che il terminale si apra automaticamente
echo 4. Apri la pagina Impostazioni → Apertura File Locali
echo 5. Clicca "Rileva Percorsi Automaticamente"
echo 6. Clicca "Aggiungi Tutti" per configurare Google Drive
echo.
echo 🔍 VERIFICA RAPIDA:
echo - Esegui verify-installation.bat per controllo completo
echo - Verifica tutti i componenti in una volta sola
echo - Identifica eventuali problemi di configurazione

🔧 VERIFICA INSTALLAZIONE COMPLETA
Dopo l'installazione, verifica che:
1. Il servizio LocalOpener sia attivo
2. Il terminale del servizio sia visibile
3. Il task scheduler LocalOpenerTerminal sia configurato
4. All'avvio di Windows il terminale si apra automaticamente
5. Il servizio mantenga il terminale sempre aperto

========================================
    FINE GUIDA - LOCAL OPENER SERVICE
    CON APERTURA AUTOMATICA DEL TERMINALE
========================================

🚨 PROBLEMI COMUNI E SOLUZIONI

❌ PROBLEMA: "Il servizio si avvia ma il terminale non si apre"
 SOLUZIONE: Esegui fix-installation.bat come amministratore

❌ PROBLEMA: "Il servizio non si avvia automaticamente con Windows"
 SOLUZIONE: Verifica con verify-installation.bat e ripara con fix-installation.bat

❌ PROBLEMA: "Google Drive non viene rilevato automaticamente"
 SOLUZIONE: Esegui configure-google-drive-paths.bat per scansione completa

❌ PROBLEMA: "Installazione precedente difettosa"
 SOLUZIONE: Esegui force-uninstall-local-opener.bat e poi install-local-opener.bat
