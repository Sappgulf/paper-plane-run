import { getSpawnRates } from './upgrade-runtime.js'

/**
 * Deterministic star-cluster plan for one chunk. Gold Rush raises double-star
 * odds through `doubleStarBonus`; Lucky Scrap scales both star rolls.
 */
export function planStarSpawns({
  random = Math.random,
  starChance = 0,
  powerChance = 0,
  ramp = 0,
  starChanceMul = 1,
  powerChanceMul = 1,
  twistStarMul = 1,
  doubleStarBonus = 0,
} = {}) {
  const rates = getSpawnRates({
    starChance,
    powerChance,
    ramp,
    starChanceMul,
    powerChanceMul,
    twistStarMul,
    doubleStarBonus,
  })
  const sample = () => {
    const value = Number(random())
    return Number.isFinite(value) ? value : 0.5
  }
  const clusterRoll = sample()
  const rolls = clusterRoll < rates.doubleStarChance ? 2 : 1
  const placements = []
  for (let index = 0; index < rolls; index += 1) {
    if (sample() < rates.starChance) placements.push(index)
  }
  return Object.freeze({
    rates,
    rolls,
    cluster: rolls > 1,
    starCount: placements.length,
    placements: Object.freeze(placements),
    powerSpawn: sample() < rates.powerChance,
  })
}

export const STAR_TELEGRAPH_DISTANCE = 80

export function shouldTelegraphStarLane(distance = 0) {
  return (Number(distance) || 0) < STAR_TELEGRAPH_DISTANCE
}

/** First 40m: keep a readable star on the reserved lane at mid altitude. */
export function applyStarLaneTelegraph(plan, { distance = 0, midY = 8 } = {}) {
  const telegraph = shouldTelegraphStarLane(distance)
  const source = plan && typeof plan === 'object' ? plan : {}
  const starCount = telegraph ? Math.max(1, Number(source.starCount) || 0) : Number(source.starCount) || 0
  const placements = Array.isArray(source.placements) && source.placements.length
    ? source.placements
    : starCount > 0
      ? Object.freeze([0])
      : Object.freeze([])
  return Object.freeze({
    ...source,
    starCount,
    placements: Object.freeze(placements.slice(0, Math.max(starCount, placements.length))),
    telegraph,
    telegraphY: telegraph ? midY : null,
    telegraphScale: telegraph ? 1.55 : 1,
  })
}
