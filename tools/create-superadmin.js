import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const { Schema } = mongoose;

// Definizione schema per il contatore di sequenza
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Funzione per ottenere il prossimo valore di sequenza
async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Definizione schema utente
const userSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["superadmin", "admin", "viewer"], default: "viewer" },
  clientId: { type: Number, default: null },
  lastLogin: { type: Date, default: null },
  sessionExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
});

const UserModel = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // Verifica che le variabili d'ambiente siano configurate
    if (!process.env.DB_URI) {
      console.error('❌ Errore: DB_URI non configurata nelle variabili d\'ambiente');
      console.log('💡 Aggiungi DB_URI al file .env o configura la variabile d\'ambiente');
      process.exit(1);
    }

    await mongoose.connect(process.env.DB_URI);
    console.log('✅ Connesso a MongoDB');
    
    // Verifica se esiste già un superadmin
    const existingSuperAdmin = await UserModel.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Attenzione: Esiste già un superadmin nel sistema:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   ID: ${existingSuperAdmin.legacyId}`);
      console.log('   Se vuoi creare un nuovo superadmin, elimina prima quello esistente.');
      return;
    }

    // Richiedi i dati del superadmin
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    console.log('\n🔧 Creazione SuperAdmin - DocumentiIso');
    console.log('=====================================\n');

    const email = await question('📧 Email del superadmin: ');
    const password = await question('🔒 Password del superadmin: ');
    const confirmPassword = await question('🔒 Conferma password: ');

    // Validazioni
    if (!email || !email.includes('@')) {
      console.error('❌ Email non valida');
      rl.close();
      return;
    }

    if (password !== confirmPassword) {
      console.error('❌ Le password non coincidono');
      rl.close();
      return;
    }

    if (password.length < 8) {
      console.error('❌ La password deve contenere almeno 8 caratteri');
      rl.close();
      return;
    }

    // Verifica se l'email è già in uso
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      console.error('❌ Un utente con questa email esiste già');
      rl.close();
      return;
    }

    rl.close();

    // Hash della password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Ottieni il prossimo ID
    const legacyId = await getNextSequence('userId');
    
    // Crea il nuovo superadmin
    const newSuperAdmin = new UserModel({
      id: legacyId,
      email: email,
      password: hashedPassword,
      role: 'superadmin',
      clientId: null, // I superadmin non sono associati a nessun client
      lastLogin: null,
      sessionExpiry: null,
      createdAt: new Date(),
      legacyId: legacyId,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
    
    await newSuperAdmin.save();
    
    console.log('\n✅ SuperAdmin creato con successo!');
    console.log('=====================================');
    console.log({
      id: newSuperAdmin.legacyId,
      email: newSuperAdmin.email,
      role: newSuperAdmin.role,
      clientId: newSuperAdmin.clientId,
      createdAt: newSuperAdmin.createdAt
    });
    
    console.log('\n🔐 Credenziali di accesso:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${'*'.repeat(password.length)}`);
    
    console.log('\n⚠️  ATTENZIONE: Conserva queste credenziali in un luogo sicuro.');
    console.log('   Il superadmin ha accesso completo a tutte le funzionalità del sistema.');
    console.log('   Può creare aziende, gestire codici aziendali e monitorare tutto il sistema.');
    
    console.log('\n🚀 Prossimi passi:');
    console.log('   1. Accedi al sistema con le credenziali del superadmin');
    console.log('   2. Vai alla sezione "Company Codes" per generare codici aziendali');
    console.log('   3. Fornisci i codici alle aziende per la registrazione');
    
  } catch (error) {
    console.error('❌ Errore nella creazione del superadmin:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connessione al database chiusa');
  }
}

// Esegui lo script
createSuperAdmin(); 