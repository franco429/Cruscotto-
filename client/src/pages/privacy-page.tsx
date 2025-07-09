import React from "react";

export default function PrivacyPage() {
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
      <h1 style={{ color: "#1a73e8" }}>Privacy Policy</h1>
      <p>
        Questa applicazione accede in <strong>sola lettura</strong> al tuo
        Google Drive esclusivamente per sincronizzare i documenti necessari al
        funzionamento del servizio.
        <br />I dati presenti sul tuo Google Drive{" "}
        <strong>non vengono condivisi</strong> con terze parti né salvati oltre
        l’uso previsto dall’applicazione.
        <br />
        L’accesso è limitato alla cartella da te indicata e nessun file viene
        modificato o eliminato senza il tuo consenso.
      </p>
      <p>
        Per qualsiasi domanda sulla privacy, puoi contattare il supporto tramite
        i canali ufficiali dell’applicazione.
      </p>
    </main>
  );
}
