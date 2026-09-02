/**
 * Ground life — the scenery that makes each zone read as a lived-in place
 * instead of a scrolling texture.
 *
 * Everything here is pure so placement and motion can be tested without a WebGL
 * context. `flight-engine.js` owns the THREE.InstancedMesh that draws a whole
 * species in one call and asks this module where each instance sits and how it
 * moves.
 *
 * Three hard rules, all covered by tests:
 *   1. Upright props never enter the flight corridor. Hazard lanes sit at
 *      x = 0, ±6 with spread, so anything that stands up stays beyond
 *      FIELD_INNER_X. A prop that reads as an obstacle but cannot be hit is
 *      worse than no prop at all.
 *   2. Flat decals are the one exception: a quad lying on the ground, far below
 *      the plane's own floor (MIN_Y 2.2), reads as floor and may cross under
 *      the flight path. That is what dresses the near ground.
 *   3. Motion is derived from a per-instance phase and the clock — never
 *      integrated frame to frame — so a dropped frame or a pause cannot let a
 *      field drift out of formation.
 */

// Hazards spawn on lanes at x = ±6 with up to ±1.2 of spread; a plane fighting
// wind sits comfortably inside that. Scenery starts well clear of it.
export const CORRIDOR_HALF_X = 11
// At the camera's low, close framing a prop sitting right on the corridor edge
// fills the frame as it passes and reads as a wall to dodge. Start further out.
export const FIELD_INNER_X = 15
// Past ~32 units props render as specks, so spreading wider just spends fill
// rate on pixels nobody reads as scenery.
export const FIELD_HALF_X = 32
// Matches the ground plane's 140-unit scroll wrap in flight-engine.
export const FIELD_SPAN_Z = 140
export const FIELD_RECYCLE_Z = -20
/** A decal must sit below this height to stay unmistakably part of the ground. */
export const FLAT_MAX_Y = 0.12

/**
 * Roads run parallel to the flight path on both flanks. Everything that should
 * look organised — traffic, pedestrians, the road surface itself — hangs off
 * these two lanes so the zone reads as laid out rather than sprinkled.
 */
export const ROAD_LANES_X = Object.freeze([16, 26])
/** Pedestrians walk this far outside their road, on the "pavement". */
export const PAVEMENT_OFFSET_X = 2.6

function species(id, {
  count,
  motion,
  amplitude,
  speed,
  y = 0,
  scale = 1,
  palette,
  shape,
  flat = false,
  align = 'scatter',
  zSpeedMul = 1,
}) {
  return Object.freeze({
    id, count, motion, amplitude, speed, y, scale,
    palette: Object.freeze(palette),
    shape,
    flat,
    // 'road' snaps to a ROAD_LANES_X lane, 'pavement' sits beside one,
    // 'scatter' fills the flanks freely, 'decal' spans the whole ground.
    align,
    // Scroll rate relative to the ground. Anything other than 1 reads as
    // moving under its own power: 0.6 is traffic pulling away from you, 1.5 is
    // traffic coming the other way.
    zSpeedMul,
  })
}

/**
 * Per-zone scenery, layered so every distance band has something in it: a road
 * surface underfoot, traffic and pedestrians on it, a tall landmark behind, and
 * a dense low scatter plus a ground decal band to keep the near ground busy.
 */
