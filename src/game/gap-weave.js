/**
 * Continuous gaps, not reserved lanes.
 *
 * The old fairness rule picked one of three fixed lanes (`PASSAGE_LANE_X`),
 * reserved it, and forbade every hazard and hazard motion from entering it.
 * That guaranteed a run was survivable, but it also taught the player to solve
 * each wave as a three-way multiple choice: read the lane, sit in it, wait.
 * Position stopped being expressive — there were only ever three answers, and
 * the same three every time.
 *
 * The guarantee here is the same strength and costs nothing in fairness: every
 * wave still contains at least one continuous horizontal gap wide enough for
 * the plane plus a margin. What changes is that the gap can be *anywhere* in
 * the corridor and moves by a bounded amount from wave to wave, so threading
 * it is a line you fly rather than a slot you occupy. Combined with the roll
 * axis in `banking.js`, which means you cannot teleport sideways, reading the
 * gap early is worth something for the first time.
 *
 * Pure and deterministic given `random`, so the guarantee is a property a test
 * can assert over many seeds rather than a claim in a comment.
 */

/** Half-width of the flyable corridor. */
export const CORRIDOR_HALF_WIDTH = 11
/** Spare room beyond the plane's own radius that a gap must offer. */
export const GAP_MARGIN = 1.5
/** How far the gap centre may travel between consecutive waves. */
export const MAX_GAP_DRIFT = 7.5

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function sample(random) {
  const value = Number(typeof random === 'function' ? random() : NaN)
  return Number.isFinite(value) ? value : 0.5
}

/**
 * Pick where this wave's gap sits, biased to move a meaningful distance from
 * the last one. A gap that barely moves lets the player hold a line and never
 * decide; a gap that can jump the full corridor is unreadable at speed given
 * the roll rate. `MAX_GAP_DRIFT` is the compromise, and the minimum drift
 * keeps consecutive waves from stacking into a free straight line.
 */
export function chooseGapCenter({
  random = Math.random,
  previousCenter = 0,
  halfWidth = CORRIDOR_HALF_WIDTH,
  gapWidth = 3,
  maxDrift = MAX_GAP_DRIFT,
  minDrift = 2.4,
} = {}) {
  const bound = Math.max(0, finite(halfWidth, CORRIDOR_HALF_WIDTH) - finite(gapWidth) * 0.5)
  const previous = clamp(finite(previousCenter), -bound, bound)
  const drift = Math.max(0, finite(maxDrift, MAX_GAP_DRIFT))
  const floor = Math.min(drift, Math.max(0, finite(minDrift, 2.4)))
  // Choose a signed offset in [minDrift, maxDrift], preferring the side with
  // room; if neither side has room for the minimum, fall back to the widest.
  const roll = sample(random)
  const wantLeft = roll < 0.5
  const magnitude = floor + sample(random) * Math.max(0, drift - floor)
  const candidates = wantLeft
    ? [previous - magnitude, previous + magnitude]
    : [previous + magnitude, previous - magnitude]
  for (const candidate of candidates) {
    if (candidate >= -bound && candidate <= bound) return candidate
  }
  return clamp(previous > 0 ? -bound : bound, -bound, bound)
}

/**
 * Width the gap must have for a plane of this radius to fly it, widened for
 * easier difficulties and narrowed (never below one plane-width plus a hair)
 * as tiers climb.
 */
export function requiredGapWidth({ planeRadius = 0.7, margin = GAP_MARGIN, tier = 0 } = {}) {
  const base = (Math.max(0, finite(planeRadius, 0.7)) + Math.max(0, finite(margin, GAP_MARGIN))) * 2
  const squeeze = Math.min(0.35, Math.max(0, finite(tier)) * 0.045)
  return Math.max(Math.max(0, finite(planeRadius, 0.7)) * 2 + 0.9, base * (1 - squeeze))
}

/**
 * Lay a wave's hazards out around a gap.
 *
 * Hazards fill the corridor on both sides of the gap at roughly even spacing,
 * jittered so the wall does not read as a picket fence. Anything that would
 * not fit outside the gap is dropped rather than squeezed in — a wave with
 * fewer hazards is always preferable to one whose guarantee is a rounding
 * error.
 */
