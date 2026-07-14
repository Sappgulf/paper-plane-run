/**
 * Prices applied only to future purchases. Persisted upgrade levels and plane
 * ownership remain the source of truth for earlier purchases.
 */
export const FUTURE_PRICE_TABLE = Object.freeze({
  upgrades: Object.freeze({
    handling: Object.freeze([10, 20, 35, 55, 80]),
    lift: Object.freeze([10, 20, 35, 55, 80]),
    glide: Object.freeze([12, 24, 42, 65, 90]),
    magnet: Object.freeze([16, 32, 55, 85]),
    shield: Object.freeze([15, 28, 48, 75]),
    luck: Object.freeze([16, 32, 56, 85]),
    wingspan: Object.freeze([20, 38, 65]),
    trail: Object.freeze([12, 25, 45]),
    turbo: Object.freeze([15, 30, 52]),
    guardian: Object.freeze([35, 70]),
    weapon: Object.freeze([24, 45, 72, 105]),
    fever: Object.freeze([18, 34, 58]),
    streak: Object.freeze([14, 26, 44]),
    wealth: Object.freeze([16, 30, 50]),
  }),
  planes: Object.freeze({
    mint: 20,
    coral: 35,
    night: 55,
    gold: 80,
    sunset: 90,
    stormfoil: 100,
    neon: 110,
    rainbow: 140,
  }),
})

/**
 * Deterministic normal-flight checkpoints measured without misses or streak
 * bonuses. The 0–1 star novice probes are intentionally excluded from this
 * model because they describe early failure, not a representative completed run.
 */
export const NORMAL_RUN_EARNINGS = Object.freeze([
  Object.freeze({ distance: 100, stars: 3.5 }),
  Object.freeze({ distance: 200, stars: 7 }),
  Object.freeze({ distance: 350, stars: 12 }),
])

function nonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

/** Estimate wallet-star earning capacity from an explicit run-rate assumption. */
export function estimateProgression({ starsPerRun, runs } = {}) {
  const estimatedStarsPerRun = nonNegativeNumber(starsPerRun)
  const estimatedRuns = Math.floor(nonNegativeNumber(runs))
  return {
    starsPerRun: estimatedStarsPerRun,
    runs: estimatedRuns,
    walletStars: estimatedStarsPerRun * estimatedRuns,
  }
}

/** Convert a wallet shortfall into a player-facing normal-run estimate. */
export function estimateRunsToAfford({ wallet, cost, starsPerRun = NORMAL_RUN_EARNINGS[1].stars } = {}) {
  const missingStars = Math.max(0, nonNegativeNumber(cost) - nonNegativeNumber(wallet))
  const earningRate = nonNegativeNumber(starsPerRun)
  return {
    missingStars,
    runs: missingStars > 0 && earningRate > 0 ? Math.ceil(missingStars / earningRate) : 0,
    affordable: missingStars === 0,
  }
}
