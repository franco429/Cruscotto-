import React from "react";

export default function TermsPage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 700,
        margin: "40px auto",
        padding: 24,
        background: "#fafbfc",
        color: "#222",
      }}
    >
      <h1 style={{ color: "#1a73e8" }}>Termini di Servizio</h1>
      <p>
        L’accesso al tuo Google Drive tramite questa applicazione è{" "}
        <strong>volontario</strong> e avviene solo dopo tua esplicita
        autorizzazione.
        <br />
        L’applicazione è fornita <strong>così com’è</strong>, senza alcuna
        garanzia di funzionamento continuo o di idoneità a scopi particolari.
        <br />
        L’uso è finalizzato esclusivamente alla gestione dei documenti presenti
        nella cartella da te indicata su Google Drive.
        <br />
        L’utente è responsabile della scelta della cartella e dei dati condivisi
        tramite l’applicazione.
      </p>
      <p>
        L’utilizzo dell’app implica l’accettazione di questi termini. Per dubbi
        o richieste, contatta il supporto.
      </p>
    </main>
  );
}
