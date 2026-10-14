/**
 * Power orbs used to wipe whatever was active the moment a new orb was
 * caught — grabbing a Shield while your Magnet had 7s left destroyed that
 * time with zero compensation. Now:
 *  - same-kind pickup refreshes the timer to full instead of restarting it,
 *    plus a small distance tip for the lucky catch;
 *  - a different kind still replaces (one power at a time keeps the HUD and
 *    physics toys sane) but pays a partial refund for the time thrown away.
 */

export const POWER_REFRESH_METERS = 25
export const POWER_REPLACE_METERS = 12

/**
 * @param {{currentKind?: string|null, nextKind?: string}} params
 * @returns {{mode: 'new'|'refresh'|'replace', refundMeters: number}}
 */
export function resolvePowerPickup({ currentKind = null, nextKind } = {}) {
  if (!nextKind) return Object.freeze({ mode: 'new', refundMeters: 0 })
  if (!currentKind) return Object.freeze({ mode: 'new', refundMeters: 0 })
  if (currentKind === nextKind) {
    return Object.freeze({ mode: 'refresh', refundMeters: POWER_REFRESH_METERS })
  }
  return Object.freeze({ mode: 'replace', refundMeters: POWER_REPLACE_METERS })
}

/**
 * Relative odds for each endless power orb. Boost rewrites the whole run's
 * speed, so it stays a minority: 2 of every 12 orbs (about one in six), down
 * from roughly 45% of orbs before.
 */
export const POWER_SPAWN_WEIGHTS = Object.freeze({ shield: 5, magnet: 5, boost: 2 })

/**
 * Picks the orb a spawn roll produces. `roll` is a 0..1 draw; a kind with no
 * entry in `weights` counts as weight 1 so a new orb never silently vanishes.
 * @param {number} roll
 * @param {string[]} kinds
 * @param {Record<string, number>} [weights]
 * @returns {string|null}
 */
export function pickPowerSpawnKind(roll, kinds = [], weights = POWER_SPAWN_WEIGHTS) {
  if (!kinds.length) return null
  const odds = kinds.map((kind) => {
    const weight = Number(weights[kind] ?? 1)
    return Number.isFinite(weight) && weight > 0 ? weight : 0
  })
  const total = odds.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return kinds[0]
  let cursor = Math.min(Math.max(Number(roll) || 0, 0), 1 - Number.EPSILON) * total
  for (let index = 0; index < kinds.length; index += 1) {
    cursor -= odds[index]
    if (cursor < 0) return kinds[index]
  }
  return kinds[kinds.length - 1]
}

/** The boost surge eases in over the first 0.45s and drains over the last 0.8s. */
export const BOOST_RAMP_IN_SECONDS = 0.45
export const BOOST_RAMP_OUT_SECONDS = 0.8

/**
 * 0 → 1 → 0 envelope for boost speed. `age` is seconds since a fresh boost
 * started (a same-kind refresh keeps it, so re-grabbing never dips the speed)
 * and `timeLeft` is what the timer has left. Hazards never close faster than the
 * eye can track, and the end is a gentle drain rather than a cliff.
 * @param {{age?: number, timeLeft?: number}} power
 * @returns {number} 0..1
 */
export function getBoostSurge({ age = 0, timeLeft = 0 } = {}) {
  const rising = Math.min(1, Math.max(0, Number(age) || 0) / BOOST_RAMP_IN_SECONDS)
  const draining = Math.min(1, Math.max(0, Number(timeLeft) || 0) / BOOST_RAMP_OUT_SECONDS)
  const linear = Math.min(rising, draining)
  return linear * linear * (3 - 2 * linear)
}
