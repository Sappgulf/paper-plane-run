const OBSTACLE_ASSET = '/assets/obstacles/obstacle-'

/**
 * Core roster — 7 silhouettes with distinct motion/read. The 6 niche types
 * (butterfly/swarm/pinwheel/meteor/clothespinDragonfly + hawk as rare) are
 * retired to cut visual noise; their art stays on disk but never spawns.
 * Each survivor has a unique movement + size signature so the player can
 * name the threat at a glance instead of parsing a wall of similar birds.
 */
export const FLYER_DEFS = [
  { id: 'bird', label: 'paper bird', radius: 0.7, weight: 1, tex: `${OBSTACLE_ASSET}bird.webp`, scale: 1.55, alpha: true },
  { id: 'balloon', label: 'runaway balloon', radius: 0.85, weight: 0.55, tex: `${OBSTACLE_ASSET}balloon.webp`, scale: 1.65, alpha: true, floaty: true },
  { id: 'kite', label: 'loose kite', radius: 0.75, weight: 0.5, tex: `${OBSTACLE_ASSET}kite.webp`, scale: 1.6, alpha: true, weave: true },
  { id: 'biplane', label: 'toy biplane', radius: 0.9, weight: 0.45, tex: `${OBSTACLE_ASSET}biplane.webp`, scale: 1.7, alpha: true, dive: true },
  { id: 'dragonfly', label: 'paper dragonfly', radius: 0.55, weight: 0.5, tex: `${OBSTACLE_ASSET}dragonfly.webp`, scale: 1.55, alpha: true },
  { id: 'wasp', label: 'paper wasp', radius: 0.45, weight: 0.4, tex: `${OBSTACLE_ASSET}wasp.webp`, scale: 1.45, alpha: true, dive: true, weave: true },
  { id: 'hawk', label: 'diving origami hawk', radius: 0.9, weight: 0.18, tex: '/assets/obstacles/obstacle-origami-hawk.webp', scale: 1.9, alpha: true, dive: true },
]

// Retired types — kept for reference but never selected by spawn logic.
export const RETIRED_FLYER_IDS = Object.freeze(['butterfly','swarm','pinwheel','meteor','clothespinDragonfly'])
