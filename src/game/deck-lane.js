/**
 * The deck lane — hazards that live where ground effect does.
 *
 * `ground-skim.js` is written as though the bottom of the corridor were the
 * sharpest risk in the game, and `glide.js` gives it a cushion strong enough
 * that committed low flight can be *held*. Together those two produced a lane
 * nothing else in the game reached: every airborne hazard spawns at y ≥ 4.4,
 * side buildings sit outside the flyable corridor entirely, and buildings only
 * shove rather than kill. A plane parked in ground effect therefore flew under
 * the whole game — a hands-off run reached 32km, tier 8, still alive, while
 * banking the skim tier's permanent score multiplier for free.
 *
 * The fix is not to weaken the cushion, which is what makes the deck flyable
 * at all, but to put something down there. These are ordinary lethal flyers
 * anchored inside the skim band, planned against the same guaranteed gap as
 * every other wave — so the fairness contract is untouched (the gap is clear
 * at every altitude, as it always was) while the deck stops being free.
 *
 * They ramp in rather than opening the run, because a player who has not yet
 * learned the cushion should meet it before they meet its price.
 *
 * Pure and deterministic given `random`, so the ramp and the band are
 * properties a test can assert rather than claims in a comment.
 */

/** Top of the band, matched to `SKIM_CEILING` so "skimming" and "contested" mean the same height. */
export const DECK_CEILING = 4.6
/**
 * Bottom of the band. Below this a hazard's envelope would reach the floor
 * itself, which is already the fail state — stacking one on the other reads as
 * an unavoidable death rather than a hazard to fly around.
 */
export const DECK_FLOOR = 2.1
/** No deck hazards before this — the opening still teaches the cushion for free. */
export const DECK_INTRO_METERS = 340
/** Distance at which the deck is contested as often as it ever will be. */
export const DECK_FULL_METERS = 1400
/** Ceiling on how often a wave carries the lane, before difficulty and tier. */
export const DECK_MAX_CHANCE = 0.28
/** Most deck hazards one wave may carry. */
export const DECK_MAX_COUNT = 2

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
 * How often a wave carries the deck lane at this point in the run.
 *
 * Zero until `DECK_INTRO_METERS`, then ramps to `DECK_MAX_CHANCE` by
 * `DECK_FULL_METERS`. Altitude tiers lean in a little on top, and the
 * difficulty's `gap` multiplier (larger = more forgiving) thins it out, so
 * Easy keeps a usable deck and Hard does not.
 */
export function deckLaneChance({ distance = 0, tier = 0, gap = 1 } = {}) {
  const flown = Math.max(0, finite(distance))
  if (flown < DECK_INTRO_METERS) return 0
  const span = Math.max(1, DECK_FULL_METERS - DECK_INTRO_METERS)
  const ramp = clamp((flown - DECK_INTRO_METERS) / span, 0, 1)
  const tierLean = 1 + clamp(finite(tier), 0, 8) * 0.05
  const forgiveness = Math.max(0.6, finite(gap, 1))
  return clamp((DECK_MAX_CHANCE * ramp * tierLean) / forgiveness, 0, DECK_MAX_CHANCE * 1.4)
}

/**
 * Lay out this wave's deck hazards.
 *
 * Returns heights only — the caller owns x, which it takes from the same
 * gap-aware placement every other hazard in the wave uses. Heights are drawn
 * across the whole band rather than clustered at its floor: a lane that is
 * always at the very bottom is dodged by flying a constant 5m, which is the
 * same free line this exists to close.
 */
export function planDeckLane({ random = Math.random, distance = 0, tier = 0, gap = 1 } = {}) {
  const chance = deckLaneChance({ distance, tier, gap })
  if (chance <= 0 || sample(random) >= chance) {
    return Object.freeze({ count: 0, heights: Object.freeze([]) })
  }
  // A second hazard only once the ramp is well underway, so the lane arrives as
  // one readable obstacle before it arrives as a pair: zero until the chance
  // passes half its ceiling (about 800m on Normal), then rising to always-two
  // once the distance ramp is spent. Measured against hands-off runs, which end
  // between 1.4km and 4.2km across the three difficulties with this curve —
  // deep enough that the deck is contested, not so deep that the guaranteed gap
  // is the only altitude left.
  const pairChance = clamp((chance - DECK_MAX_CHANCE * 0.5) / Math.max(0.0001, DECK_MAX_CHANCE * 0.5), 0, 1)
  const count = sample(random) < pairChance ? DECK_MAX_COUNT : 1
  const band = DECK_CEILING - DECK_FLOOR
  const heights = []
  for (let index = 0; index < count; index += 1) {
    heights.push(DECK_FLOOR + sample(random) * band)
  }
  return Object.freeze({ count, heights: Object.freeze(heights) })
}
