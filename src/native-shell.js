// The iOS app (ios/) hosts this exact build in a WKWebView under the paper-plane://
// origin and registers script message handlers for what a browser cannot do. Every
// call here is a silent no-op on the web.
export const isNativeShell = typeof location !== 'undefined' && location.protocol === 'paper-plane:'

function postToShell(name, body) {
  try {
    window.webkit?.messageHandlers?.[name]?.postMessage(body)
  } catch {}
}

/** Keep the screen on while a flight is on screen. The shell restores the normal timeout when the menu returns. */
export function setScreenAwake(awake) {
  if (isNativeShell) postToShell('screenAwake', Boolean(awake))
}
