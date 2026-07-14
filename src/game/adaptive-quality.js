const THERMAL_STATES = new Set(['nominal', 'fair', 'serious', 'critical'])

export function normalizeNativePerformanceSignal(value = {}) {
  return Object.freeze({
    thermalState: THERMAL_STATES.has(value?.thermalState) ? value.thermalState : 'nominal',
    lowPowerMode: value?.lowPowerMode === true,
    memoryPressure: value?.memoryPressure === true,
  })
}

export function installNativePerformanceListener({ target, onSignal } = {}) {
  if (!target?.addEventListener || typeof onSignal !== 'function') return () => {}
  const handleSignal = (event) => onSignal(normalizeNativePerformanceSignal(event?.detail))
  target.addEventListener('paperplane:native-runtime', handleSignal)
  return () => target.removeEventListener('paperplane:native-runtime', handleSignal)
}

export function getAdaptiveQuality({
  status = 'stable',
  devicePixelRatio = 1,
  lowPower = false,
  nativeSignal = {},
} = {}) {
  const native = normalizeNativePerformanceSignal(nativeSignal)
  const deviceRatio = Math.max(1, Number(devicePixelRatio) || 1)
  const forcedLow = lowPower || native.lowPowerMode || native.memoryPressure ||
    native.thermalState === 'serious' || native.thermalState === 'critical'

  if (forcedLow) {
    return Object.freeze({ level: 'low', pixelRatio: 1, shadows: false, secondaryEffects: false })
  }
  if (status === 'critical') {
    return Object.freeze({ level: 'low', pixelRatio: Math.min(deviceRatio, 1.25), shadows: false, secondaryEffects: false })
  }
  if (status === 'degraded' || native.thermalState === 'fair') {
    return Object.freeze({ level: 'medium', pixelRatio: Math.min(deviceRatio, 1.5), shadows: false, secondaryEffects: true })
  }
  return Object.freeze({ level: 'high', pixelRatio: Math.min(deviceRatio, 2), shadows: true, secondaryEffects: true })
}
