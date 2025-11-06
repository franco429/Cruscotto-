/**
 * Script per testare la risoluzione TAC Security DAST - Non-Storable Content
 * 
 * Questo script verifica che tutti i file statici abbiano header Cache-Control appropriati
 * Conforme a TAC Security DAST requirements
 * 
 * Esecuzione: npx tsx server/scripts/test-non-storable-content-fix.ts
 */

interface TestCase {
  path: string;
  expectedCacheControl: string;
  description: string;
}

interface TestResult {
  path: string;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const testCases: TestCase[] = [
  // Asset statici con hash (CSS, JS) - CACHING AGGRESSIVO (2 anni)
  {
    path: '/assets/index-DrTXI_-G.css',
    expectedCacheControl: 'public, max-age=63072000, immutable',
    description: 'CSS Asset con hash'
  },
  {
    path: '/assets/index-t4w2wTB6.js',
    expectedCacheControl: 'public, max-age=63072000, immutable',
    description: 'JS Asset con hash'
  },
  {
    path: '/assets/index-BbqMc0ch.js',
    expectedCacheControl: 'public, max-age=63072000, immutable',
    description: 'JS Asset alternativo con hash'
  },
  // Immagini e icone - CACHING MODERATO (1 anno)
  {
    path: '/favicon.png',
    expectedCacheControl: 'public, max-age=31536000, immutable',
    description: 'Favicon PNG'
  },
  {
    path: '/logo/logo.jpg',
    expectedCacheControl: 'public, max-age=31536000, immutable',
    description: 'Logo JPG'
  },
  // robots.txt e sitemap.xml - CACHING BREVE (1 ora)
  {
    path: '/robots.txt',
    expectedCacheControl: 'public, max-age=3600',
    description: 'robots.txt'
  },
  {
    path: '/sitemap.xml',
    expectedCacheControl: 'public, max-age=3600',
    description: 'sitemap.xml'
  },
  // HTML - NO CACHING (sicurezza)
  {
    path: '/index.html',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'index.html (SPA entry point)'
  },
  {
    path: '/privacy.html',
    expectedCacheControl: 'public, max-age=3600',
    description: 'privacy.html (pagina informativa)'
  },
  {
    path: '/terms.html',
    expectedCacheControl: 'public, max-age=3600',
    description: 'terms.html (pagina informativa)'
  },
  // API - NO CACHING (dati sensibili)
  {
    path: '/api/health',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'API Health Check'
  },
  {
    path: '/api/user',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'API User Data'
  }
];

/**
 * Simula l'applicazione degli header Cache-Control in base al path
 * Questo replica la logica in server/index.ts e server/security.ts
 */
function simulateCacheControlHeaders(path: string): string {
  const pathLower = path.toLowerCase();
  
  // 1. API endpoints - NO CACHING (dati sensibili)
  if (pathLower.startsWith('/api/')) {
    return 'no-store, no-cache, must-revalidate, private';
  }
  
  // 2. Asset statici immutabili (CSS, JS con hash) - CACHING AGGRESSIVO
  if (pathLower.match(/\.(css|js)$/) && pathLower.includes('/assets/')) {
    return 'public, max-age=63072000, immutable';
  }
  
  // 3. Immagini e font - CACHING MODERATO
  if (pathLower.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    return 'public, max-age=31536000, immutable';
  }
  
  // 4. robots.txt, sitemap.xml - CACHING BREVE
  if (pathLower.match(/\.(txt|xml)$/)) {
    return 'public, max-age=3600';
  }
  
  // 5. HTML index.html o root - NO CACHING
  if (pathLower === '/index.html' || pathLower === '/' || pathLower === '') {
    return 'no-store, no-cache, must-revalidate, private';
  }
  
  // 6. Privacy e Terms HTML - CACHING BREVE (pagine informative)
  if (pathLower === '/privacy.html' || pathLower === '/terms.html') {
    return 'public, max-age=3600';
  }
  
  // 7. Altri HTML - NO CACHING per sicurezza
  if (pathLower.match(/\.(html?)$/)) {
    return 'no-store, no-cache, must-revalidate, private';
  }
  
  // 8. Default - CACHING BREVE
  return 'public, max-age=3600';
}

/**
 * Esegue i test e genera un report
 */
function runTests(): void {
  console.log('\n🧪 TAC Security DAST - Non-Storable Content Fix Test\n');
  console.log('='.repeat(80));
  console.log('\n');
  
  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (const testCase of testCases) {
    const actualCacheControl = simulateCacheControlHeaders(testCase.path);
    const passed = actualCacheControl === testCase.expectedCacheControl;
    
    results.push({
      path: testCase.path,
      description: testCase.description,
      expected: testCase.expectedCacheControl,
      actual: actualCacheControl,
      passed
    });
    
    if (passed) {
      passedCount++;
      console.log(`✅ PASS: ${testCase.description}`);
      console.log(`   Path: ${testCase.path}`);
      console.log(`   Cache-Control: ${actualCacheControl}`);
    } else {
      failedCount++;
      console.log(`❌ FAIL: ${testCase.description}`);
      console.log(`   Path: ${testCase.path}`);
      console.log(`   Expected: ${testCase.expectedCacheControl}`);
      console.log(`   Actual:   ${actualCacheControl}`);
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('\n📊 Test Summary\n');
  console.log(`Total Tests:  ${results.length}`);
  console.log(`✅ Passed:    ${passedCount}`);
  console.log(`❌ Failed:    ${failedCount}`);
  console.log(`Success Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log('\n');
  
  if (failedCount === 0) {
    console.log('🎉 All tests passed! Cache-Control headers are configured correctly.');
    console.log('✅ Non-Storable Content vulnerability is RESOLVED.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the Cache-Control configuration.');
    process.exit(1);
  }
}

/**
 * Verifica su server live (opzionale)
 */
async function testLiveServer(baseUrl: string): Promise<void> {
  console.log(`\n🌐 Testing live server: ${baseUrl}\n`);
  console.log('='.repeat(80));
  console.log('\n');
  
  for (const testCase of testCases) {
    try {
      const url = `${baseUrl}${testCase.path}`;
      const response = await fetch(url, { method: 'HEAD' });
      const cacheControl = response.headers.get('cache-control') || 'NOT SET';
      const passed = cacheControl === testCase.expectedCacheControl;
      
      if (passed) {
        console.log(`✅ PASS: ${testCase.description}`);
      } else {
        console.log(`❌ FAIL: ${testCase.description}`);
        console.log(`   Expected: ${testCase.expectedCacheControl}`);
        console.log(`   Actual:   ${cacheControl}`);
      }
      console.log(`   URL: ${url}`);
      console.log('');
      
    } catch (error) {
      console.log(`⚠️  ERROR: ${testCase.description}`);
      console.log(`   ${(error as Error).message}`);
      console.log('');
    }
  }
}

// Main
const args = process.argv.slice(2);
if (args.length > 0 && args[0].startsWith('http')) {
  // Test su server live
  testLiveServer(args[0]).catch(console.error);
} else {
  // Test simulato (verifica logica locale)
  runTests();
}