export const GROUND_LIFE_ZONES = Object.freeze({
  city: Object.freeze([
    species('roads', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#9c9184', accent: '#bdb3a4' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('traffic', {
      count: 22, motion: 'none', amplitude: 0, speed: 0, y: 0.42, scale: 1.15,
      palette: { primary: '#e96957', accent: '#f0b429' }, shape: 'car',
      align: 'road', zSpeedMul: 0.55,
    }),
    species('oncoming', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.42, scale: 1.15,
      palette: { primary: '#7eb8e8', accent: '#fff7e8' }, shape: 'car',
      align: 'road', zSpeedMul: 1.5,
    }),
    species('pedestrians', {
      count: 26, motion: 'bob', amplitude: 0.16, speed: 5.2, y: 0.5, scale: 1,
      palette: { primary: '#f7e8c5', accent: '#e96957' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.9,
    }),
    species('rooftop-flags', {
      count: 18, motion: 'sway', amplitude: 0.38, speed: 1.9, y: 3.4, scale: 1.5,
      palette: { primary: '#7eb8e8', accent: '#fff7e8' }, shape: 'flag',
    }),
    species('park-blocks', {
      count: 34, motion: 'sway', amplitude: 0.14, speed: 0.9, y: 0.3, scale: 1.2,
      palette: { primary: '#8fc9a0', accent: '#d8eec4' }, shape: 'tuft',
    }),
    species('street-seams', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.4,
      palette: { primary: '#e8dccb', accent: '#f6efe2' }, shape: 'decal', flat: true,
    }),
    species('street-crates', {
      count: 22, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.1,
      palette: { primary: '#d8c4a8', accent: '#f6efe2' }, shape: 'stack',
    }),
  ]),
  harbor: Object.freeze([
    species('docks', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#a8916c', accent: '#c8b48c' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('sailboats', {
      count: 20, motion: 'bob', amplitude: 0.42, speed: 1.1, y: 0.9, scale: 1.7,
      palette: { primary: '#fff7e8', accent: '#4a90c4' }, shape: 'sail',
      zSpeedMul: 0.8,
    }),
    species('dockhands', {
      count: 22, motion: 'bob', amplitude: 0.15, speed: 4.6, y: 0.5, scale: 1,
      palette: { primary: '#fff7e8', accent: '#4a90c4' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.95,
    }),
    species('buoys', {
      count: 20, motion: 'bob', amplitude: 0.3, speed: 1.7, y: 0.5, scale: 1.1,
      palette: { primary: '#f0b429', accent: '#e96957' }, shape: 'buoy',
    }),
    species('wave-caps', {
      count: 38, motion: 'bob', amplitude: 0.22, speed: 2.3, y: 0.15, scale: 1.3,
      palette: { primary: '#bfe4f4', accent: '#ffffff' }, shape: 'tuft',
    }),
    species('tide-marks', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.6,
      palette: { primary: '#cfe8f6', accent: '#ffffff' }, shape: 'decal', flat: true,
    }),
    species('harbor-cranes', {
      count: 10, motion: 'sway', amplitude: 0.1, speed: 0.7, y: 0.9, scale: 1.5,
      palette: { primary: '#e8d8b8', accent: '#a8916c' }, shape: 'arch',
    }),
    species('cargo-crates', {
      count: 24, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.15,
      palette: { primary: '#e0c8a0', accent: '#fff7e8' }, shape: 'stack',
    }),
  ]),
  storm: Object.freeze([
    species('haul-roads', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#6d6284', accent: '#8e82a8' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('scrap-trucks', {
      count: 18, motion: 'none', amplitude: 0, speed: 0, y: 0.45, scale: 1.25,
      palette: { primary: '#8e7fa8', accent: '#e8d8f4' }, shape: 'car',
      align: 'road', zSpeedMul: 0.6,
    }),
    species('scrap-crew', {
      count: 20, motion: 'bob', amplitude: 0.18, speed: 5.6, y: 0.5, scale: 1,
      palette: { primary: '#d8c8e8', accent: '#e96957' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.9,
    }),
    species('scrap-fans', {
      count: 18, motion: 'spin', amplitude: 1, speed: 3.4, y: 2.6, scale: 1.6,
      palette: { primary: '#b9a6cf', accent: '#e8d8f4' }, shape: 'fan',
    }),
    species('scrap-litter', {
      count: 34, motion: 'sway', amplitude: 0.3, speed: 1.8, y: 0.25, scale: 1.1,
      palette: { primary: '#a89ac0', accent: '#d8c8e8' }, shape: 'tuft',
    }),
    species('oil-slicks', {
      count: 28, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.2,
      palette: { primary: '#b3a4c8', accent: '#dccfe8' }, shape: 'decal', flat: true,
    }),
    species('gantries', {
      count: 12, motion: 'sway', amplitude: 0.12, speed: 1.1, y: 0.9, scale: 1.6,
      palette: { primary: '#7d6f98', accent: '#b9a6cf' }, shape: 'arch',
    }),
    species('scrap-bales', {
      count: 26, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.2,
      palette: { primary: '#8e82a8', accent: '#c8b8dc' }, shape: 'stack',
    }),
  ]),
  sunset: Object.freeze([
    species('farm-tracks', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#b07c4c', accent: '#cf9d6c' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('hay-carts', {
      count: 16, motion: 'none', amplitude: 0, speed: 0, y: 0.42, scale: 1.15,
      palette: { primary: '#e08b5a', accent: '#fff0d8' }, shape: 'car',
      align: 'road', zSpeedMul: 0.5,
    }),
    species('farmhands', {
      count: 22, motion: 'bob', amplitude: 0.17, speed: 4.8, y: 0.5, scale: 1,
      palette: { primary: '#fae2c4', accent: '#c4846a' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.92,
    }),
    species('windmills', {
      count: 12, motion: 'spin', amplitude: 1, speed: 1.5, y: 3.8, scale: 2,
      palette: { primary: '#fff0d8', accent: '#e08b5a' }, shape: 'fan',
    }),
    species('reeds', {
      count: 34, motion: 'sway', amplitude: 0.32, speed: 1.35, y: 1.6, scale: 1.5,
      palette: { primary: '#c4846a', accent: '#f3c8a4' }, shape: 'reed',
    }),
    species('field-rows', {
      count: 32, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.5,
      palette: { primary: '#eab98c', accent: '#fae2c4' }, shape: 'decal', flat: true,
    }),
    species('fence-posts', {
      count: 26, motion: 'none', amplitude: 0, speed: 0, y: 0.5, scale: 0.9,
      palette: { primary: '#b07c4c', accent: '#e8bd8c' }, shape: 'mast',
    }),
    species('hay-stacks', {
      count: 22, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.25,
      palette: { primary: '#e8c088', accent: '#fff0d8' }, shape: 'stack',
    }),
  ]),
  aurora: Object.freeze([
    species('ice-roads', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#6fa8c4', accent: '#9ccbe0' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('sled-runners', {
      count: 16, motion: 'none', amplitude: 0, speed: 0, y: 0.42, scale: 1.1,
      palette: { primary: '#8fd8e8', accent: '#fff7e8' }, shape: 'car',
      align: 'road', zSpeedMul: 0.65,
    }),
    species('lantern-walkers', {
      count: 22, motion: 'bob', amplitude: 0.16, speed: 4.4, y: 0.5, scale: 1,
      palette: { primary: '#e8f8ff', accent: '#c8b4f0' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.9,
    }),
    species('crystals', {
      count: 22, motion: 'pulse', amplitude: 0.22, speed: 1.15, y: 1.7, scale: 1.6,
      palette: { primary: '#8fd8e8', accent: '#c8b4f0' }, shape: 'shard',
    }),
    species('ice-flecks', {
      count: 36, motion: 'pulse', amplitude: 0.28, speed: 1.9, y: 0.3, scale: 1,
      palette: { primary: '#a8e4f0', accent: '#e8f8ff' }, shape: 'tuft',
    }),
    species('frost-veins', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.3,
      palette: { primary: '#bfe8f4', accent: '#eefaff' }, shape: 'decal', flat: true,
    }),
    species('aurora-masts', {
      count: 18, motion: 'sway', amplitude: 0.14, speed: 0.8, y: 0.6, scale: 1.2,
      palette: { primary: '#c8b4f0', accent: '#e8f8ff' }, shape: 'mast',
    }),
    species('ice-blocks', {
      count: 22, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.2,
      palette: { primary: '#9ccbe0', accent: '#e8f8ff' }, shape: 'stack',
    }),
  ]),
  midnight: Object.freeze([
    species('desk-runners', {
      count: 14, motion: 'none', amplitude: 0, speed: 0, y: 0.03, scale: 1,
      palette: { primary: '#1e2848', accent: '#33406b' }, shape: 'road',
      flat: true, align: 'road',
    }),
    species('pencil-cars', {
      count: 18, motion: 'none', amplitude: 0, speed: 0, y: 0.42, scale: 1.1,
      palette: { primary: '#f0b429', accent: '#fff0c0' }, shape: 'car',
      align: 'road', zSpeedMul: 0.58,
    }),
    species('night-shift', {
      count: 20, motion: 'bob', amplitude: 0.17, speed: 5, y: 0.5, scale: 1,
      palette: { primary: '#8fa8d8', accent: '#f0b429' }, shape: 'person',
      align: 'pavement', zSpeedMul: 0.9,
    }),
    species('desk-lamps', {
      count: 16, motion: 'pulse', amplitude: 0.18, speed: 0.9, y: 2.2, scale: 1.6,
      palette: { primary: '#f0b429', accent: '#fff0c0' }, shape: 'lamp',
    }),
    species('paper-scraps', {
      count: 34, motion: 'sway', amplitude: 0.26, speed: 1.4, y: 0.25, scale: 1.1,
      palette: { primary: '#3a4a78', accent: '#8fa8d8' }, shape: 'tuft',
    }),
    species('desk-grain', {
      count: 30, motion: 'none', amplitude: 0, speed: 0, y: 0.04, scale: 3.4,
      palette: { primary: '#2c3a63', accent: '#55689c' }, shape: 'decal', flat: true,
    }),
    species('pen-stands', {
      count: 20, motion: 'sway', amplitude: 0.1, speed: 0.9, y: 0.6, scale: 1.1,
      palette: { primary: '#55689c', accent: '#f0b429' }, shape: 'mast',
    }),
    species('paper-reams', {
      count: 24, motion: 'none', amplitude: 0, speed: 0, y: 0.2, scale: 1.2,
      palette: { primary: '#8fa8d8', accent: '#e8eeff' }, shape: 'stack',
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
    return Object.freeze({ enabled: true, countScale: 0.42, motionScale: reducedMotion ? 0 : 0.7 })
  }
  return Object.freeze({ enabled: true, countScale: 0.62, motionScale: reducedMotion ? 0 : 1 })
}

export function groundLifeCount(speciesDef, budget) {
  if (!budget?.enabled) return 0
  // Roads are a continuous ribbon, not a scatter — thinning them would leave
  // visible gaps in the surface, so they keep their full segment count.
  if (speciesDef.align === 'road' && speciesDef.flat) return speciesDef.count
  return Math.max(0, Math.floor(speciesDef.count * budget.countScale))
}

/**
 * Where one instance sits across the field.
 *
 * Odd instances take the left flank and even the right, so thinning by the
 * quality budget keeps both sides dressed instead of emptying one.
 */
export function groundLifeSlotX(index, rand = 0.5, speciesDef = {}) {
  const side = index % 2 === 0 ? 1 : -1
  const { align = 'scatter', flat = false } = speciesDef

  if (align === 'road') {
    // Alternate down the road lanes so both roads are populated evenly.
    const lane = ROAD_LANES_X[Math.floor(index / 2) % ROAD_LANES_X.length]
    return side * lane
  }
  if (align === 'pavement') {
    const lane = ROAD_LANES_X[Math.floor(index / 2) % ROAD_LANES_X.length]
    return side * (lane + PAVEMENT_OFFSET_X)
  }
  if (flat) return side * rand * FIELD_HALF_X
  return side * (FIELD_INNER_X + rand * (FIELD_HALF_X - FIELD_INNER_X))
}

/**
 * Where one instance sits down the field. Road segments tile exactly so the
 * surface is continuous; everything else is spread evenly then jittered.
 */
export function groundLifeSlotZ(index, count, rand = 0, speciesDef = {}) {
  if (count <= 0) return FIELD_RECYCLE_Z
  if (speciesDef.align === 'road' && speciesDef.flat) {
    // Two lanes share the count, so each lane tiles half the segments.
    const perLane = Math.max(1, Math.floor(count / 2))
    const step = FIELD_SPAN_Z / perLane
    return FIELD_RECYCLE_Z + ((Math.floor(index / 2) * step) % FIELD_SPAN_Z)
  }
  const step = FIELD_SPAN_Z / count
  return FIELD_RECYCLE_Z + (((index + rand) * step) % FIELD_SPAN_Z)
}

/** Length of one road segment, so flight-engine can size the quad to tile. */
export function roadSegmentLength(count) {
  const perLane = Math.max(1, Math.floor(Math.max(0, count) / 2))
  return FIELD_SPAN_Z / perLane
}

/** Scroll a prop toward the camera, recycling it to the far end of the field. */
export function wrapGroundLifeZ(z, move) {
  let next = z - move
  while (next < FIELD_RECYCLE_Z) next += FIELD_SPAN_Z
  while (next >= FIELD_RECYCLE_Z + FIELD_SPAN_Z) next -= FIELD_SPAN_Z
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
      return { ...base, offsetX: Math.sin(t) * amp }
    case 'bob':
      // Pedestrians: a quick vertical bob reads as walking at this size.
      return { ...base, offsetY: Math.abs(Math.sin(t)) * amp, rotation: Math.sin(t * 0.5) * amp * 0.2 }
    case 'spin':
      return { ...base, rotation: t % (Math.PI * 2) }
    case 'sway':
      return { ...base, rotation: Math.sin(t) * amp }
    case 'pulse':
      return { ...base, scale: 1 + Math.sin(t) * amp }
    case 'none':
    default:
      return base
  }
}
