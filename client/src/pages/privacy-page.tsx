import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";
import { usePageSEO } from "../hooks/use-seo";
import ChristmasSnow from "../components/christmas-snow";

export default function PrivacyPage() {
  // SEO per la pagina privacy
  usePageSEO(
    "Privacy Policy", 
    "Informativa sulla privacy di SGI Cruscotto. Scopri come proteggiamo i tuoi dati personali e aziendali."
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Animazione neve natalizia */}
      <ChristmasSnow />
      
      <AuthNavbar />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
              Norme sulla Privacy
            </h1>
            
            <div className="space-y-6 text-gray-700 dark:text-gray-200 text-base leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Informativa sulla Privacy
                </h2>
                <p>
                  La presente informativa descrive come Pannello di Controllo SGI raccoglie, utilizza e protegge le informazioni 
                  personali degli utenti. Questa informativa è conforme al Regolamento Generale sulla Protezione dei Dati (GDPR) 
                  e alle normative italiane sulla privacy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Raccolta delle Informazioni
                </h2>
                <p>
                  Raccogliamo esclusivamente i metadati minimi necessari per il funzionamento del servizio:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Indirizzo email per l'autenticazione e le comunicazioni</li>
                  <li>Nome dell'azienda e codice aziendale</li>
                  <li><strong>Metadati dei documenti</strong>: nome file, data modifica, tipo file, ID Google Drive</li>
                  <li><strong>Valore cella A1</strong>: solo per file Excel/Google Sheets per calcolare scadenze</li>
                  <li>Log di accesso con IP (conservati per 90 giorni per sicurezza)</li>
                </ul>
                <p className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                  <strong>Importante:</strong> NON salviamo mai il contenuto completo dei documenti. 
                  I file vengono scaricati temporaneamente solo per estrarre la cella A1, 
                  poi eliminati immediatamente dal server.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Accesso a Google Drive
                </h2>
                <p>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    Questa applicazione accede in SOLA LETTURA al tuo Google Drive
                  </span>{" "}
                  esclusivamente per sincronizzare i documenti necessari al funzionamento del servizio.
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    I dati presenti sul tuo Google Drive NON vengono condivisi
                  </span>{" "}
                  con terze parti né salvati oltre l'uso previsto dall'applicazione.
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    L'applicazione NON può in alcun modo modificare, creare o eliminare file sul tuo Google Drive.
                  </span>
                </p>
                <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-400">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Limitazioni Tecniche Implementate:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Accesso limitato <strong>solo alla cartella specifica</strong> da te indicata</li>
                    <li>Scope OAuth: <code>drive.readonly</code> (nessun permesso di scrittura)</li>
                    <li>Query Google Drive vincolate alla cartella: <code>'folderId' in parents</code></li>
                    <li>Nessuna query globale o accesso a file esterni alla cartella</li>
                    <li>Per Google Sheets: scope aggiuntivo <code>spreadsheets.readonly</code> solo per leggere cella A1</li>
                  </ul>
                </div>
                <p className="mt-2">
                  L'accesso è limitato alla cartella da te indicata e nessun file viene modificato o eliminato 
                  senza il tuo consenso esplicito.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Utilizzo delle Informazioni
                </h2>
                <p>
                  Utilizziamo le informazioni raccolte esclusivamente per:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Fornire e mantenere il servizio Pannello di Controllo SGI</li>
                  <li>Gestire l'autenticazione e l'accesso degli utenti</li>
                  <li>Sincronizzare i metadati dei documenti dalla cartella Google Drive specificata</li>
                  <li>Estrarre il valore della cella A1 per calcolare le scadenze</li>
                  <li>Inviare notifiche relative a scadenze e aggiornamenti</li>
                  <li>Migliorare la qualità del servizio</li>
                </ul>
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-sm">
                    <strong>Principio di Minimizzazione:</strong> Raccogliamo solo i dati strettamente necessari 
                    per il funzionamento del servizio. Non utilizziamo i dati per finalità diverse da quelle 
                    specificate o per profilazione degli utenti.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Protezione delle Informazioni
                </h2>
                <p>
                  Implementiamo misure di sicurezza appropriate per proteggere le informazioni personali:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li><strong>Crittografia AES-256</strong> per token OAuth e dati sensibili</li>
                  <li><strong>OAuth 2.0 con PKCE</strong> per autenticazione sicura</li>
                  <li><strong>Accesso limitato</strong> con autenticazione multi-fattore opzionale</li>
                  <li><strong>Rate limiting</strong> e protezione da attacchi brute force</li>
                  <li><strong>Backup crittografati</strong> con rotazione automatica delle chiavi</li>
                  <li><strong>Logging sicuro</strong> senza PII superflue</li>
                  <li><strong>HTTPS obbligatorio</strong> per tutte le comunicazioni</li>
                  <li><strong>Security headers</strong> per protezione XSS e CSRF</li>
                </ul>
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <p className="text-sm">
                    <strong>Gestione Token:</strong> I token OAuth vengono crittografati at-rest e mai loggati. 
                    I refresh token vengono invalidati automaticamente in caso di compromissione.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Conservazione dei Dati
                </h2>
                <p>
                  I dati vengono conservati per i seguenti periodi:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li><strong>Metadati documenti</strong>: Fino alla cancellazione dell'account</li>
                  <li><strong>Valori cella A1</strong>: Fino alla cancellazione dell'account</li>
                  <li><strong>Log di accesso</strong>: 90 giorni (per sicurezza e debugging)</li>
                  <li><strong>Token OAuth</strong>: Fino alla revoca o cancellazione account</li>
                  <li><strong>File temporanei</strong>: Eliminati immediatamente dopo l'analisi</li>
                </ul>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-400">
                  <p className="text-sm">
                    <strong>Eliminazione Automatica:</strong> I file scaricati temporaneamente per l'analisi 
                    vengono eliminati immediatamente dopo l'estrazione della cella A1. 
                    Non vengono mai salvati permanentemente sul server.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Condivisione delle Informazioni
                </h2>
                <p>
                  Non vendiamo, scambiamo o trasferiamo le informazioni personali a terze parti, 
                  eccetto nei casi previsti dalla legge o con il tuo consenso esplicito.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  I Tuoi Diritti
                </h2>
                <p>
                  Hai il diritto di:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li><strong>Accesso</strong>: Richiedere una copia dei tuoi dati personali</li>
                  <li><strong>Rettifica</strong>: Correggere informazioni inesatte o incomplete</li>
                  <li><strong>Cancellazione</strong>: Richiedere la cancellazione dei tuoi dati ("diritto all'oblio")</li>
                  <li><strong>Limitazione</strong>: Limitare l'utilizzo delle tue informazioni</li>
                  <li><strong>Portabilità</strong>: Ricevere i tuoi dati in formato strutturato</li>
                  <li><strong>Opposizione</strong>: Opporti al trattamento dei tuoi dati</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm">
                    <strong>Endpoint di Cancellazione:</strong> È disponibile un endpoint dedicato 
                    per l'eliminazione completa dell'account e di tutti i dati associati. 
                    Contattaci per richiedere l'eliminazione immediata.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Contatti
                </h2>
                <p>
                  Per qualsiasi domanda sulla privacy o per esercitare i tuoi diritti, 
                  puoi contattarci:
                </p>
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold">Pannello di Controllo SGI</p>
                  <p>Email: docgenius8@gmail.com</p>
                  <p>Telefono: +39 3351375593 / +39 3791341270</p>
                  <p>Indirizzo: 60044 Fabriano (AN), Italia</p>
                </div>
              </section>


              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Aggiornamenti alla Privacy Policy
                </h2>
                <p>
                  Questa informativa può essere aggiornata periodicamente. Ti notificheremo 
                  eventuali modifiche significative tramite email o attraverso la piattaforma.
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
