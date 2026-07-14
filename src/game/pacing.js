const BASE_SPACING = Object.freeze({ easy: 24, normal: 20, hard: 17 })

export function getWaveSpacing({ difficultyId = 'normal', distance = 0, recovery = false } = {}) {
  const base = BASE_SPACING[difficultyId] || BASE_SPACING.normal
  if (recovery) return base + 12
  const compression = Math.min(3, Math.max(0, Number(distance) || 0) / 350)
  return Math.max(14, base - compression)
}

export function createPacingWave({ index = 0, difficultyId = 'normal', afterBoss = false } = {}) {
  const starLane = ((Math.abs(index) % 3) - 1)
  const lanes = [-1, 0, 1]
  return Object.freeze({
    kind: afterBoss ? 'recovery' : index % 4 === 3 ? 'gauntlet' : 'standard',
    spacing: getWaveSpacing({ difficultyId, distance: index * 50, recovery: afterBoss }),
    starLane,
    hazardLanes: afterBoss ? [] : lanes.filter((lane) => lane !== starLane),
  })
}
/**
 * A center building must fit inside the corridor left by any side buildings,
 * with SAFE_CORRIDOR clearance on top of its own radius, or it's skipped
 * entirely rather than risk sealing the flyable width shut. Returns the
 * placement range, or null when no safe placement exists this chunk.
 */
export function getCenterBuildingSafeRange({
  leftInnerEdge = null,
  rightInnerEdge = null,
  radius = 0,
  gap = 1,
  safeCorridor = 1.1,
} = {}) {
  const defaultHalfSpan = 4.5 * Number(gap || 1)
  const minX = leftInnerEdge != null ? leftInnerEdge + radius + safeCorridor : -defaultHalfSpan
  const maxX = rightInnerEdge != null ? rightInnerEdge - radius - safeCorridor : defaultHalfSpan
  return minX <= maxX ? { minX, maxX } : null
}

export function normalizeControlAxes({ x = 0, y = 0, invertX = false, invertY = false } = {}) {
  const clamp = (value) => Math.max(-1, Math.min(1, Number(value) || 0))
  return Object.freeze({
    x: clamp(x) * (invertX ? -1 : 1),
    y: clamp(y) * (invertY ? -1 : 1),
  })
}
