// The iOS app (ios/) hosts this exact build in a WKWebView under the paper-plane://
// origin and registers script message handlers for what a browser cannot do. Every
// call here is a silent no-op on the web.
export const isNativeShell = typeof location !== 'undefined' && location.protocol === 'paper-plane:'

function postToShell(name, body) {
  try {
    window.webkit?.messageHandlers?.[name]?.postMessage(body)
    return Boolean(window.webkit?.messageHandlers?.[name])
  } catch {
    return false
  }
}

/** Keep the screen on while a flight is on screen. The shell restores the normal timeout when the menu returns. */
export function setScreenAwake(awake) {
  if (isNativeShell) postToShell('screenAwake', Boolean(awake))
}

/**
 * WKWebView custom-scheme pages are not secure contexts, so navigator.share,
 * navigator.clipboard and <a download> are unavailable or unreliable. Route
 * those actions through the shell when it exists; return false to fall back.
 */
export function shareNative({ text, url } = {}) {
  if (!isNativeShell) return false
  return postToShell('shareText', { text: String(text || ''), url: String(url || '') })
}

export function sharePhotoNative(dataUrl, filename = 'paper-plane.png') {
  if (!isNativeShell || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return false
  return postToShell('sharePhoto', { dataUrl, filename: String(filename || 'paper-plane.png') })
}

export function copyNative(text) {
  if (!isNativeShell) return false
  return postToShell('copyText', String(text || ''))
}
