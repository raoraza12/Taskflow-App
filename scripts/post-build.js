const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const distDir = path.join(__dirname, '..', 'dist');
const assetsDir = path.join(__dirname, '..', 'assets');

if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, path.join(distDir, '404.html'));
  fs.copyFileSync(distIndex, path.join(distDir, 'login.html'));
  const loginDir = path.join(distDir, 'login');
  if (!fs.existsSync(loginDir)) fs.mkdirSync(loginDir, { recursive: true });
  fs.copyFileSync(distIndex, path.join(loginDir, 'index.html'));

  // Copy app icons to dist for PWA home screen icon
  if (fs.existsSync(path.join(assetsDir, 'icon.png'))) {
    fs.copyFileSync(path.join(assetsDir, 'icon.png'), path.join(distDir, 'icon.png'));
  }
  if (fs.existsSync(path.join(assetsDir, 'favicon.png'))) {
    fs.copyFileSync(path.join(assetsDir, 'favicon.png'), path.join(distDir, 'favicon.png'));
  }

  console.log('✓ SPA routing fallbacks and PWA icons generated');
}

