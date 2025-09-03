import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
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
                  Raccogliamo le seguenti informazioni personali:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Indirizzo email per l'autenticazione e le comunicazioni</li>
                  <li>Nome dell'azienda e codice aziendale</li>
                  <li>Informazioni sui documenti caricati o sincronizzati</li>
                  <li>Dati di utilizzo e log di accesso</li>
                </ul>
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
                  Utilizziamo le informazioni raccolte per:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Fornire e mantenere il servizio Pannello di Controllo SGI</li>
                  <li>Gestire l'autenticazione e l'accesso degli utenti</li>
                  <li>Sincronizzare i documenti tra Google Drive e la piattaforma</li>
                  <li>Inviare notifiche relative a scadenze e aggiornamenti</li>
                  <li>Migliorare la qualità del servizio</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Protezione delle Informazioni
                </h2>
                <p>
                  Implementiamo misure di sicurezza appropriate per proteggere le informazioni personali:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Crittografia end-to-end per i dati sensibili</li>
                  <li>Accesso controllato e autenticazione sicura</li>
                  <li>Backup regolari e sicuri</li>
                  <li>Monitoraggio continuo della sicurezza</li>
                </ul>
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
                  <li>Accedere alle tue informazioni personali</li>
                  <li>Correggere informazioni inesatte</li>
                  <li>Richiedere la cancellazione dei tuoi dati</li>
                  <li>Limitare l'utilizzo delle tue informazioni</li>
                  <li>Portabilità dei tuoi dati</li>
                </ul>
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
                  <p>Email: isodocs178@gmail.com</p>
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
