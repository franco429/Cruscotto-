import React from "react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-xl w-full p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
            Privacy Policy
          </h1>
          <div className="space-y-6 text-gray-700 dark:text-gray-200 text-lg leading-relaxed">
            <p>
              Questa applicazione accede in{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                sola lettura
              </span>{" "}
              al tuo Google Drive esclusivamente per sincronizzare i documenti
              necessari al funzionamento del servizio.
              <br />I dati presenti sul tuo Google Drive{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                non vengono condivisi
              </span>{" "}
              con terze parti ne salvati oltre l'uso previsto dall'applicazione.
              <br />
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                L’applicazione non può in alcun modo modificare, creare o eliminare file sul tuo Google Drive.
              </span>
              <br />
              L'accesso e' limitato alla cartella da te indicata e nessun file
              viene modificato o eliminato senza il tuo consenso.
            </p>
            <p>
              Per qualsiasi domanda sulla privacy, puoi contattare il supporto
              tramite i canali ufficiali dell'applicazione.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
