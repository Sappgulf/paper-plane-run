/**
 * Ground life — the scenery that makes each zone read as a lived-in place
 * instead of a scrolling texture.
 *
 * Everything here is pure so the placement and motion rules can be tested
 * without a WebGL context. `flight-engine.js` owns the THREE.InstancedMesh
 * that draws a whole species in one call and asks this module where each
 * instance sits and how it moves.
 *
 * Two hard rules, both covered by tests:
 *   1. Props never enter the flight corridor. Hazard lanes sit at x = 0, ±6
 *      with spread, so anything decorative stays beyond CORRIDOR_HALF_X. A
 *      prop that reads as an obstacle but cannot be hit is worse than no prop.
 *   2. Motion is derived from a per-instance phase and the clock — never
 *      integrated frame to frame — so a dropped frame or a pause can't let
 *      the field drift out of formation.
 */

// Hazards spawn on lanes at x = ±6 with up to ±1.2 of spread; a plane fighting
// wind sits comfortably inside that. Scenery starts well clear of it.
export const CORRIDOR_HALF_X = 11
// Scenery starts a few units further out than the corridor itself. At the
// camera's low, close framing a prop sitting right on the corridor edge fills
// the frame as it passes and reads as a wall the player should dodge.
export const FIELD_INNER_X = 15
// Past ~32 units props render as specks, so spreading wider just spends fill
// rate on pixels nobody reads as scenery.
export const FIELD_HALF_X = 32
// Matches the ground plane's 140-unit scroll wrap in flight-engine.
export const FIELD_SPAN_Z = 140
export const FIELD_RECYCLE_Z = -20

function species(id, { count, motion, amplitude, speed, y = 0, scale = 1, palette, shape, flat = false }) {
  return Object.freeze({
    id, count, motion, amplitude, speed, y, scale,
    palette: Object.freeze(palette),
    shape,
    // Flat species lie on the ground plane as decals. They are the only kind
    // allowed under the flight path, because a quad lying flat below the
    // plane's floor reads as floor, never as something to dodge.
    flat,
  })
}

/** A decal must sit below this height to stay unmistakably part of the ground. */
export const FLAT_MAX_Y = 0.12

/**
 * Per-zone scenery: a tall landmark, a mid-height mover, and a dense low
 * scatter that keeps the bottom of the screen busy at speed. Three species is
 * three draw calls per zone — instancing means the count inside each is free.
 */
export const GROUND_LIFE_ZONES = Object.freeze({
  city: Object.freeze([
    species('traffic', {
      count: 26, motion: 'drift', amplitude: 8, speed: 0.55, y: 0.5, scale: 1.5,
      palette: { primary: '#e96957', accent: '#f7e8c5' }, shape: 'box',
    }),
    species('rooftop-flags', {
      count: 20, motion: 'sway', amplitude: 0.38, speed: 1.9, y: 3.4, scale: 1.5,
      palette: { primary: '#7eb8e8', accent: '#fff7e8' }, shape: 'flag',
    }),
    species('park-blocks', {
      count: 40, motion: 'sway', amplitude: 0.14, speed: 0.9, y: 0.3, scale: 1.2,
      palette: { primary: '#8fc9a0', accent: '#d8eec4' }, shape: 'tuft',
    }),
    species('street-seams', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.4,
      palette: { primary: '#e8dccb', accent: '#f6efe2' }, shape: 'decal', flat: true,
    }),
  ]),
  harbor: Object.freeze([
    species('sailboats', {
      count: 22, motion: 'bob', amplitude: 0.42, speed: 1.1, y: 0.9, scale: 1.7,
      palette: { primary: '#fff7e8', accent: '#4a90c4' }, shape: 'sail',
    }),
    species('buoys', {
      count: 22, motion: 'bob', amplitude: 0.3, speed: 1.7, y: 0.5, scale: 1.1,
      palette: { primary: '#f0b429', accent: '#e96957' }, shape: 'buoy',
    }),
    species('wave-caps', {
      count: 44, motion: 'bob', amplitude: 0.22, speed: 2.3, y: 0.15, scale: 1.3,
      palette: { primary: '#bfe4f4', accent: '#ffffff' }, shape: 'tuft',
    }),
    species('tide-marks', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.6,
      palette: { primary: '#cfe8f6', accent: '#ffffff' }, shape: 'decal', flat: true,
    }),
  ]),
  storm: Object.freeze([
    species('scrap-fans', {
      count: 20, motion: 'spin', amplitude: 1, speed: 3.4, y: 2.6, scale: 1.6,
      palette: { primary: '#b9a6cf', accent: '#e8d8f4' }, shape: 'fan',
    }),
    species('tarps', {
      count: 18, motion: 'sway', amplitude: 0.5, speed: 2.6, y: 2.0, scale: 1.6,
      palette: { primary: '#8e7fa8', accent: '#d8c8e8' }, shape: 'flag',
    }),
    species('scrap-litter', {
      count: 40, motion: 'sway', amplitude: 0.3, speed: 1.8, y: 0.25, scale: 1.1,
      palette: { primary: '#a89ac0', accent: '#d8c8e8' }, shape: 'tuft',
    }),
    species('oil-slicks', {
      count: 28, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.2,
      palette: { primary: '#b3a4c8', accent: '#dccfe8' }, shape: 'decal', flat: true,
    }),
  ]),
  sunset: Object.freeze([
    species('reeds', {
      count: 38, motion: 'sway', amplitude: 0.32, speed: 1.35, y: 1.6, scale: 1.5,
      palette: { primary: '#c4846a', accent: '#f3c8a4' }, shape: 'reed',
    }),
    species('windmills', {
      count: 14, motion: 'spin', amplitude: 1, speed: 1.5, y: 3.8, scale: 1.4,
      palette: { primary: '#fff0d8', accent: '#e08b5a' }, shape: 'fan',
    }),
    species('hay-bales', {
      count: 36, motion: 'sway', amplitude: 0.1, speed: 0.7, y: 0.35, scale: 1.2,
      palette: { primary: '#e0a878', accent: '#f8dcb8' }, shape: 'tuft',
    }),
    species('field-rows', {
      count: 32, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.5,
      palette: { primary: '#eab98c', accent: '#fae2c4' }, shape: 'decal', flat: true,
    }),
  ]),
  aurora: Object.freeze([
    species('crystals', {
      count: 26, motion: 'pulse', amplitude: 0.22, speed: 1.15, y: 1.7, scale: 1.6,
      palette: { primary: '#8fd8e8', accent: '#c8b4f0' }, shape: 'shard',
    }),
    species('washi-banners', {
      count: 18, motion: 'sway', amplitude: 0.42, speed: 1.6, y: 3.2, scale: 1.6,
      palette: { primary: '#c8b4f0', accent: '#fff7e8' }, shape: 'flag',
    }),
    species('ice-flecks', {
      count: 42, motion: 'pulse', amplitude: 0.28, speed: 1.9, y: 0.3, scale: 1.0,
      palette: { primary: '#a8e4f0', accent: '#e8f8ff' }, shape: 'tuft',
    }),
    species('frost-veins', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.3,
      palette: { primary: '#bfe8f4', accent: '#eefaff' }, shape: 'decal', flat: true,
    }),
  ]),
  midnight: Object.freeze([
    species('desk-lamps', {
      count: 18, motion: 'pulse', amplitude: 0.18, speed: 0.9, y: 2.2, scale: 1.5,
      palette: { primary: '#f0b429', accent: '#fff0c0' }, shape: 'lamp',
    }),
    species('pencils', {
      count: 24, motion: 'drift', amplitude: 6, speed: 0.42, y: 0.4, scale: 1.4,
      palette: { primary: '#172b57', accent: '#f0b429' }, shape: 'box',
    }),
    species('paper-scraps', {
      count: 40, motion: 'sway', amplitude: 0.26, speed: 1.4, y: 0.25, scale: 1.1,
      palette: { primary: '#3a4a78', accent: '#8fa8d8' }, shape: 'tuft',
    }),
    species('desk-grain', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.4,
      palette: { primary: '#2c3a63', accent: '#55689c' }, shape: 'decal', flat: true,
    }),
  ]),
})

