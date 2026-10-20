/**
 * Ground shadows for airborne hazards.
 *
 * The plane has a contact shadow, so its height is readable from the ground.
 * Birds, scissors and the rest of the flyers had none: a flyer high over the
 * street and one skimming the deck looked identical until they were on top of
 * you. A dark blob on the paper beneath each flyer answers both questions the
 * eye asks first — where it is across the lane, and how far it is off the
 * deck — and the deck lane is exactly where that answer matters most.
 *
 * The blob grows as the flyer climbs, because a real shadow spreads with
 * distance from the ground, and it stops at a ceiling: a flyer that high is
 * already readable on its own, and a shadow drawn under it would be clutter on
 * the street. Pure, so the mapping is testable without a renderer.
 */

/** Instanced shadow pool size. One draw call covers every flyer on screen. */
export const HAZARD_SHADOW_CAPACITY = 48
/** Above this height the flyer is readable on its own, so it casts no shadow. */
export const HAZARD_SHADOW_MAX_ALTITUDE = 13
/** Shadow radius for a flyer at the deck, as a multiple of its hit radius. */
const SHADOW_NEAR_SCALE = 0.62
/** Extra spread at the shadow ceiling, as a multiple of its hit radius. */
const SHADOW_SPREAD = 0.6

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Where a flyer's shadow goes and how large it is.
 *
 * `visible` is false above the ceiling or when the input is unusable, and a
 * hidden shadow is collapsed to zero scale rather than removed, so the pool
 * keeps a fixed size and never reallocates mid-flight.
 */
export function hazardShadowForAltitude({
  altitude,
  groundHeight = 1.15,
  maxAltitude = HAZARD_SHADOW_MAX_ALTITUDE,
  radius = 0.7,
} = {}) {
  // Only a real number counts as a height: null and '' would otherwise pass
  // through Number() as 0 and cast a shadow for a flyer with no position.
  const height = typeof altitude === 'number' ? altitude : Number.NaN
  const ground = finite(groundHeight, 1.15)
  const ceiling = Math.max(ground + 0.5, finite(maxAltitude, HAZARD_SHADOW_MAX_ALTITUDE))
  const base = Math.max(0.1, finite(radius, 0.7))
  if (!Number.isFinite(height) || height > ceiling) {
    return Object.freeze({ visible: false, scale: 0 })
  }
  const t = clamp((height - ground) / Math.max(0.01, ceiling - ground), 0, 1)
  return Object.freeze({ visible: true, scale: base * (SHADOW_NEAR_SCALE + t * SHADOW_SPREAD) })
}
