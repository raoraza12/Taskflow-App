import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML configuration for Expo Router Web & iOS Standalone PWA.
 * Enables full-screen app mode on iPhone without opening Safari.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <title>TaskFlow</title>

        {/* iOS Native Standalone App Mode (Locks inside the phone, prevents Safari navigation) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaskFlow" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Theme and icons */}
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
              }
              #root {
                display: flex;
                height: 100%;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

