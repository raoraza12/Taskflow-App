const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const distDir = path.join(__dirname, '..', 'dist');
const assetsDir = path.join(__dirname, '..', 'assets');

if (fs.existsSync(distIndex)) {
  let html = fs.readFileSync(distIndex, 'utf8');

  // Deep link forwarder for Native Android / iOS Google OAuth Return
  const oauthScript = `
  <script>
    (function() {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';
        var fullQuery = hash + search;
        if (fullQuery && (fullQuery.indexOf('access_token=') !== -1 || fullQuery.indexOf('id_token=') !== -1)) {
          var isNativeState = fullQuery.indexOf('state=native_app') !== -1;
          var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isNativeState || isMobile) {
            var nativeUrl = 'taskflow://auth' + (hash || ('#' + search.replace(/^\\?/, '')));
            // Direct native intent redirect
            window.location.replace(nativeUrl);
            setTimeout(function() {
              window.location.href = nativeUrl;
            }, 250);
          }
        }
      } catch (e) {}
    })();
  </script>
`;

  if (!html.includes('taskflow://auth')) {
    html = html.replace('</head>', `${oauthScript}</head>`);
    fs.writeFileSync(distIndex, html, 'utf8');
  }

  fs.copyFileSync(distIndex, path.join(distDir, '404.html'));
  fs.copyFileSync(distIndex, path.join(distDir, 'login.html'));
  const loginDir = path.join(distDir, 'login');
  if (!fs.existsSync(loginDir)) fs.mkdirSync(loginDir, { recursive: true });
  fs.copyFileSync(distIndex, path.join(loginDir, 'index.html'));

  // Create dedicated auth-callback.html with manual fallback button
  const authCallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Returning to TaskFlow...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #0f172a; color: #ffffff; text-align: center; padding: 20px; }
    .card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .btn { display: inline-block; margin-top: 24px; padding: 14px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 12px; font-size: 16px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); }
    .spinner { width: 44px; height: 44px; border: 4px solid rgba(255, 255, 255, 0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authenticating with TaskFlow</h2>
    <p style="color: #94a3b8; font-size: 14px;">Returning back to the TaskFlow native app...</p>
    <a id="open-btn" class="btn" href="#">Open TaskFlow App</a>
  </div>
  <script>
    (function() {
      var hash = window.location.hash || '';
      var search = window.location.search || '';
      var target = 'taskflow://auth' + (hash || ('#' + search.replace(/^\\?/, '')));
      document.getElementById('open-btn').setAttribute('href', target);
      window.location.replace(target);
      setTimeout(function() {
        window.location.href = target;
      }, 300);
    })();
  </script>
</body>
</html>`;
  fs.writeFileSync(path.join(distDir, 'auth-callback.html'), authCallbackHtml, 'utf8');

  // Copy app icons to dist for PWA home screen icon
  if (fs.existsSync(path.join(assetsDir, 'icon.png'))) {
    fs.copyFileSync(path.join(assetsDir, 'icon.png'), path.join(distDir, 'icon.png'));
  }
  if (fs.existsSync(path.join(assetsDir, 'favicon.png'))) {
    fs.copyFileSync(path.join(assetsDir, 'favicon.png'), path.join(distDir, 'favicon.png'));
  }

  console.log('✓ SPA routing fallbacks and PWA icons generated');
}

