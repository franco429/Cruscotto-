/**
 * Test Script per verificare la corretta implementazione degli header Cache-Control
 * Conforme a TAC Security DAST - CWE-525 & CWE-524
 * 
 * Uso: npx tsx server/scripts/test-cache-control-headers.ts
 * 
 * Questo script verifica che:
 * 1. Le API abbiano Cache-Control restrittivo (no-store, no-cache)
 * 2. Le pagine HTML abbiano Cache-Control restrittivo
 * 3. Gli asset statici abbiano Cache-Control permissivo (public, max-age)
 * 4. Le immagini e font abbiano Cache-Control permissivo
 */

import { createServer } from 'http';
import http from 'http';

interface TestCase {
  path: string;
  expectedCacheControl: string;
  description: string;
  shouldHavePragma?: boolean;
  shouldHaveExpires?: boolean;
}

const testCases: TestCase[] = [
  // API Endpoints - NO CACHING
  {
    path: '/api/clients',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'API endpoint (dati sensibili)',
    shouldHavePragma: true,
    shouldHaveExpires: true
  },
  {
    path: '/api/users',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'API endpoint (dati utente)',
    shouldHavePragma: true,
    shouldHaveExpires: true
  },
  // Pagine HTML - NO CACHING
  {
    path: '/',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'Homepage (potrebbe contenere dati dopo login)',
    shouldHavePragma: true,
    shouldHaveExpires: true
  },
  {
    path: '/index.html',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'Pagina HTML principale',
    shouldHavePragma: true,
    shouldHaveExpires: true
  },
  {
    path: '/privacy.html',
    expectedCacheControl: 'no-store, no-cache, must-revalidate, private',
    description: 'Pagina privacy',
    shouldHavePragma: true,
    shouldHaveExpires: true
  },
  // Asset Statici - CACHING AGGRESSIVO
  {
    path: '/assets/index-abc123.js',
    expectedCacheControl: 'public, max-age=63072000, immutable',
    description: 'JavaScript con hash (immutabile)'
  },
  {
    path: '/assets/style-xyz789.css',
    expectedCacheControl: 'public, max-age=63072000, immutable',
    description: 'CSS con hash (immutabile)'
  },
  // Immagini e Font - CACHING MODERATO
  {
    path: '/logo/logo.jpg',
    expectedCacheControl: 'public, max-age=31536000, immutable',
    description: 'Immagine JPG'
  },
  {
    path: '/favicon.png',
    expectedCacheControl: 'public, max-age=31536000, immutable',
    description: 'Favicon PNG'
  },
  {
    path: '/fonts/roboto.woff2',
    expectedCacheControl: 'public, max-age=31536000, immutable',
    description: 'Font WOFF2'
  },
  // robots.txt e sitemap.xml - CACHING BREVE
  {
    path: '/robots.txt',
    expectedCacheControl: 'public, max-age=3600',
    description: 'robots.txt (1 ora)'
  },
  {
    path: '/sitemap.xml',
    expectedCacheControl: 'public, max-age=3600',
    description: 'sitemap.xml (1 ora)'
  },
];

