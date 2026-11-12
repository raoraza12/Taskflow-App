const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const distDir = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, path.join(distDir, '404.html'));
  fs.copyFileSync(distIndex, path.join(distDir, 'login.html'));
  const loginDir = path.join(distDir, 'login');
  if (!fs.existsSync(loginDir)) fs.mkdirSync(loginDir, { recursive: true });
  fs.copyFileSync(distIndex, path.join(loginDir, 'index.html'));
  console.log('✓ SPA routing fallbacks generated (404.html, login.html, login/index.html)');
}
