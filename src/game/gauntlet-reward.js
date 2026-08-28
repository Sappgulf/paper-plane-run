/**
 * Mini-gauntlets announce "LEFT lane open" but surviving paid nothing —
 * unlike boss gates, which clear with stars, recovery and hit-stop. The
 * gauntlet is now a wager: commit to the advertised lane and passing the
 * last hazard banks a proper payout. Drifting wide still survives, but the
 * lane promise stays honest by only paying inside it.
 */

/** Half-width of the advertised corridor around the safe-lane center. */
export const GAUNTLET_LANE_HALF_WIDTH = 3.4

/**
 * @param {{playerX: number, laneX: number, halfWidth?: number}} params
 */
export function isInsideGauntletLane({ playerX = 0, laneX = 0, halfWidth = GAUNTLET_LANE_HALF_WIDTH } = {}) {
  return Math.abs((Number(playerX) || 0) - (Number(laneX) || 0)) <= Math.max(0.5, Number(halfWidth) || 0)
}

const GAUNTLET_STARS = 3
const GAUNTLET_BONUS_METERS = 50

/**
 * @param {{inLane: boolean}} params
 * @returns {{stars: number, bonusMeters: number, label: string}|null}
 *   Null when the run passed outside the promised lane — no reward, no penalty.
 */
export function resolveGauntletReward({ inLane } = {}) {
  if (!inLane) return null
  return Object.freeze({
    stars: GAUNTLET_STARS,
    bonusMeters: GAUNTLET_BONUS_METERS,
    label: `GAUNTLET CLEARED · +${GAUNTLET_STARS}★`,
  })
}
