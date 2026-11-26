import { CONFIG } from '../constants/config';

/**
 * Upload base64 data (voice note, avatar photo, or task attachment) to Vercel Blob
 * via /api/sync UPLOAD_MEDIA action so shared state stays tiny and fast.
 * Falls back to null if offline so callers can keep local/base64 URI cleanly.
 */
export async function uploadCloudMedia(
  dataUriOrBase64: string,
  options?: { folder?: string; extension?: string; contentType?: string }
): Promise<string | null> {
  if (!dataUriOrBase64) return null;
  if (dataUriOrBase64.startsWith('http://') || dataUriOrBase64.startsWith('https://')) {
    return dataUriOrBase64;
  }

  try {
    const res = await fetch(CONFIG.SYNC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPLOAD_MEDIA',
        payload: {
          base64Data: dataUriOrBase64,
          folder: options?.folder || 'media',
          extension: options?.extension || 'bin',
          contentType: options?.contentType || 'application/octet-stream',
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.ok && typeof data.url === 'string' && data.url.startsWith('http')) {
      return data.url;
    }
  } catch {
    // Offline resilience: caller falls back to local/data URI
  }
  return null;
}