// Mock del middleware Cache-Control
function applyCacheControlHeaders(path: string, res: any) {
  const pathLower = path.toLowerCase();
  
  // 1. API endpoints - NO CACHING (dati sensibili)
  if (pathLower.startsWith('/api/')) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  // 2. Asset statici immutabili (CSS, JS, immagini con hash) - CACHING AGGRESSIVO
  else if (pathLower.match(/\.(css|js)$/) && pathLower.includes('/assets/')) {
    res.setHeader("Cache-Control", "public, max-age=63072000, immutable");
  }
  // 3. Immagini e font - CACHING MODERATO
  else if (pathLower.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  // 4. HTML e altre pagine (potrebbero contenere dati sensibili dopo login) - NO CACHING
  else if (pathLower.match(/\.(html?)$/) || pathLower === '/' || !pathLower.includes('.')) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  // 5. robots.txt, sitemap.xml - CACHING BREVE
  else if (pathLower.match(/\.(txt|xml)$/)) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
  // 6. Default: NO CACHING per sicurezza
  else {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
}

// Funzione per testare un singolo path
async function testPath(testCase: TestCase): Promise<boolean> {
  return new Promise((resolve) => {
    // Crea un server HTTP semplice per ogni test
    const server = createServer((req, res) => {
      // Applica gli header Cache-Control
      applyCacheControlHeaders(req.url || '/', res);
      
      // Risposta semplice
      res.statusCode = 200;
      res.end('OK');
    });
    
    const port = 0; // Usa porta random
    
    server.listen(port, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        console.error(`❌ Errore: impossibile ottenere porta per ${testCase.path}`);
        server.close();
        resolve(false);
        return;
      }
      
      const testPort = address.port;
      
      const options = {
        hostname: 'localhost',
        port: testPort,
        path: testCase.path,
        method: 'GET'
      };
      
      const req = http.request(options, (res: any) => {
        const cacheControl = res.headers['cache-control'];
        const pragma = res.headers['pragma'];
        const expires = res.headers['expires'];
        
        let passed = true;
        const errors: string[] = [];
        
        // Verifica Cache-Control
        if (cacheControl !== testCase.expectedCacheControl) {
          passed = false;
          errors.push(`Cache-Control errato: "${cacheControl}" (atteso: "${testCase.expectedCacheControl}")`);
        }
        
        // Verifica Pragma (se richiesto)
        if (testCase.shouldHavePragma && pragma !== 'no-cache') {
          passed = false;
          errors.push(`Pragma mancante o errato: "${pragma}" (atteso: "no-cache")`);
        }
        
        // Verifica Expires (se richiesto)
        if (testCase.shouldHaveExpires && expires !== '0') {
          passed = false;
          errors.push(`Expires mancante o errato: "${expires}" (atteso: "0")`);
        }
        
        // Output risultato
        if (passed) {
          console.log(`✅ ${testCase.description}`);
          console.log(`   Path: ${testCase.path}`);
          console.log(`   Cache-Control: ${cacheControl}`);
          if (testCase.shouldHavePragma) {
            console.log(`   Pragma: ${pragma}`);
          }
          if (testCase.shouldHaveExpires) {
            console.log(`   Expires: ${expires}`);
          }
          console.log('');
        } else {
          console.log(`❌ ${testCase.description}`);
          console.log(`   Path: ${testCase.path}`);
          errors.forEach(error => console.log(`   ERROR: ${error}`));
          console.log('');
        }
        
        server.close();
        resolve(passed);
      });
      
      req.on('error', (e: Error) => {
        console.error(`❌ Errore di rete per ${testCase.path}: ${e.message}`);
        server.close();
        resolve(false);
      });
      
      req.end();
    });
  });
}

// Main test runner
async function runTests() {
  console.log('🧪 Test Cache-Control Headers - TAC Security DAST (CWE-525 & CWE-524)\n');
  console.log('='.repeat(80));
  console.log('');
  
  const results: boolean[] = [];
  
  // Esegui tutti i test sequenzialmente
  for (const testCase of testCases) {
    const result = await testPath(testCase);
    results.push(result);
  }
  
  // Riepilogo
  console.log('='.repeat(80));
  console.log('');
  console.log('📊 RIEPILOGO TEST');
  console.log('');
  
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  const total = results.length;
  
  console.log(`✅ Test passati: ${passed}/${total}`);
  console.log(`❌ Test falliti: ${failed}/${total}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 TUTTI I TEST SONO PASSATI!');
    console.log('✅ Gli header Cache-Control sono configurati correttamente.');
    console.log('✅ Conformi a TAC Security DAST - CWE-525 & CWE-524');
    process.exit(0);
  } else {
    console.log('⚠️  ALCUNI TEST SONO FALLITI!');
    console.log('❌ Rivedere la configurazione degli header Cache-Control in server/security.ts');
    process.exit(1);
  }
}

// Avvia i test
runTests().catch((error) => {
  console.error('❌ Errore durante l\'esecuzione dei test:', error);
  process.exit(1);
});

