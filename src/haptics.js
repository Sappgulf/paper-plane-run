// The iOS app shell (ios/) wraps this exact web build in a WKWebView and
// registers a "haptics" script message handler, since WKWebView has never
// implemented navigator.vibrate on any iOS version — this is the only way
// this same code gets real Taptic Engine feedback there instead of nothing.
function nativeHapticBridge() {
  return typeof window !== 'undefined' ? window.webkit?.messageHandlers?.haptics : undefined
}

export function haptic(pattern = 10, nativeName = 'tap') {
  try {
    const raw = localStorage.getItem('paper-plane-run-settings-v1')
    if (raw) {
      const s = JSON.parse(raw)
      if (s.haptics === false) return
    }
    const bridge = nativeHapticBridge()
    if (bridge) {
      bridge.postMessage(nativeName)
      return
    }
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

export const Haptic = {
  tap: () => haptic(8, 'tap'),
  collect: () => haptic([12, 30, 12], 'collect'),
  nearMiss: () => haptic(18, 'nearMiss'),
  power: () => haptic([20, 40, 20, 40, 30], 'power'),
  crash: () => haptic([40, 30, 60, 30, 80], 'crash'),
  wind: () => haptic([10, 20, 10], 'wind'),
}
