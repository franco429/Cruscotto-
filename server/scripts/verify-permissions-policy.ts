#!/usr/bin/env node
/**
 * Script di verifica rapida per Permissions-Policy Header
 * Conforme a TAC Security DAST - CWE-693 Resolution
 * 
 * Uso:
 * 1. Avviare il server: npm run dev (o npm start in produzione)
 * 2. Eseguire questo script: npx tsx server/scripts/verify-permissions-policy.ts
 */

import http from 'http';
import https from 'https';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000';
const USE_HTTPS = SERVER_URL.startsWith('https://');

// Valore atteso del Permissions-Policy header
const EXPECTED_POLICIES = [
  'geolocation=()',
  'microphone=()',
  'camera=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()'
];

interface VerificationResult {
  present: boolean;
  value?: string;
  allPoliciesPresent: boolean;
  missingPolicies: string[];
}

/**
 * Verifica la presenza e correttezza del Permissions-Policy header
 */
async function verifyPermissionsPolicy(endpoint: string = '/'): Promise<VerificationResult> {
  const url = `${SERVER_URL}${endpoint}`;
  const client = USE_HTTPS ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      const headerValue = res.headers['permissions-policy'] as string | undefined;

      if (!headerValue) {
        resolve({
          present: false,
          allPoliciesPresent: false,
          missingPolicies: EXPECTED_POLICIES,
        });
        return;
      }

      // Verifica che tutte le policy attese siano presenti
      const missingPolicies = EXPECTED_POLICIES.filter(policy => !headerValue.includes(policy));

      resolve({
        present: true,
        value: headerValue,
        allPoliciesPresent: missingPolicies.length === 0,
        missingPolicies,
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Errore nella richiesta a ${url}: ${err.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout nella richiesta a ${url}`));
    });
  });
}

/**
 * Esegue la verifica
 */
async function runVerification() {
  console.log('🔐 Verifica Permissions-Policy Header - CWE-693 Resolution');
  console.log('━'.repeat(70));
  console.log(`Server: ${SERVER_URL}\n`);

  const endpoints = [
    { path: '/', description: 'Homepage' },
    { path: '/api/csrf-token', description: 'Endpoint API' },
  ];

  let allPassed = true;

  for (const { path, description } of endpoints) {
    try {
      console.log(`📍 Testing: ${description} (${path})`);
      console.log('─'.repeat(70));

      const result = await verifyPermissionsPolicy(path);

      if (!result.present) {
        console.log('❌ FAILED - Permissions-Policy header NON PRESENTE');
        console.log('\n⚠️  L\'header deve essere configurato in server/security.ts\n');
        allPassed = false;
        continue;
      }

      console.log('✅ Header presente');
      console.log(`   Value: ${result.value}\n`);

      if (!result.allPoliciesPresent) {
        console.log('⚠️  WARNING - Alcune policy mancanti:');
        result.missingPolicies.forEach(policy => console.log(`   - ${policy}`));
        console.log('');
        allPassed = false;
      } else {
        console.log('✅ Tutte le policy richieste sono presenti:');
        EXPECTED_POLICIES.forEach(policy => console.log(`   ✓ ${policy}`));
        console.log('');
      }
    } catch (error) {
      console.log(`❌ ERROR: ${(error as Error).message}\n`);
      allPassed = false;
    }
  }

  console.log('━'.repeat(70));
  if (allPassed) {
    console.log('✅ VERIFICA SUPERATA - Permissions-Policy correttamente configurato');
    console.log('\n📋 Conformità:');
    console.log('   ✓ CWE-693: Resolved');
    console.log('   ✓ TAC Security DAST: Compliant');
    console.log('   ✓ Tutte le API browser non necessarie bloccate');
    console.log('\n📚 Documentazione:');
    console.log('   → server/docs/TAC-SECURITY-CWE-693-RESOLUTION.md');
    process.exit(0);
  } else {
    console.log('❌ VERIFICA FALLITA - Verificare la configurazione');
    console.log('\n🔧 Azioni consigliate:');
    console.log('   1. Verificare che il server sia avviato');
    console.log('   2. Controllare server/security.ts (righe 222-229)');
    console.log('   3. Riavviare il server dopo le modifiche');
    console.log('\n📚 Riferimenti:');
    console.log('   → server/docs/TAC-SECURITY-CWE-693-RESOLUTION.md');
    process.exit(1);
  }
}

// Esegui la verifica
runVerification().catch((error) => {
  console.error('Errore durante l\'esecuzione della verifica:', error);
  process.exit(1);
});

