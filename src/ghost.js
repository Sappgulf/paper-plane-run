const PREFIX = 'paper-plane-run-ghost-'

/** Sample every ~2m of distance */
export function createGhostRecorder() {
  const samples = []
  let lastD = -999
  return {
    samples,
    push(distance, x, y) {
      if (distance - lastD < 2) return
      lastD = distance
      samples.push([Math.round(distance), +x.toFixed(2), +y.toFixed(2)])
    },
    toJSON() {
      return samples
    },
  }
}

export function loadGhost(mode) {
  try {
    const raw = localStorage.getItem(PREFIX + mode)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data?.path) || !data.path.length) return null
    return data
  } catch {
    return null
  }
}

export function saveGhostIfBest(mode, distance, path, stars) {
  const prev = loadGhost(mode)
  if (prev && prev.distance >= distance) return false
  localStorage.setItem(
    PREFIX + mode,
    JSON.stringify({
      distance: Math.floor(distance),
      stars,
      path,
      at: Date.now(),
    }),
  )
  return true
}

/** Interpolate ghost position at current distance */
export function ghostPoseAt(path, distance) {
  if (!path?.length) return null
  if (distance <= path[0][0]) return { x: path[0][1], y: path[0][2] }
  if (distance >= path[path.length - 1][0]) {
    const p = path[path.length - 1]
    return { x: p[1], y: p[2], done: true }
  }
  let lo = 0
  let hi = path.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (path[mid][0] <= distance) lo = mid
    else hi = mid
  }
  const a = path[lo]
  const b = path[hi]
  const t = (distance - a[0]) / Math.max(0.001, b[0] - a[0])
  return {
    x: a[1] + (b[1] - a[1]) * t,
    y: a[2] + (b[2] - a[2]) * t,
  }
}