export function getGroundLifeSpecies(zoneId) {
  return GROUND_LIFE_ZONES[zoneId] || GROUND_LIFE_ZONES.city
}

/**
 * How much scenery this device can afford. Ground life is the first thing to
 * go when frames get expensive — it is pure decoration, so cutting it never
 * changes what the player can hit.
 */
export function resolveGroundLifeBudget({
  level = 'high',
  secondaryEffects = true,
  reducedMotion = false,
  lowPower = false,
} = {}) {
  if (lowPower || !secondaryEffects || level === 'low') {
    return Object.freeze({ enabled: false, countScale: 0, motionScale: 0 })
  }
  if (level === 'medium') {
    return Object.freeze({ enabled: true, countScale: 0.5, motionScale: reducedMotion ? 0 : 0.7 })
  }
  return Object.freeze({ enabled: true, countScale: 1, motionScale: reducedMotion ? 0 : 1 })
}

export function groundLifeCount(speciesDef, budget) {
  if (!budget?.enabled) return 0
  return Math.max(0, Math.floor(speciesDef.count * budget.countScale))
}

/**
 * Deterministic slot placement. Odd instances take the left flank and even the
 * right, so thinning the count by the quality budget keeps both sides dressed
 * instead of emptying one.
 */
export function groundLifeSlotX(index, rand = 0.5, flat = false) {
  const side = index % 2 === 0 ? 1 : -1
  // Decals may cross the corridor; upright props never do.
  const spread = flat
    ? rand * FIELD_HALF_X
    : FIELD_INNER_X + rand * (FIELD_HALF_X - FIELD_INNER_X)
  return side * spread
}

export function groundLifeSlotZ(index, count, rand = 0) {
  if (count <= 0) return FIELD_RECYCLE_Z
  const step = FIELD_SPAN_Z / count
  return FIELD_RECYCLE_Z + ((index + rand) * step) % FIELD_SPAN_Z
}

/** Scroll a prop toward the camera, recycling it to the far end of the field. */
export function wrapGroundLifeZ(z, move) {
  let next = z - move
  while (next < FIELD_RECYCLE_Z) next += FIELD_SPAN_Z
  return next
}

/**
 * Motion for one instance at a given time. Returns offsets rather than mutated
 * state so a frame can be skipped or replayed with identical results.
 */
export function groundLifeTransform(speciesDef, phase, time, motionScale = 1) {
  const t = time * speciesDef.speed + phase
  const amp = speciesDef.amplitude * motionScale
  const base = { offsetX: 0, offsetY: 0, rotation: 0, scale: 1 }
  switch (speciesDef.motion) {
    case 'drift':
      // Traffic slides along its cross-street and turns around at the ends.
      return { ...base, offsetX: Math.sin(t) * amp }
    case 'bob':
      return { ...base, offsetY: Math.sin(t) * amp, rotation: Math.sin(t * 0.6) * amp * 0.25 }
    case 'spin':
      return { ...base, rotation: t % (Math.PI * 2) }
    case 'sway':
      return { ...base, rotation: Math.sin(t) * amp }
    case 'pulse':
      return { ...base, scale: 1 + Math.sin(t) * amp }
    case 'none':
      return base
    default:
      return base
  }
}
