#!/usr/bin/env tsx

/**
 * Test Script - HSTS Header Verification
 * 
 * Verifica la corretta implementazione dell'header Strict-Transport-Security
 * Conforme a TAC Security DAST - CWE-319 Resolution
 * 
 * Usage:
 *   npm run dev  # In un terminale
 *   npx tsx server/scripts/test-hsts-header.ts  # In un altro terminale
 * 
 * @version 1.0.0
 * @date 2025-10-27
 */

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string;
}

const results: TestResult[] = [];

/**
 * Colori per output console
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Logger con colori
 */
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Test 1: HSTS Header Presente
 */
async function testHstsPresent(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/', {
      headers: {
        'X-Forwarded-Proto': 'https', // Simula proxy HTTPS
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (hstsHeader) {
      return {
        test: 'HSTS Header Present',
        status: 'PASS',
        message: 'Header Strict-Transport-Security presente',
        details: hstsHeader,
      };
    } else {
      return {
        test: 'HSTS Header Present',
        status: 'FAIL',
        message: 'Header Strict-Transport-Security NON presente',
        details: 'Verificare configurazione trust proxy e middleware HSTS',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS Header Present',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 2: Max-Age Corretto (almeno 31536000 = 1 anno)
 */
async function testHstsMaxAge(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/', {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (!hstsHeader) {
      return {
        test: 'HSTS Max-Age',
        status: 'FAIL',
        message: 'Header HSTS non presente',
      };
    }

    // Estrae max-age dal header
    const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
    
    if (!maxAgeMatch) {
      return {
        test: 'HSTS Max-Age',
        status: 'FAIL',
        message: 'Direttiva max-age non trovata',
        details: hstsHeader,
      };
    }

    const maxAge = parseInt(maxAgeMatch[1], 10);
    const oneYear = 31536000;
    const twoYears = 63072000;
    
    if (maxAge >= twoYears) {
      return {
        test: 'HSTS Max-Age',
        status: 'PASS',
        message: `max-age=${maxAge} (2 anni) - Conforme OWASP raccomandato`,
        details: `${Math.floor(maxAge / 31536000 * 10) / 10} anni`,
      };
    } else if (maxAge >= oneYear) {
      return {
        test: 'HSTS Max-Age',
        status: 'WARNING',
        message: `max-age=${maxAge} (≥1 anno) - Conforme minimo, raccomandato 2 anni`,
        details: `${Math.floor(maxAge / 31536000 * 10) / 10} anni`,
      };
    } else {
      return {
        test: 'HSTS Max-Age',
        status: 'FAIL',
        message: `max-age=${maxAge} - NON conforme (minimo 1 anno richiesto)`,
        details: 'Aumentare max-age ad almeno 31536000 (1 anno)',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS Max-Age',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 3: includeSubDomains Direttiva
 */
async function testHstsIncludeSubDomains(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/', {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (!hstsHeader) {
      return {
        test: 'HSTS includeSubDomains',
        status: 'FAIL',
        message: 'Header HSTS non presente',
      };
    }

    if (hstsHeader.includes('includeSubDomains')) {
      return {
        test: 'HSTS includeSubDomains',
        status: 'PASS',
        message: 'Direttiva includeSubDomains presente',
        details: 'HSTS applicato a tutti i sottodomini',
      };
    } else {
      return {
        test: 'HSTS includeSubDomains',
        status: 'WARNING',
        message: 'Direttiva includeSubDomains NON presente',
        details: 'Raccomandato per protezione completa di tutti i sottodomini',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS includeSubDomains',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 4: preload Direttiva
 */
async function testHstsPreload(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/', {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (!hstsHeader) {
      return {
        test: 'HSTS preload',
        status: 'FAIL',
        message: 'Header HSTS non presente',
      };
    }

    if (hstsHeader.includes('preload')) {
      return {
        test: 'HSTS preload',
        status: 'PASS',
        message: 'Direttiva preload presente',
        details: 'Sito eligibile per HSTS Preload List (https://hstspreload.org)',
      };
    } else {
      return {
        test: 'HSTS preload',
        status: 'WARNING',
        message: 'Direttiva preload NON presente',
        details: 'Opzionale ma raccomandato per sicurezza massima',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS preload',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 5: HSTS su endpoint API
 */
async function testHstsOnApiEndpoint(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/api/csrf-token', {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (hstsHeader) {
      return {
        test: 'HSTS on API Endpoints',
        status: 'PASS',
        message: 'Header HSTS presente su endpoint API',
        details: hstsHeader,
      };
    } else {
      return {
        test: 'HSTS on API Endpoints',
        status: 'FAIL',
        message: 'Header HSTS NON presente su endpoint API',
        details: 'HSTS deve essere presente su tutte le risposte',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS on API Endpoints',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 6: HSTS senza trust proxy (non dovrebbe essere presente)
 */
async function testHstsWithoutTrustProxy(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/');
    
    const hstsHeader = response.headers.get('strict-transport-security');

    if (!hstsHeader) {
      return {
        test: 'HSTS without Trust Proxy',
        status: 'PASS',
        message: 'HSTS correttamente NON applicato su HTTP senza trust proxy',
        details: 'Comportamento corretto: HSTS solo su HTTPS',
      };
    } else {
      return {
        test: 'HSTS without Trust Proxy',
        status: 'WARNING',
        message: 'HSTS presente anche senza trust proxy',
        details: 'Potrebbe essere NODE_ENV=production - verificare configurazione',
      };
    }
  } catch (error) {
    return {
      test: 'HSTS without Trust Proxy',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 7: Formato Header Corretto
 */
async function testHstsFormat(): Promise<TestResult> {
  try {
    const response = await fetch('http://localhost:5000/', {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    const hstsHeader = response.headers.get('strict-transport-security');

    if (!hstsHeader) {
      return {
        test: 'HSTS Format Validation',
        status: 'FAIL',
        message: 'Header HSTS non presente',
      };
    }

    // Verifica formato: max-age=<number>; includeSubDomains; preload
    const formatRegex = /^max-age=\d+(?:;\s*includeSubDomains)?(?:;\s*preload)?$/i;
    
    if (formatRegex.test(hstsHeader)) {
      return {
        test: 'HSTS Format Validation',
        status: 'PASS',
        message: 'Formato header HSTS corretto',
        details: hstsHeader,
      };
    } else {
      return {
        test: 'HSTS Format Validation',
        status: 'FAIL',
        message: 'Formato header HSTS non valido',
        details: hstsHeader,
      };
    }
  } catch (error) {
    return {
      test: 'HSTS Format Validation',
      status: 'FAIL',
      message: 'Errore durante il test',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Stampa risultati test
 */
function printResults(results: TestResult[]) {
  log('\n' + '='.repeat(80), colors.blue);
  log('  HSTS HEADER VERIFICATION TEST RESULTS', colors.bold + colors.blue);
  log('  TAC Security DAST - CWE-319 Compliance', colors.blue);
  log('='.repeat(80) + '\n', colors.blue);

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
    const color = result.status === 'PASS' ? colors.green : result.status === 'FAIL' ? colors.red : colors.yellow;

    log(`${index + 1}. ${result.test}`, colors.bold);
    log(`   ${icon} ${result.message}`, color);
    
    if (result.details) {
      log(`   Details: ${result.details}`, colors.reset);
    }
    
    log(''); // Empty line

    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else if (result.status === 'WARNING') warnings++;
  });

  log('='.repeat(80), colors.blue);
  log(`\nRESULTS SUMMARY:`, colors.bold);
  log(`  ✓ Passed:   ${passed}`, colors.green);
  log(`  ✗ Failed:   ${failed}`, colors.red);
  log(`  ⚠ Warnings: ${warnings}`, colors.yellow);
  log(`  Total:      ${results.length}\n`, colors.reset);

  if (failed === 0 && warnings === 0) {
    log('🎉 ALL TESTS PASSED! HSTS is correctly configured.', colors.green + colors.bold);
    log('✅ Conforme a TAC Security DAST - CWE-319\n', colors.green);
    return 0;
  } else if (failed === 0) {
    log('⚠️  ALL CRITICAL TESTS PASSED with warnings.', colors.yellow + colors.bold);
    log('   Review warnings and consider improvements.\n', colors.yellow);
    return 0;
  } else {
    log('❌ SOME TESTS FAILED. Please fix the issues.', colors.red + colors.bold);
    log('   See details above for resolution steps.\n', colors.red);
    return 1;
  }
}

/**
 * Main test runner
 */
async function main() {
  log('\nStarting HSTS Header Verification Tests...', colors.blue);
  log('Testing against: http://localhost:5000\n', colors.reset);
  log('⏳ Running tests...\n', colors.yellow);

  // Verifica che il server sia in esecuzione
  try {
    await fetch('http://localhost:5000/');
  } catch (error) {
    log('❌ ERROR: Cannot connect to http://localhost:5000', colors.red + colors.bold);
    log('   Make sure the server is running: npm run dev\n', colors.red);
    process.exit(1);
  }

  // Esegui tutti i test
  results.push(await testHstsPresent());
  results.push(await testHstsMaxAge());
  results.push(await testHstsIncludeSubDomains());
  results.push(await testHstsPreload());
  results.push(await testHstsOnApiEndpoint());
  results.push(await testHstsWithoutTrustProxy());
  results.push(await testHstsFormat());

  // Stampa risultati
  const exitCode = printResults(results);

  // Informazioni aggiuntive
  log('='.repeat(80), colors.blue);
  log('ADDITIONAL INFORMATION:', colors.bold);
  log('');
  log('To test on production:', colors.reset);
  log('  curl -I https://cruscotto-sgi.com | grep -i strict-transport-security', colors.yellow);
  log('');
  log('Expected output:', colors.reset);
  log('  strict-transport-security: max-age=63072000; includeSubDomains; preload', colors.green);
  log('');
  log('Online verification tools:', colors.reset);
  log('  • https://securityheaders.com/?q=https://cruscotto-sgi.com', colors.yellow);
  log('  • https://www.ssllabs.com/ssltest/', colors.yellow);
  log('  • https://hstspreload.org/?domain=cruscotto-sgi.com', colors.yellow);
  log('');
  log('Documentation:', colors.reset);
  log('  • server/docs/TAC-SECURITY-CWE-319-RESOLUTION.md', colors.yellow);
  log('  • server/docs/TAC-SECURITY-DAST-COMPLIANCE.md', colors.yellow);
  log('='.repeat(80) + '\n', colors.blue);

  process.exit(exitCode);
}

// Run tests
main().catch((error) => {
  log('\n❌ FATAL ERROR:', colors.red + colors.bold);
  log(error instanceof Error ? error.message : String(error), colors.red);
  process.exit(1);
});

