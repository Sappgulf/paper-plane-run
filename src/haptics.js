export function haptic(pattern = 10) {
  try {
    const raw = localStorage.getItem('paper-plane-run-settings-v1')
    if (raw) {
      const s = JSON.parse(raw)
      if (s.haptics === false) return
    }
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

export const Haptic = {
  tap: () => haptic(8),
  collect: () => haptic([12, 30, 12]),
  nearMiss: () => haptic(18),
  power: () => haptic([20, 40, 20, 40, 30]),
  crash: () => haptic([40, 30, 60, 30, 80]),
  wind: () => haptic([10, 20, 10]),
}
