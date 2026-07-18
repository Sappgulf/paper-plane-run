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
