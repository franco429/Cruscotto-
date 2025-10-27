/**
 * Script di test per verificare la risoluzione della vulnerabilità Proxy Disclosure
 * TAC Security DAST - CWE-200
 * 
 * Testa che i metodi HTTP non sicuri (TRACE, TRACK) siano bloccati
 * e che gli header sensibili (X-Powered-By, Server) non siano esposti
 * 
 * Usage: tsx server/scripts/test-proxy-disclosure.ts
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

/**
 * Test helper function
 */
async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string; details?: string }>
): Promise<void> {
  try {
    console.log(chalk.blue(`\n🧪 Testing: ${name}`));
    const result = await testFn();
    results.push({ name, ...result });
    
    if (result.passed) {
      console.log(chalk.green(`✅ PASS: ${result.message}`));
    } else {
      console.log(chalk.red(`❌ FAIL: ${result.message}`));
    }
    
    if (result.details) {
      console.log(chalk.gray(`   ${result.details}`));
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`❌ ERROR: ${errorMsg}`));
    results.push({
      name,
      passed: false,
      message: 'Test threw an error',
      details: errorMsg
    });
  }
}

/**
 * Test 1: Verifica che TRACE sia bloccato
 */
async function testTraceBlocked(): Promise<{ passed: boolean; message: string; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/test`, {
    method: 'TRACE',
  });
  
  const status = response.status;
  const body = await response.json().catch(() => ({}));
  
  const passed = status === 405 && body.code === 'METHOD_NOT_ALLOWED';
  
  return {
    passed,
    message: passed 
      ? 'TRACE method correctly blocked with 405' 
      : `TRACE method not blocked (status: ${status})`,
    details: `Response: ${JSON.stringify(body)}`
  };
}

/**
 * Test 2: Verifica che OPTIONS senza Origin sia bloccato
 */
async function testOptionsWithoutOriginBlocked(): Promise<{ passed: boolean; message: string; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/test`, {
    method: 'OPTIONS',
    headers: {
      // Nessun header Origin - deve essere bloccato
    }
  });
  
  const status = response.status;
  const body = await response.json().catch(() => ({}));
  
  const passed = status === 405 && body.code === 'METHOD_NOT_ALLOWED';
  
  return {
    passed,
    message: passed 
      ? 'OPTIONS without Origin correctly blocked with 405' 
      : `OPTIONS without Origin not blocked (status: ${status})`,
    details: `Response: ${JSON.stringify(body)}`
  };
}

/**
 * Test 3: Verifica che OPTIONS con Origin sia permesso (CORS preflight)
 */
async function testOptionsWithOriginAllowed(): Promise<{ passed: boolean; message: string; details?: string }> {
  const allowedOrigin = 'http://localhost:5173'; // Origin di sviluppo
  
  const response = await fetch(`${BASE_URL}/api/csrf-token`, {
    method: 'OPTIONS',
    headers: {
      'Origin': allowedOrigin,
      'Access-Control-Request-Method': 'GET',
    }
  });
  
  const status = response.status;
  const corsHeader = response.headers.get('access-control-allow-origin');
  
  // OPTIONS con Origin deve essere permesso (CORS preflight)
  const passed = status === 200 || status === 204;
  
  return {
    passed,
    message: passed 
      ? 'OPTIONS with Origin correctly allowed (CORS preflight)' 
      : `OPTIONS with Origin not properly handled (status: ${status})`,
    details: `CORS header: ${corsHeader || 'not present'}`
  };
}

/**
 * Test 4: Verifica che X-Powered-By non sia presente
 */
async function testNoPoweredByHeader(): Promise<{ passed: boolean; message: string; details?: string }> {
  const response = await fetch(`${BASE_URL}/`, {
    method: 'GET',
  });
  
  const poweredBy = response.headers.get('x-powered-by');
  const passed = !poweredBy;
  
  return {
    passed,
    message: passed 
      ? 'X-Powered-By header not exposed' 
      : `X-Powered-By header exposed: ${poweredBy}`,
    details: poweredBy ? `Found: X-Powered-By: ${poweredBy}` : 'Header correctly absent'
  };
}

/**
 * Test 5: Verifica che Server header non sia presente
 */
async function testNoServerHeader(): Promise<{ passed: boolean; message: string; details?: string }> {
  const response = await fetch(`${BASE_URL}/`, {
    method: 'GET',
  });
  
  const server = response.headers.get('server');
  const passed = !server;
  
  return {
    passed,
    message: passed 
      ? 'Server header not exposed' 
      : `Server header exposed: ${server}`,
    details: server ? `Found: Server: ${server}` : 'Header correctly absent'
  };
}

/**
 * Test 6: Verifica che Allow header sia presente in risposta 405
 */
async function testAllowHeaderPresent(): Promise<{ passed: boolean; message: string; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/test`, {
    method: 'TRACE',
  });
  
  const allowHeader = response.headers.get('allow');
  const passed = !!allowHeader && allowHeader.includes('GET');
  
  return {
    passed,
    message: passed 
      ? 'Allow header correctly present in 405 response' 
      : 'Allow header missing or incorrect',
    details: `Allow: ${allowHeader || 'not present'}`
  };
}

/**
 * Test 7: Verifica che metodi normali funzionino correttamente
 */
async function testNormalMethodsWork(): Promise<{ passed: boolean; message: string; details?: string }> {
  const methods = ['GET', 'POST'];
  const results: string[] = [];
  
  for (const method of methods) {
    const response = await fetch(`${BASE_URL}/api/csrf-token`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify({}) : undefined,
    });
    
    const status = response.status;
    results.push(`${method}: ${status}`);
    
    // GET dovrebbe funzionare (200), POST potrebbe richiedere auth (403/401)
    // ma non deve essere 405 (Method Not Allowed)
    if (status === 405) {
      return {
        passed: false,
        message: `Normal method ${method} incorrectly blocked`,
        details: results.join(', ')
      };
    }
  }
  
  return {
    passed: true,
    message: 'Normal HTTP methods work correctly',
    details: results.join(', ')
  };
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║     TAC Security - Proxy Disclosure Test Suite            ║'));
  console.log(chalk.bold.cyan('║     CWE-200: Information Exposure Prevention              ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));
  
  console.log(chalk.yellow(`Testing URL: ${BASE_URL}`));
  console.log(chalk.gray('Ensure the server is running before executing tests\n'));
  
  // Run all tests
  await runTest('TRACE method blocked', testTraceBlocked);
  await runTest('OPTIONS without Origin blocked', testOptionsWithoutOriginBlocked);
  await runTest('OPTIONS with Origin allowed (CORS)', testOptionsWithOriginAllowed);
  await runTest('X-Powered-By header not exposed', testNoPoweredByHeader);
  await runTest('Server header not exposed', testNoServerHeader);
  await runTest('Allow header present in 405', testAllowHeaderPresent);
  await runTest('Normal HTTP methods work', testNormalMethodsWork);
  
  // Summary
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║                      Test Summary                          ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(chalk.green(`✅ Passed: ${passed}/${total}`));
  console.log(chalk.red(`❌ Failed: ${failed}/${total}`));
  
  if (failed === 0) {
    console.log(chalk.bold.green('\n🎉 All tests passed! Proxy Disclosure vulnerability is resolved.\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\n⚠️  Some tests failed. Please review the implementation.\n'));
    console.log(chalk.yellow('Failed tests:'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(chalk.red(`  - ${r.name}: ${r.message}`));
    });
    process.exit(1);
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error(chalk.red('\n❌ Fatal error running tests:'));
  console.error(error);
  process.exit(1);
});

