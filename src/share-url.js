/**
 * Share links must point at the public HTTPS site even when the same bundle is
 * running inside the iOS shell (paper-plane://game), where `location.origin`
 * is neither reachable nor shareable by anyone else.
 */
const FALLBACK_BASE = 'https://paper-plane-run.vercel.app/'

export function shareBaseUrl() {
  try {
    if (typeof document !== 'undefined') {
      const canonical = document.querySelector?.('link[rel="canonical"]')?.href
      if (canonical && /^https?:\/\//i.test(canonical)) return canonical
    }
  } catch {}
  try {
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
      return `${location.origin}${location.pathname}`
    }
  } catch {}
  return FALLBACK_BASE
}

export function withShareBase(params = {}) {
  const url = new URL(shareBaseUrl())
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
  }
  return url.toString()
}
