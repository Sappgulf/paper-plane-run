/**
 * Core roster — 7 silhouettes with distinct motion/read. The 5 niche types
 * (butterfly/swarm/pinwheel/meteor/clothespinDragonfly) are retired to cut
 * visual noise. Their art lives in docs/retired-art/ rather than the release,
 * and they never spawn. Each survivor has a unique movement + size signature so
 * the player can name the threat at a glance instead of parsing a wall of
 * similar birds.
 */
/** Each flyer is cut from paper in its zone accent by src/game/paper-art.js; `sprite` marks it as a billboard. */
export const FLYER_DEFS = [
  { id: 'bird', label: 'paper bird', radius: 0.7, weight: 1, sprite: 'paper', scale: 1.55, alpha: true },
  { id: 'balloon', label: 'runaway balloon', radius: 0.85, weight: 0.55, sprite: 'paper', scale: 1.65, alpha: true, floaty: true },
  { id: 'kite', label: 'loose kite', radius: 0.75, weight: 0.5, sprite: 'paper', scale: 1.6, alpha: true, weave: true },
  { id: 'biplane', label: 'toy biplane', radius: 0.9, weight: 0.45, sprite: 'paper', scale: 1.7, alpha: true, dive: true },
  { id: 'dragonfly', label: 'paper dragonfly', radius: 0.55, weight: 0.5, sprite: 'paper', scale: 1.55, alpha: true },
  { id: 'wasp', label: 'paper wasp', radius: 0.45, weight: 0.4, sprite: 'paper', scale: 1.45, alpha: true, dive: true, weave: true },
  { id: 'hawk', label: 'diving origami hawk', radius: 0.9, weight: 0.18, sprite: 'paper', scale: 1.9, alpha: true, dive: true },
]

// Retired types — kept for reference but never selected by spawn logic.
export const RETIRED_FLYER_IDS = Object.freeze(['butterfly','swarm','pinwheel','meteor','clothespinDragonfly'])

/**
 * Seasonal re-weighting of the live roster, as multipliers on each flyer's
 * authored weight. A season can only name flyers in FLYER_DEFS: an unknown id
 * is silently ignored, which is how spring kept boosting butterflies long after
 * they were retired. test/flyers.test.js pins every key to a live flyer.
 */
export const SEASONAL_FLYER_BIAS = Object.freeze({
  halloween: Object.freeze({ bird: 1.4 }),
  spring: Object.freeze({ dragonfly: 2 }),
  summer: Object.freeze({ kite: 1.5, balloon: 1.5 }),
})

/** Copies of the roster with this season's weights applied. Never mutates the input. */
export function flyerPoolForSeason(defs = FLYER_DEFS, seasonId = 'default') {
  const bias = SEASONAL_FLYER_BIAS[seasonId] ?? {}
  return defs.map((flyer) => ({ ...flyer, weight: flyer.weight * (bias[flyer.id] ?? 1) }))
}
