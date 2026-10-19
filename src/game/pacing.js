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
  const opening = Math.max(0, 6 - meters / 20)
  const compression = Math.min(2.2, meters / 420)
  return Math.max(16, base + opening - compression)
}

// ---------------------------------------------------------------------------
// Opening presence — a seed cannot open the sky dead.
//
// The death-density probe measured the first 240m of seeded classic runs:
// the fraction of samples with zero visible airborne hazards swung 0%..~50%
// BY SEED (one seed flew a ~300m desert while other seeds were busy from
// ~50m). Both opening knobs are distance-blind coin flips that never look
// back at what came before: the engine's `distance < 90` calm gate reduces
// the opening band to the unconditional mixed-flyer coin
// (`rng() < 0.1 + ramp*0.06`), and past the gate a flat `OPEN_CHUNK_WEIGHT`
// makes ~39% of every chunk open no matter how long the sky has been empty.
// Per seed the opening band is ~10 independent ~10% draws, so a seed can
// miss all of them and open dead.
//
// These exports fix that without touching the fairness contract — whatever
// hazard is scheduled is still placed through the engine's existing
// gap-aware placement — and without inflating total density: the opening
// slot ≈ replaces the faint coin the calm band used to hold (expected ~0.4
// fliers per opening), and the famine legs only fire after the sky has been
// unusually empty. Two legs:
//
//   1. `planOpeningPresence` — a scheduled flier somewhere in [45m, 80m]
//      (fractions of whatever calm gate the engine uses), drawn fresh
//      per seed but always inside the gate, so no seed can open with an
//      all-miss band. The famine force is the SAME function after the gate:
//      once the run has seen two empty waves' worth of famine
//      (`OPEN_DROUGHT_GRACE_METERS`), the next chunk carries presence —
//      deterministically, not by weight.
//   2. `getOpenChunkWeight` — the famine drain on the open share itself, so
//      the weight mix also leans toward hazards during any drought.
// ---------------------------------------------------------------------------

/** The shipped early-calm gate (`distance < 90`) — the opening still breathes. */
export const OPENING_CALM_METERS = 90
/** First scheduled flier can be no earlier than mid-calm, no later than 80m. */
export const OPENING_FIRST_MIN_METERS = 45
export const OPENING_FIRST_MAX_METERS = 80
/** Minimum breathing room between scheduled opening fliers. */
export const OPENING_SPACING_MIN_METERS = 70
export const OPENING_SPACING_MAX_METERS = 115

/**
 * The shipped share of chunks that carry nothing (engine's OPEN_CHUNK_WEIGHT).
 * Exported here as the single canonical value so the engine weights and this
 * module's famine math cannot drift apart.
 */
export const OPEN_CHUNK_WEIGHT = 0.42
/** Share of open chunks once the famine drain has run its course. */
export const OPEN_WEIGHT_FLOOR = 0.04
/** Famine length that may stay at full open weight — about two waves. */
export const OPEN_DROUGHT_GRACE_METERS = 55
/** Famine length past the grace over which the open weight drains to floor. */
export const OPEN_DROUGHT_DRAIN_METERS = 85

/**
 * Decide whether the chunk being spawned carries a scheduled presence flier.
 *
 * Pure and deterministic given `random`; the engine calls it once per chunk
 * (one rng draw while in the calm gate; none once the famine leg is live so
 * downstream streams stay otherwise unchanged) and passes back the same
 * seeds' rng.
 *
 * Legs:
 *  - Opening slot (while `distance < earlyBoundary`): threshold drawn in
 *    [45m, 80m] of the gate for the first slot, then
 *    `[70m, 115m] * gap` after the previous slot. Fires on the first chunk
 *    whose cadence reaches the threshold; `quantum` is the engine's current
 *    chunk step and guards the quantized case where the drawn threshold
 *    falls between the gate's last chunk and the gate itself (then the last
 *    pre-gate chunk accepts the slot early). This makes "some flier in the
 *    calm gate" a strict guarantee.
 *  - Famine force (after the gate): fires when the run has gone
 *    `OPEN_DROUGHT_GRACE_METERS` without bird/scissors-length presence
 *    (buildings and stars do not anchor the famine; the engine tracks that
 *    distance). Deterministic — the "after two near-empty waves the next
 *    wave must carry a modest presence" guarantee.
 *
 * @returns true when this chunk should carry a scheduled flier. The caller
 *   must reset `lastOpeningHazardDistance` and `lastHazardDistance` per run
 *   (null = "from the start").
 */
