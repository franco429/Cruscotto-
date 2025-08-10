// Script per buildare l'eseguibile Windows con pkg
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Local Opener for Windows...');

// Assicurati che la cartella dist esista
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build con pkg
const pkgCmd = `pkg . --targets node18-win-x64 --output dist/local-opener.exe`;

exec(pkgCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
  
  console.log('Build output:', stdout);
  if (stderr) console.error('Build warnings:', stderr);
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Output: dist/local-opener.exe');
  
  // Copia assets se esistono
  const assetsDir = 'assets';
  const distAssetsDir = 'dist/assets';
  
  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(distAssetsDir)) {
      fs.mkdirSync(distAssetsDir, { recursive: true });
    }
    
    // Copia ricorsiva degli assets
    copyRecursiveSync(assetsDir, distAssetsDir);
    console.log('📁 Assets copied to dist/assets');
  }
});

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
