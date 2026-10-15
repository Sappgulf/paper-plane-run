/** Corridor distance from the centre where a gust starts to lose its outward force. */
export const WIND_WALL_EASE_FROM = 10
/** Distance over which the outward force fades to its minimum. */
export const WIND_WALL_EASE_SPAN = 3
/** Share of an outward push that is removed right at the wall. */
export const WIND_WALL_EASE_MAX = 0.7

/**
 * Shrinks a gust that would shove the plane further toward the wall it is
 * already near. Near the walls there is no room left to dodge, so a sideways
 * shove there reads as unfair. Inward pushes are never changed.
 */
export function easeWindTowardWall(push, planeX) {
  const offset = Math.abs(Number(planeX) || 0)
  const outward = push !== 0 && Math.sign(push) === Math.sign(planeX)
  if (!outward || offset <= WIND_WALL_EASE_FROM) return push
  const amount = Math.min(1, (offset - WIND_WALL_EASE_FROM) / WIND_WALL_EASE_SPAN)
  return push * (1 - WIND_WALL_EASE_MAX * amount)
}

/** The side a gust pushes toward, for the banner. */
export function windPushSide(force) {
  return force > 0 ? 'right' : 'left'
}

/**
 * How long a gust is telegraphed before it lands. Gust Reader adds to the base
 * warning only; the push itself is unchanged. A malformed bonus adds nothing.
 */
export function gustWarningSeconds(baseSeconds, effects = {}) {
  const bonus = Number(effects?.windWarningBonus)
  return baseSeconds + (Number.isFinite(bonus) && bonus > 0 ? bonus : 0)
}