export function planOpeningPresence({
  random = Math.random,
  distance = 0,
  lastOpeningHazardDistance = null,
  lastHazardDistance = null,
  earlyBoundary = OPENING_CALM_METERS,
  gap = 1,
  quantum = 0,
} = {}) {
  const boundary = Math.max(0, Number(earlyBoundary) || OPENING_CALM_METERS)
  const now = Math.max(0, Number(distance) || 0)
  const quantize = Math.max(0, Number(quantum) || 0)
  const forgiveness = Math.max(0.6, Number(gap) > 0 ? Number(gap) : 1)

  if (now < boundary) {
    const sample = Number(random())
    const roll = Number.isFinite(sample) ? sample : 0.5
    const threshold = lastOpeningHazardDistance == null
      ? boundary * (OPENING_FIRST_MIN_METERS + roll * (OPENING_FIRST_MAX_METERS - OPENING_FIRST_MIN_METERS)) / OPENING_CALM_METERS
      : nonNegative(lastOpeningHazardDistance) +
        (OPENING_SPACING_MIN_METERS + roll * (OPENING_SPACING_MAX_METERS - OPENING_SPACING_MIN_METERS)) * forgiveness
    const firstSlot = lastOpeningHazardDistance == null
    const crossing = now >= threshold
    // The drawn first slot never sits outside the gate (80m of a 90m gate),
    // but the chunk cadence can straddle it — the gate's final chunk takes
    // the slot then, so the opening block can never finish empty.
    const gateEnder = firstSlot && quantize > 0 && now + quantize >= boundary
    return crossing || gateEnder
  }

  const hazardAt = lastHazardDistance == null ? 0 : nonNegative(lastHazardDistance)
  return now - hazardAt >= OPEN_DROUGHT_GRACE_METERS
}

/**
 * Open weight for the chunk being spawned, drained by how long the run has
 * gone without a hazard-bearing chunk. Shipped behavior is the flat
 * `OPEN_CHUNK_WEIGHT`; this keeps that shape for ordinary pacing and bends it
 * toward `OPEN_WEIGHT_FLOOR` only once the sky has been free of airborne
 * hazards for longer than `OPEN_DROUGHT_GRACE_METERS` — two average waves —
 * so "two consecutive near-empty waves" is the longest famine a cadence can
 * normally hold. The engine feeds `lastHazardDistance` with the spawn
 * distance of the last chunk that won a horse (bird, scissors, deck hazard,
 * or a scheduled opening flier — buildings are scenery and must not count);
 * null/never means the famine has run since the launch itself, which is what
 * keeps a seed that missed every opening draw from compounding its drought.
 *
 * @returns the open share to hand to the hazard-type picker, in [FLOOR, BASE].
 */
export function getOpenChunkWeight({ distance = 0, lastHazardDistance = null } = {}) {
  const now = nonNegative(distance, 0)
  const famine = Math.max(0, now - (lastHazardDistance == null ? 0 : nonNegative(lastHazardDistance, 0)))
  const pastGrace = Math.max(0, famine - OPEN_DROUGHT_GRACE_METERS)
  const eased = Math.min(1, pastGrace / Math.max(1, OPEN_DROUGHT_DRAIN_METERS))
  return OPEN_CHUNK_WEIGHT + (OPEN_WEIGHT_FLOOR - OPEN_CHUNK_WEIGHT) * eased
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
  // ~12% of rolls create a true threadable slot (two towers framing a 5-7m lane).
  const tight = roll < 0.12
  if (tight) return (4.6 + roll * 8) * scale
  return 14.5 * scale + roll * 5.5 * scale
}

export function normalizeControlAxes({ x = 0, y = 0, invertX = false, invertY = false } = {}) {
  const clamp = (value) => Math.max(-1, Math.min(1, Number(value) || 0))
  return Object.freeze({
    x: clamp(x) * (invertX ? -1 : 1),
    y: clamp(y) * (invertY ? -1 : 1),
  })
}
