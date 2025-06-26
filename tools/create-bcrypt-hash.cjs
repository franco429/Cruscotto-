const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("--- Generatore di Hash per Super-Amministratore ---");
console.log("Scegli una password che rispetti i seguenti requisiti:");
console.log("- Almeno 8 caratteri");
console.log("- Almeno una lettera maiuscola (A-Z)");
console.log("- Almeno una lettera minuscola (a-z)");
console.log("- Almeno un numero (0-9)");
console.log("- Almeno un carattere speciale (@$!%*?&)");
console.log("-----------------------------------------------------");

rl.question('Inserisci la nuova password per il superadmin: ', (password) => {
  // Controlla i requisiti di base (corrispondono a quelli in auth.ts)
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongPasswordRegex.test(password)) {
    console.error("\nERRORE: La password non rispetta i requisiti di sicurezza.");
    rl.close();
    return;
  }

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Errore durante la generazione dell\'hash:', err);
    } else {
      console.log('\n--- Hash Generato ---');
      console.log('Copia e incolla questa stringa nel comando MongoDB:\n');
      console.log(hash);
      console.log('\n---------------------');
    }
    rl.close();
  });
}); 