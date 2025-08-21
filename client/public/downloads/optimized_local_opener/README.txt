===============================================================================
                    CRUSCOTTO LOCAL OPENER - VERSIONE OTTIMIZZATA
===============================================================================

DESCRIZIONE:
Servizio Windows ottimizzato per aprire documenti locali direttamente dal 
Cruscotto SGI. Questa versione elimina file inutili e riduce i tempi di 
installazione mantenendo tutte le funzionalità essenziali.

CARATTERISTICHE PRINCIPALI:
✓ Installazione automatica come servizio Windows persistente
✓ Avvio automatico ad ogni accensione del PC
✓ Rilevamento intelligente di tutti i percorsi Google Drive
✓ Supporto completo per Google Drive Desktop e Backup & Sync
✓ Resilienza e restart automatico in caso di errori
✓ Diagnostica completa integrata
✓ Configurazione zero-touch per gli utenti

INSTALLAZIONE RAPIDA:
1. Estrai tutti i file in una cartella del PC cliente
2. Esegui "INSTALLA-COME-AMMINISTRATORE.bat" 
3. Clicca "Si" quando richiesto per i privilegi amministratore
4. Attendi il completamento dell'installazione (circa 30 secondi)
5. Il servizio sarà attivo e configurato automaticamente

CONTENUTO PACCHETTO:
- index.js                          : Script principale servizio (ottimizzato)
- local-opener.exe                  : Eseguibile binario compilato
- nssm.exe                          : Service manager Windows
- package.json                      : Dipendenze (solo cors ed express)
- INSTALLA-COME-AMMINISTRATORE.bat  : Installer principale
- installa-servizio-admin.ps1       : Script PowerShell installazione
- auto-detect-google-drive.ps1      : Rilevamento percorsi ottimizzato
- DISINSTALLA-LOCAL-OPENER.bat      : Disinstallazione completa
- disinstalla-servizio-admin.ps1    : Script PowerShell disinstallazione
- diagnostica-servizio.bat          : Diagnostica problemi
- diagnostica-servizio.ps1          : Script PowerShell diagnostica
- assets/                           : Icone e risorse
- README.txt                        : Questo file

COSA È STATO OTTIMIZZATO:
✓ Rimossi completamente i node_modules (riduzione da ~50MB a ~2MB)
✓ Eliminati script duplicati e file di sviluppo
✓ Corrette dipendenze mancanti (telemetry.js, auto-updater.js)
✓ Semplificato il processo di installazione
✓ Migliorata la ricerca percorsi Google Drive
✓ Aggiunto feedback visivo dettagliato durante l'installazione
✓ Ottimizzata gestione errori e resilienza del servizio

REQUISITI SISTEMA:
- Windows 7/8/10/11 (32-bit o 64-bit)
- Privilegi amministratore (richiesti automaticamente)
- Porta 17654 disponibile (configurata automaticamente nel firewall)
- Google Drive installato (opzionale, può essere configurato manualmente)

UTILIZZO:
Una volta installato, il servizio:
1. Si avvia automaticamente ad ogni accensione del PC
2. Rileva automaticamente tutti i percorsi Google Drive
3. Rimane in ascolto su http://127.0.0.1:17654
4. Risponde alle richieste dal Cruscotto per aprire documenti

RISOLUZIONE PROBLEMI:
1. Esegui "diagnostica-servizio.bat" per analisi completa
2. Controlla i log in: %APPDATA%\.local-opener\
3. Verifica stato servizio in "services.msc" → "CruscottoLocalOpener"
4. In caso di problemi, disinstalla e reinstalla completamente

SUPPORTO:
- URL servizio: http://127.0.0.1:17654
- Status: http://127.0.0.1:17654/health
- Configurazione: http://127.0.0.1:17654/config

DISINSTALLAZIONE:
Esegui "DISINSTALLA-LOCAL-OPENER.bat" per rimozione completa del servizio.

===============================================================================
Versione: 1.0.0 Ottimizzata
Cruscotto SGI Team
===============================================================================
