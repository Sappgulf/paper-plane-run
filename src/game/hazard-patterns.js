/**
 * Airborne hazard movement.
 *
 * Two rules, both of which the previous inline motion broke:
 *
 *  1. **Offsets are absolute functions of time, never integrated.** The old
 *     code did `mesh.position.x += Math.sin(phase) * dt * 3.5` every frame.
 *     Integrating a sinusoid does not average to zero — it accumulates into a
 *     one-sided offset (that weave settled around +0.6 and peaked near +1.25)
 *     and its exact value depends on how the frames happened to land. Ground
 *     life already forbids frame-to-frame integration for this reason; air
 *     hazards now follow the same rule, so a dropped frame, a pause, or a
 *     slow device cannot move a hazard somewhere else.
 *
 *  2. **A pattern can never enter the reserved passage lane.** `getSafeSpawnX`
 *     guarantees clearance *at spawn only*. Once motion was applied on top,
 *     a hazard could drift into the lane the game had promised was flyable —
 *     the fairness guarantee held on paper and not in the air. Amplitude is
 *     clamped against the lane up front (`clampAmplitudeToLane`), so the
 *     guarantee covers the hazard's whole path rather than its first frame.
 *
 * Everything here is pure, so the bound is a property a test can assert over
 * the entire time domain instead of a behavior we hope holds.
 */

/** Lateral swing is expressed as a fraction of the pattern's own amplitude. */
export const HAZARD_PATTERN_IDS = Object.freeze([
  'hold',
  'bob',
  'weave',
  'dive',
  'orbit',
  'tumble',
])

/**
 * Each pattern maps (phase) → unit offsets in [-1, 1]. Amplitude scaling and
 * lane clamping happen outside, so a pattern never has to know the world.
 */
const PATTERNS = Object.freeze({
  // Holds its lane. Still billboards and flaps, just does not translate.
  hold: () => ({ x: 0, y: 0 }),
  // Rises and settles — balloons and anything that should feel buoyant.
  bob: (phase) => ({ x: 0, y: Math.sin(phase * 0.5) }),
  // Side-to-side. The signature "hard to line up" mover.
  weave: (phase) => ({ x: Math.sin(phase * 0.7), y: 0 }),
  // Drops toward the flight line then pulls back up, with a light lateral lean.
  dive: (phase) => ({ x: Math.cos(phase * 0.4) * 0.45, y: -Math.sin(phase) }),
  // Circles its anchor: the two axes are a quarter-turn out of phase.
  orbit: (phase) => ({ x: Math.sin(phase * 0.6), y: Math.cos(phase * 0.6) * 0.7 }),
  // Fast, tight, slightly chaotic — two frequencies that do not divide evenly,
  // so the path does not visibly repeat on the approach.
  tumble: (phase) => ({
    x: Math.sin(phase * 0.9) * 0.7 + Math.sin(phase * 0.37) * 0.3,
    y: Math.cos(phase * 1.3) * 0.5,
  }),
})

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback))
}

export function isHazardPattern(id) {
  return HAZARD_PATTERN_IDS.includes(id)
}

/**
 * Every pattern's unit output is bounded by this. `weave` peaks at exactly 1;
 * `tumble` sums two sines and so is bounded by the sum of their coefficients.
 * Used to convert a requested amplitude into the worst-case excursion.
 */
export function getPatternReach(pattern) {
  switch (pattern) {
    case 'hold': return { x: 0, y: 0 }
    case 'bob': return { x: 0, y: 1 }
    case 'weave': return { x: 1, y: 0 }
    case 'dive': return { x: 0.45, y: 1 }
    case 'orbit': return { x: 1, y: 0.7 }
    case 'tumble': return { x: 1, y: 0.5 }
    default: return { x: 0, y: 0 }
  }
}

/**
 * Choose the pattern a flyer definition should use. Keeps the existing
 * per-type feel (the old boolean flags) while giving newer types somewhere
 * richer to sit.
 */
export function patternForFlyer(def = {}) {
  if (def.pattern && isHazardPattern(def.pattern)) return def.pattern
  if (def.barrel) return 'tumble'
  if (def.dive && def.weave) return 'tumble'
  if (def.dive) return 'dive'
  if (def.weave) return 'weave'
  if (def.floaty) return 'bob'
  if (def.spin) return 'orbit'
  return 'hold'
}

/**
 * The largest lateral amplitude this hazard may use without its damage
 * envelope ever touching the reserved lane.
 *
 * Returns 0 when the hazard already sits inside the protected band — motion
 * must not make an existing overlap worse, and the spawn code is responsible
 * for not putting it there in the first place.
 */
export function clampAmplitudeToLane({
  requestedAmplitude = 0,
  anchorX = 0,
  safeLaneX = null,
  damageRadius = 0,
  margin = 0.35,
  pattern = 'hold',
} = {}) {
  const requested = nonNegative(requestedAmplitude)
  if (safeLaneX == null || !Number.isFinite(Number(safeLaneX))) return requested
  const reach = getPatternReach(pattern).x
  if (reach <= 0) return requested
  // Distance from the anchor to the edge of the lane's protected band.
  const protectedBand = nonNegative(damageRadius) + nonNegative(margin, 0.35)
  const headroom = Math.abs(finite(anchorX) - finite(safeLaneX)) - protectedBand
  if (headroom <= 0) return 0
  // The pattern swings `amplitude * reach` at most, so cap amplitude by the
  // headroom divided by the reach.
  return Math.min(requested, headroom / reach)
}

/**
 * Resolve a hazard's offset from its spawn anchor at a point in time.
 *
 * `phase` is the hazard's own seeded starting phase, so two hazards spawned
 * together do not move in lockstep. `elapsed` is run time — the same clock the
 * ground field uses.
 */
export function resolveHazardOffset({
  pattern = 'hold',
  elapsed = 0,
  phase = 0,
  speed = 1,
  amplitudeX = 0,
  amplitudeY = 0,
} = {}) {
  const shape = PATTERNS[pattern] || PATTERNS.hold
  const t = finite(phase) + finite(elapsed) * nonNegative(speed, 1)
  const unit = shape(t)
  return Object.freeze({
    x: unit.x * nonNegative(amplitudeX),
    y: unit.y * nonNegative(amplitudeY),
  })
}

/** Visual-only rotation for patterns that should also spin their sprite. */
export function resolveHazardRoll({ pattern = 'hold', elapsed = 0, phase = 0, speed = 1 } = {}) {
  const t = finite(phase) + finite(elapsed) * nonNegative(speed, 1)
  if (pattern === 'tumble') return t * 0.9
  if (pattern === 'orbit') return Math.sin(t * 0.6) * 0.6
  return 0
}

/**
 * Deeper endless tiers move hazards harder. Bounded, and still funnelled
 * through `clampAmplitudeToLane`, so a late tier makes hazards livelier
 * without ever making the reserved lane unusable.
 */
export function getTierMotionScale(tier = 0) {
  return 1 + Math.min(0.6, nonNegative(tier) * 0.075)
}
