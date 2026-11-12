import { Platform } from 'react-native';
import { CONFIG } from '../constants/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: any) => void) => void;
        };
      };
    };
  }
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('Invalid Google token');
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}

export function parseGoogleCredential(credential: string): GoogleProfile {
  const payload = decodeJwtPayload(credential);
  const email = String(payload.email ?? '').trim().toLowerCase();
  const emailVerified = Boolean(payload.email_verified);
  const googleId = String(payload.sub ?? '');
  const name = String(payload.name ?? email.split('@')[0] ?? 'Google User');
  const picture = payload.picture ? String(payload.picture) : undefined;

  if (!email || !googleId) {
    throw new Error('Google account data missing');
  }
  if (!emailVerified) {
    throw new Error('Only Google-verified emails can sign in');
  }

  return { googleId, email, name, picture, emailVerified: true };
}

export function loadGoogleScript(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google SDK')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In SDK'));
    document.head.appendChild(script);
  });
}

// Official Google OAuth2 Account Selector Popup URL
export function openGoogleOAuthPopup(clientId: string): Window | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const redirectUri = window.location.origin;
  const scope = encodeURIComponent('openid email profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${scope}&prompt=select_account`;

  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    authUrl,
    'GoogleSignIn',
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
  );
}

// Fetch user profile using OAuth2 access token
export async function fetchGoogleProfileWithToken(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Google profile');
  }
  const data = await res.json();
  const email = String(data.email ?? '').trim().toLowerCase();
  const emailVerified = Boolean(data.email_verified);
  const googleId = String(data.sub ?? '');
  const name = String(data.name ?? email.split('@')[0] ?? 'Google User');
  const picture = data.picture ? String(data.picture) : undefined;

  return { googleId, email, name, picture, emailVerified };
}
