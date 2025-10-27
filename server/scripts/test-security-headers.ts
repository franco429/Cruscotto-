#!/usr/bin/env node
/**
 * Script di test per verificare la presenza degli header di sicurezza
 * Conforme alle raccomandazioni TAC Security DAST
 * 
 * Uso:
 * 1. Avviare il server: npm run dev (o npm start in produzione)
 * 2. Eseguire questo script: npx tsx server/scripts/test-security-headers.ts
 */

import http from 'http';
import https from 'https';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000';
const USE_HTTPS = SERVER_URL.startsWith('https://');

// Header di sicurezza richiesti e loro valori attesi
const REQUIRED_SECURITY_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'x-xss-protection': '0', // Helmet v6+ imposta a 0 (deprecato ma sicuro)
  'strict-transport-security': /max-age=\d+/, // Pattern regex per HSTS
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-permitted-cross-domain-policies': 'none',
  'x-download-options': 'noopen',
  'permissions-policy': /geolocation=\(\)/, // Pattern regex parziale
  'content-security-policy': /default-src/, // Pattern regex parziale
  'cross-origin-opener-policy': /(same-origin|same-origin-allow-popups)/,
  'cross-origin-resource-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
};

// Header specifici per endpoint API
const API_SPECIFIC_HEADERS = {
  'cache-control': /no-store/,
  'pragma': 'no-cache',
  'expires': '0',
};

// Header che NON dovrebbero essere presenti (information disclosure)
const FORBIDDEN_HEADERS = [
  'x-powered-by',
  'server',
];

interface TestResult {
  endpoint: string;
  passed: boolean;
  missing: string[];
  incorrect: Array<{ header: string; expected: string | RegExp; actual: string }>;
  forbidden: string[];
}

/**
 * Test degli header di sicurezza su un endpoint
 */
async function testSecurityHeaders(endpoint: string, isApiEndpoint: boolean = false): Promise<TestResult> {
  const url = `${SERVER_URL}${endpoint}`;
  const client = USE_HTTPS ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      const result: TestResult = {
        endpoint,
        passed: true,
        missing: [],
        incorrect: [],
        forbidden: [],
      };

      // Verifica header obbligatori
      const requiredHeaders = { ...REQUIRED_SECURITY_HEADERS };
      if (isApiEndpoint) {
        Object.assign(requiredHeaders, API_SPECIFIC_HEADERS);
      }

      for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
        const actualValue = res.headers[headerName.toLowerCase()];

        if (!actualValue) {
          result.missing.push(headerName);
          result.passed = false;
        } else if (expectedValue instanceof RegExp) {
          if (!expectedValue.test(actualValue as string)) {
            result.incorrect.push({
              header: headerName,
              expected: expectedValue.toString(),
              actual: actualValue as string,
            });
            result.passed = false;
          }
        } else if (actualValue !== expectedValue) {
          result.incorrect.push({
            header: headerName,
            expected: expectedValue,
            actual: actualValue as string,
          });
          result.passed = false;
        }
      }

      // Verifica header vietati
      for (const headerName of FORBIDDEN_HEADERS) {
        if (res.headers[headerName.toLowerCase()]) {
          result.forbidden.push(headerName);
          result.passed = false;
        }
      }

      resolve(result);
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
 * Esegue i test su vari endpoint
 */
async function runTests() {
  console.log('🔐 Test degli Header di Sicurezza - TAC Security DAST Compliance');
  console.log('━'.repeat(70));
  console.log(`Server: ${SERVER_URL}\n`);

  const endpoints = [
    { path: '/', isApi: false, description: 'Homepage' },
    { path: '/api/csrf-token', isApi: true, description: 'Endpoint API pubblico' },
    { path: '/api/health', isApi: true, description: 'Health check API' },
  ];

  let allPassed = true;

  for (const { path, isApi, description } of endpoints) {
    try {
      console.log(`\n📍 Testing: ${description} (${path})`);
      console.log('─'.repeat(70));

      const result = await testSecurityHeaders(path, isApi);

      if (result.passed) {
        console.log('✅ PASSED - Tutti gli header di sicurezza sono presenti e corretti');
      } else {
        console.log('❌ FAILED - Problemi rilevati:\n');
        allPassed = false;

        if (result.missing.length > 0) {
          console.log('  Missing Headers:');
          result.missing.forEach(h => console.log(`    - ${h}`));
        }

        if (result.incorrect.length > 0) {
          console.log('\n  Incorrect Headers:');
          result.incorrect.forEach(({ header, expected, actual }) => {
            console.log(`    - ${header}`);
            console.log(`      Expected: ${expected}`);
            console.log(`      Actual: ${actual}`);
          });
        }

        if (result.forbidden.length > 0) {
          console.log('\n  Forbidden Headers (should be removed):');
          result.forbidden.forEach(h => console.log(`    - ${h}`));
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${(error as Error).message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '━'.repeat(70));
  if (allPassed) {
    console.log('✅ TUTTI I TEST SUPERATI - Applicazione conforme a TAC Security DAST');
    process.exit(0);
  } else {
    console.log('❌ ALCUNI TEST FALLITI - Verificare la configurazione di sicurezza');
    process.exit(1);
  }
}

// Esegui i test
runTests().catch((error) => {
  console.error('Errore durante l\'esecuzione dei test:', error);
  process.exit(1);
});

