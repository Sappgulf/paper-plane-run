function round(value, digits = 1) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export function createFrameHealthMonitor({ sampleSize = 120, onChange } = {}) {
  const durations = []
  let status = 'warming'

  const snapshot = () => {
    const averageMs = durations.length
      ? durations.reduce((total, duration) => total + duration, 0) / durations.length
      : 0
    return Object.freeze({
      status,
      samples: durations.length,
      averageMs: round(averageMs),
      estimatedFps: averageMs > 0 ? round(1000 / averageMs) : 0,
    })
  }

  return Object.freeze({
    sample(frameMs) {
      const duration = Number(frameMs)
      if (!Number.isFinite(duration) || duration <= 0) return snapshot()
      durations.push(Math.min(duration, 100))
      if (durations.length > sampleSize) durations.shift()
      if (durations.length < sampleSize) return snapshot()

      const average = durations.reduce((total, value) => total + value, 0) / durations.length
      const nextStatus = average >= 28 ? 'critical' : average >= 22 ? 'degraded' : 'stable'
      if (nextStatus !== status) {
        status = nextStatus
        onChange?.(snapshot())
      }
      return snapshot()
    },
    snapshot,
  })
}
