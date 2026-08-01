/**
 * Prices applied only to future purchases. Persisted upgrade levels and plane
 * ownership remain the source of truth for earlier purchases.
 *
 * Balance goals (normal ~7★/run):
 * - First core upgrade (10★) in ~2 runs
 * - Second core rank or first plane (Mint) within ~3 runs total
 * - Mid-tree ranks ask for a short save, not a wall
 * - Late planes reward long play without 20+ run grinds
 */
export const FUTURE_PRICE_TABLE = Object.freeze({
  upgrades: Object.freeze({
    handling: Object.freeze([10, 18, 32, 50, 75]),
    lift: Object.freeze([10, 18, 32, 50, 75]),
    glide: Object.freeze([12, 22, 38, 58, 82]),
    magnet: Object.freeze([14, 28, 48, 75]),
    shield: Object.freeze([14, 26, 44, 68]),
    luck: Object.freeze([14, 28, 50, 78]),
    wingspan: Object.freeze([18, 34, 58]),
    trail: Object.freeze([10, 22, 40]),
    turbo: Object.freeze([14, 28, 48]),
    guardian: Object.freeze([30, 60]),
    weapon: Object.freeze([22, 40, 65, 95]),
    // First ranks of the late tree stay inside a short normal-run save so the
    // three newest upgrades never feel gated behind prestige play.
    fever: Object.freeze([15, 28, 48]),
    streak: Object.freeze([12, 22, 38]),
    wealth: Object.freeze([14, 26, 44]),
    gustproof: Object.freeze([16, 32, 54]),
    powerloom: Object.freeze([18, 34, 58]),
    inkledger: Object.freeze([20, 38, 62]),
  }),
  planes: Object.freeze({
    mint: 18,
    coral: 32,
    night: 50,
    gold: 72,
    sunset: 82,
    stormfoil: 92,
    neon: 105,
    rainbow: 125,
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

/** Sum future purchase costs for ranks that are still available. */
export function estimateUpgradeTreeCost({ levels = {}, priceTable = FUTURE_PRICE_TABLE.upgrades } = {}) {
  let total = 0
  let firstRankTotal = 0
  for (const [id, prices] of Object.entries(priceTable)) {
    const owned = Math.max(0, Math.floor(nonNegativeNumber(levels[id])))
    firstRankTotal += nonNegativeNumber(prices[0])
    for (let rank = owned; rank < prices.length; rank += 1) {
      total += nonNegativeNumber(prices[rank])
    }
  }
  return Object.freeze({ total, firstRankTotal, upgradeCount: Object.keys(priceTable).length })
}
