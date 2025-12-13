import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";
import ChristmasSnow from "../components/christmas-snow";

export default function CookiePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Animazione neve natalizia */}
      <ChristmasSnow />
      
      <AuthNavbar />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
              Policy sui Cookie
            </h1>
            
            <div className="space-y-6 text-gray-700 dark:text-gray-200 text-base leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Cosa sono i Cookie
                </h2>
                <p>
                  I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo 
                  quando visiti un sito web. Questi file contengono informazioni che aiutano 
                  a migliorare la tua esperienza di navigazione e a fornire funzionalità personalizzate.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Come Utilizziamo i Cookie
                </h2>
                <p>
                  Pannello di Controllo SGI utilizza i cookie per:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Mantenere la tua sessione attiva durante la navigazione</li>
                  <li>Ricordare le tue preferenze e impostazioni</li>
                  <li>Migliorare le prestazioni e la sicurezza del servizio</li>
                  <li>Analizzare l'utilizzo del servizio per ottimizzazioni</li>
                  <li>Fornire funzionalità personalizzate</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Tipi di Cookie Utilizzati
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">
                      Cookie Essenziali
                    </h3>
                    <p>
                      Questi cookie sono necessari per il funzionamento del servizio e non possono essere disabilitati. 
                      Includono cookie per l'autenticazione, la sicurezza e le funzionalità di base.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">
                      Cookie Funzionali
                    </h3>
                    <p>
                      Questi cookie migliorano la funzionalità e le prestazioni del servizio, 
                      ricordando le tue preferenze e personalizzando l'esperienza.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">
                      Cookie Analitici
                    </h3>
                    <p>
                      Utilizziamo questi cookie per comprendere come gli utenti utilizzano il servizio, 
                      identificare problemi e migliorare continuamente l'esperienza utente.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Cookie di Terze Parti
                </h2>
                <p>
                  Il nostro servizio può utilizzare cookie di terze parti per:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Integrazione con Google Drive per la sincronizzazione</li>
                  <li>Analisi delle prestazioni e monitoraggio</li>
                  <li>Servizi di sicurezza e protezione</li>
                </ul>
                <p className="mt-2">
                  Questi servizi hanno le proprie policy sui cookie che ti invitiamo a consultare.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Gestione dei Cookie
                </h2>
                <p>
                  Puoi controllare e gestire i cookie attraverso le impostazioni del tuo browser:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Disabilitare tutti i cookie (può limitare le funzionalità)</li>
                  <li>Eliminare i cookie esistenti</li>
                  <li>Impostare avvisi quando vengono impostati nuovi cookie</li>
                  <li>Gestire cookie specifici per sito</li>
                </ul>
                <p className="mt-2">
                  <strong>Nota:</strong> La disabilitazione di alcuni cookie può compromettere 
                  il funzionamento del servizio Pannello di Controllo SGI.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Cookie e Sicurezza
                </h2>
                <p>
                  I cookie utilizzati da Pannello di Controllo SGI sono progettati per:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Proteggere la tua sessione e i dati personali</li>
                  <li>Prevenire accessi non autorizzati</li>
                  <li>Mantenere la sicurezza delle comunicazioni</li>
                  <li>Rilevare attività sospette</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Aggiornamenti alla Policy sui Cookie
                </h2>
                <p>
                  Questa policy sui cookie può essere aggiornata per riflettere cambiamenti 
                  nelle nostre pratiche o per altri motivi operativi, legali o normativi. 
                  Ti notificheremo eventuali modifiche significative.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Contatti
                </h2>
                <p>
                  Per domande sulla nostra policy sui cookie, contattaci:
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
                  Collegamenti Utili
                </h2>
                <p>
                  Per maggiori informazioni sui cookie e la privacy:
                </p>
                <div className="mt-3 space-y-2">
                  <a 
                    href="/privacy" 
                    className="block text-blue-600 hover:text-blue-800 underline"
                  >
                    → Informativa sulla Privacy
                  </a>
                  <a 
                    href="/terms" 
                    className="block text-blue-600 hover:text-blue-800 underline"
                  >
                    → Termini di Servizio
                  </a>
                </div>
              </section>

              <section>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
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
