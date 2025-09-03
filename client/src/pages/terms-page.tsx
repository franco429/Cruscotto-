import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <AuthNavbar />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
              Termini di Servizio
            </h1>
            
            <div className="space-y-6 text-gray-700 dark:text-gray-200 text-base leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Accettazione dei Termini
                </h2>
                <p>
                  Utilizzando il servizio Pannello di Controllo SGI, accetti di essere vincolato da questi Termini di Servizio. 
                  Se non accetti questi termini, non utilizzare il servizio.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Descrizione del Servizio
                </h2>
                <p>
                  Pannello di Controllo SGI è una piattaforma per la gestione intelligente dei documenti ISO, 
                  che consente di sincronizzare, organizzare e monitorare documenti aziendali 
                  attraverso l'integrazione con Google Drive.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Accesso a Google Drive
                </h2>
                <p>
                  L'accesso al tuo Google Drive tramite questa applicazione è{" "}
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    VOLONTARIO
                  </span>{" "}
                  e avviene solo dopo tua esplicita autorizzazione.
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    L'applicazione NON può in alcun modo modificare, creare o eliminare file sul tuo Google Drive.
                  </span>
                </p>
                <p className="mt-2">
                  L'accesso è limitato alla cartella da te indicata e l'uso è finalizzato esclusivamente 
                  alla gestione dei documenti presenti in quella cartella.
                </p>
                <p className="mt-2">
                  L'utente è responsabile della scelta della cartella e dei dati condivisi tramite l'applicazione.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Account e Registrazione
                </h2>
                <p>
                  Per utilizzare il servizio, devi creare un account valido. Sei responsabile di:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Fornire informazioni accurate e complete durante la registrazione</li>
                  <li>Mantenere la sicurezza del tuo account e password</li>
                  <li>Notificare immediatamente qualsiasi uso non autorizzato</li>
                  <li>Accettare la responsabilità per tutte le attività del tuo account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Uso Accettabile
                </h2>
                <p>
                  Ti impegni a utilizzare il servizio solo per scopi legittimi e in conformità con:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Le leggi e normative applicabili</li>
                  <li>I diritti di proprietà intellettuale</li>
                  <li>Le politiche di Google Drive</li>
                  <li>I termini di questo accordo</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Limitazioni di Responsabilità
                </h2>
                <p>
                  L'applicazione è fornita{" "}
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    "COSÌ COM'È"
                  </span>
                  , senza alcuna garanzia di funzionamento continuo o di idoneità a scopi particolari.
                </p>
                <p className="mt-2">
                  Pannello di Controllo SGI non garantisce che il servizio sarà ininterrotto, sicuro o privo di errori, 
                  né che eventuali difetti saranno corretti.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Proprietà Intellettuale
                </h2>
                <p>
                  Il servizio Pannello di Controllo SGI e il suo contenuto sono protetti da copyright, 
                  marchi commerciali e altre leggi sulla proprietà intellettuale. 
                  Mantieni tutti i diritti sui tuoi documenti e contenuti.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Privacy e Sicurezza
                </h2>
                <p>
                  La protezione della tua privacy è importante per noi. L'utilizzo delle informazioni personali 
                  è regolato dalla nostra{" "}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                    Informativa sulla Privacy
                  </a>
                  , che fa parte integrante di questi termini.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Modifiche ai Termini
                </h2>
                <p>
                  Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. 
                  Le modifiche saranno effettive immediatamente dopo la pubblicazione. 
                  L'uso continuato del servizio costituisce accettazione dei nuovi termini.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Risoluzione del Contratto
                </h2>
                <p>
                  Puoi terminare il tuo account in qualsiasi momento. Ci riserviamo il diritto di sospendere 
                  o terminare l'accesso al servizio per violazioni di questi termini o per qualsiasi altro motivo.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Legge Applicabile
                </h2>
                <p>
                  Questi termini sono regolati dalle leggi italiane. Qualsiasi controversia sarà risolta 
                  dai tribunali competenti di Fabriano (AN), Italia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Contatti
                </h2>
                <p>
                  Per domande sui termini di servizio, contattaci:
                </p>
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-semibold">Pannello di Controllo SGI</p>
                  <p>Email: isodocs178@gmail.com</p>
                  <p>Telefono: +39 3351375593 / +39 3791341270</p>
                  <p>Indirizzo: 60044 Fabriano (AN), Italia</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Accettazione
                </h2>
                <p>
                  L'utilizzo dell'app implica l'accettazione di questi termini. 
                  Se non accetti questi termini, non utilizzare il servizio.
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
