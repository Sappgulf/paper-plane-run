const BASE_SPACING = Object.freeze({ easy: 24, normal: 20, hard: 17 })
export const PASSAGE_LANES = Object.freeze([-1, 0, 1])
export const PASSAGE_LANE_X = Object.freeze([-6, 0, 6])
export const PASSAGE_MARGIN = 0.35
const AIR_DAMAGE_PLANE_WEIGHT = 0.52

function nonNegative(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : fallback
}

/**
 * The damaging envelope is intentionally smaller than a sprite's visual or
 * near-miss envelope. Generated billboard art is not a collision boundary.
 */
/** Only airborne hazards can end a run. Ground and buildings are scenery. */
export function isLethalObstacle(type) {
  return type === 'bird' || type === 'scissors' || type === 'boss'
}

export function getObstacleDamageRadius({
  entityRadius = 0,
  planeRadius = 0.7,
  boostHitboxScale = 1,
} = {}) {
  return (nonNegative(entityRadius) + nonNegative(planeRadius, 0.7) * AIR_DAMAGE_PLANE_WEIGHT) *
    nonNegative(boostHitboxScale, 1)
}

function laneX(lane, laneCenters = PASSAGE_LANE_X) {
  const index = PASSAGE_LANES.indexOf(lane)
  return laneCenters[index >= 0 ? index : 1] ?? 0
}

/**
 * Find a guaranteed lateral passage through a group of airborne hazards.
 * `clearance` is the spare horizontal distance after damage envelopes are
 * subtracted; the margin keeps a nominally safe lane from feeling razor-thin.
 */
export function choosePassageLane({
  hazards = [],
  preferredLane = 0,
  planeRadius = 0.7,
  margin = PASSAGE_MARGIN,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  const scored = PASSAGE_LANES.map((lane) => {
    const x = laneX(lane, laneCenters)
    const clearance = hazards.reduce((minimum, hazard) => {
      const hazardRadius = Number.isFinite(Number(hazard?.damageRadius))
        ? nonNegative(hazard.damageRadius)
        : getObstacleDamageRadius({
            entityRadius: hazard?.radius,
            planeRadius,
            boostHitboxScale: hazard?.boostHitboxScale,
          })
      const hazardX = Number(hazard?.x)
      return Math.min(minimum, Math.abs((Number.isFinite(hazardX) ? hazardX : 0) - x) - hazardRadius)
    }, Infinity)
    return { lane, x, clearance, guaranteed: clearance > nonNegative(margin, PASSAGE_MARGIN) }
  })
  const preferred = scored.find((candidate) => candidate.lane === preferredLane)
  if (preferred?.guaranteed) return Object.freeze(preferred)
  const best = scored
    .filter((candidate) => candidate.guaranteed)
    .sort((left, right) => right.clearance - left.clearance)[0]
  return Object.freeze(best || { lane: null, x: null, clearance: Math.max(...scored.map((candidate) => candidate.clearance)), guaranteed: false })
}

/** Choose a deterministic hazard x-position that preserves a reserved lane. */
export function getSafeSpawnX({
  random = Math.random,
  safeLane = 0,
  maxAbs = 5,
  damageRadius = 0,
  margin = PASSAGE_MARGIN,
  attempts = 16,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  const bound = nonNegative(maxAbs)
  const protectedDistance = nonNegative(damageRadius) + nonNegative(margin, PASSAGE_MARGIN)
  const protectedX = laneX(safeLane, laneCenters)
  for (let attempt = 0; attempt < Math.max(1, Math.floor(attempts)); attempt += 1) {
    const sample = Number(random())
    const candidate = (Number.isFinite(sample) ? sample : 0.5) * 2 * bound - bound
    const oppositeSide = protectedX > 0 ? candidate < 0 : protectedX < 0 ? candidate > 0 : true
    if (oppositeSide && Math.abs(candidate - protectedX) > protectedDistance) return candidate
  }
  const fallback = protectedX > 0 ? -bound : protectedX < 0 ? bound : bound
  return Math.abs(fallback - protectedX) > protectedDistance ? fallback : -fallback
}

export function getWaveSpacing({ difficultyId = 'normal', distance = 0, recovery = false } = {}) {
  const base = BASE_SPACING[difficultyId] || BASE_SPACING.normal
  if (recovery) return base + 12
  const meters = Math.max(0, Number(distance) || 0)
  const opening = Math.max(0, 8 - meters / 16)
  const compression = Math.min(3, meters / 350)
  return Math.max(14, base + opening - compression)
}

export function createPacingWave({ index = 0, difficultyId = 'normal', afterBoss = false } = {}) {
  const starLane = ((Math.abs(index) % PASSAGE_LANES.length) - 1)
  const lanes = PASSAGE_LANES
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
  safeCorridor = 2.6,
} = {}) {
  const defaultHalfSpan = 4.5 * Number(gap || 1)
  const minX = leftInnerEdge != null ? leftInnerEdge + radius + safeCorridor : -defaultHalfSpan
  const maxX = rightInnerEdge != null ? rightInnerEdge - radius - safeCorridor : defaultHalfSpan
  return minX <= maxX ? { minX, maxX } : null
}

/** Buildings must stay shorter than the flyable ceiling so rooftops remain an escape. */
export function getFlyableBuildingHeight({
  requestedHeight = 8,
  maxAltitude = 16.5,
  minClearance = 2.6,
} = {}) {
  const floor = 3.8
  const cap = Math.max(floor, nonNegative(maxAltitude, 16.5) - nonNegative(minClearance, 2.6))
  return Math.min(Math.max(floor, nonNegative(requestedHeight, 8)), cap)
}

/** Side towers stay outside the three flight lanes. */
export function getSideBuildingSpread({ gap = 1, random = Math.random } = {}) {
  const sample = Number(random())
  const roll = Number.isFinite(sample) ? sample : 0.5
  const scale = Math.max(0.7, Number(gap) || 1)
  return 14.5 * scale + roll * 5.5 * scale
}

export function normalizeControlAxes({ x = 0, y = 0, invertX = false, invertY = false } = {}) {
  const clamp = (value) => Math.max(-1, Math.min(1, Number(value) || 0))
  return Object.freeze({
    x: clamp(x) * (invertX ? -1 : 1),
    y: clamp(y) * (invertY ? -1 : 1),
  })
}
