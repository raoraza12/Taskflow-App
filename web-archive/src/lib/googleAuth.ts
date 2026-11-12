import type { GoogleProfile } from '../types'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
export const GOOGLE_DEMO = import.meta.env.VITE_GOOGLE_DEMO === 'true'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void
          prompt: () => void
        }
      }
    }
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1]
  if (!part) throw new Error('Invalid Google token')
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const json = atob(padded)
  return JSON.parse(json) as Record<string, unknown>
}

export function parseGoogleCredential(credential: string): GoogleProfile {
  const payload = decodeJwtPayload(credential)
  const email = String(payload.email ?? '')
    .trim()
    .toLowerCase()
  const emailVerified = Boolean(payload.email_verified)
  const googleId = String(payload.sub ?? '')
  const name = String(payload.name ?? email.split('@')[0] ?? 'User')
  const picture = payload.picture ? String(payload.picture) : undefined

  if (!email || !googleId) {
    throw new Error('Google account data missing')
  }
  if (!emailVerified) {
    throw new Error('Only Google-verified emails can sign in')
  }

  return { googleId, email, name, picture, emailVerified: true }
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.getElementById('google-gsi')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google')))
      return
    }
    const script = document.createElement('script')
    script.id = 'google-gsi'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
}
