import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-xl w-full p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
            Termini di Servizio
          </h1>
          <div className="space-y-6 text-gray-700 dark:text-gray-200 text-lg leading-relaxed">
            <p>
              L'accesso al tuo Google Drive tramite questa applicazione e'{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                volontario
              </span>{" "}
              e avviene solo dopo tua esplicita autorizzazione.
              <br />
              L'applicazione e' fornita{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                cosi' com'e'
              </span>
              , senza alcuna garanzia di funzionamento continuo o di idoneita' a
              scopi particolari.
              <br />
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                L’applicazione non può in alcun modo modificare, creare o eliminare file sul tuo Google Drive.
              </span>
              <br />
              L'uso e' finalizzato esclusivamente alla gestione dei documenti
              presenti nella cartella da te indicata su Google Drive.
              <br />
              L'utente e' responsabile della scelta della cartella e dei dati
              condivisi tramite l'applicazione.
            </p>
            <p>
              L'utilizzo dell'app implica l'accettazione di questi termini. Per
              dubbi o richieste, contatta il supporto.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