export function planWaveGaps({
  random = Math.random,
  count = 3,
  halfWidth = CORRIDOR_HALF_WIDTH,
  gapCenter = 0,
  gapWidth = 3,
  damageRadius = 1.2,
} = {}) {
  const bound = Math.max(0, finite(halfWidth, CORRIDOR_HALF_WIDTH))
  const half = Math.max(0, finite(gapWidth, 3)) * 0.5
  const center = clamp(finite(gapCenter), -bound, bound)
  const radius = Math.max(0, finite(damageRadius, 1.2))
  const wanted = Math.max(0, Math.floor(finite(count, 3)))

  // Usable spans either side of the gap, already inset by the hazard radius so
  // a placed hazard's damage envelope never reaches into the gap or outside
  // the corridor.
  const spans = [
    { min: -bound + radius, max: center - half - radius },
    { min: center + half + radius, max: bound - radius },
  ].filter((span) => span.max >= span.min)

  const total = spans.reduce((sum, span) => sum + (span.max - span.min), 0)
  const xs = []
  if (total <= 0 || wanted === 0) {
    return Object.freeze({ xs: Object.freeze([]), gapCenter: center, gapWidth: half * 2 })
  }

  for (let i = 0; i < wanted; i += 1) {
    // Walk a jittered position through the concatenated spans so both sides
    // are filled in proportion to how much room they actually have.
    const t = ((i + 0.5) / wanted + (sample(random) - 0.5) * (0.9 / wanted))
    let cursor = clamp(t, 0, 1) * total
    for (const span of spans) {
      const width = span.max - span.min
      if (cursor <= width || span === spans[spans.length - 1]) {
        xs.push(clamp(span.min + cursor, span.min, span.max))
        break
      }
      cursor -= width
    }
  }

  return Object.freeze({
    xs: Object.freeze(xs.sort((left, right) => left - right)),
    gapCenter: center,
    gapWidth: half * 2,
  })
}

/**
 * The largest lateral amplitude a moving hazard may use without its damage
 * envelope ever entering the gap. Replaces `clampAmplitudeToLane` — same job,
 * against a continuous gap instead of a fixed lane centre.
 */
export function clampAmplitudeToGap({
  requestedAmplitude = 0,
  anchorX = 0,
  gapCenter = 0,
  gapWidth = 3,
  damageRadius = 0,
  reach = 1,
} = {}) {
  const requested = Math.max(0, finite(requestedAmplitude))
  const span = Math.max(0, finite(reach, 1))
  if (span <= 0) return requested
  const edge = Math.abs(finite(anchorX) - finite(gapCenter)) -
    Math.max(0, finite(gapWidth, 3)) * 0.5 -
    Math.max(0, finite(damageRadius))
  if (edge <= 0) return 0
  return Math.min(requested, edge / span)
}

/** Smallest clearance between a point and every hazard's damage envelope. */
export function gapClearanceAt({ x = 0, hazards = [], damageRadius = 1.2 } = {}) {
  let clearance = Infinity
  for (const hazard of hazards || []) {
    const radius = Number.isFinite(Number(hazard?.damageRadius))
      ? Math.max(0, Number(hazard.damageRadius))
      : Math.max(0, finite(damageRadius, 1.2))
    clearance = Math.min(clearance, Math.abs(finite(hazard?.x) - finite(x)) - radius)
  }
  return clearance
}

/** Share of stars deliberately placed off the guaranteed gap. */
export const OFF_GAP_STAR_CHANCE = 0.45
/** Spare room a star needs beyond a hazard's envelope to be worth going for. */
export const STAR_CLEARANCE = 1.1

/**
 * Where a star goes.
 *
 * A star inside the gap costs nothing — you were flying there anyway — so only
 * a share of them land there, enough to keep the safe line paying something
 * and to keep the opening telegraph readable. The rest are placed *outside*
 * the gap, and only at an x whose clearance from every hazard in the wave is
 * real right now. That makes a star the risk of *moving* — leaving the line
 * that is guaranteed clear for one that merely happens to be — and never an
 * unavoidable hit. With nowhere clear, it falls back into the gap.
 */
export function chooseStarX({
  random = Math.random,
  gapCenter = 0,
  gapWidth = 3,
  hazards = [],
  halfWidth = CORRIDOR_HALF_WIDTH,
  telegraph = false,
  damageRadius = 1.2,
  clearance = STAR_CLEARANCE,
  offGapChance = OFF_GAP_STAR_CHANCE,
} = {}) {
  const center = finite(gapCenter)
  const half = Math.max(0, finite(gapWidth, 3)) * 0.5
  const inGap = () => center + (sample(random) - 0.5) * Math.max(0.4, half * 1.2)
  if (telegraph || sample(random) > clamp(finite(offGapChance, OFF_GAP_STAR_CHANCE), 0, 1)) {
    return inGap()
  }
  const bound = Math.max(0, finite(halfWidth, CORRIDOR_HALF_WIDTH))
  const required = Math.max(0, finite(clearance, STAR_CLEARANCE))
  let best = null
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = (sample(random) * 2 - 1) * bound
    if (Math.abs(candidate - center) < half) continue
    const room = gapClearanceAt({ x: candidate, hazards, damageRadius })
    if (room > required) return candidate
    if (!best || room > best.room) best = { x: candidate, room }
  }
  return inGap()
}
