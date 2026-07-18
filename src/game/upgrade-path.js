/**
 * Non-binding Hangar guidance: a short early-game path for new pilots.
 * Order is intentional — control first, then collect, then juice.
 */
export const EARLY_UPGRADE_PATH = Object.freeze([
  Object.freeze({ id: 'handling', reason: 'Tighter banks from the first flight' }),
  Object.freeze({ id: 'lift', reason: 'Less sink so altitude stays readable' }),
  Object.freeze({ id: 'magnet', reason: 'Stars come to you in messy traffic' }),
  Object.freeze({ id: 'luck', reason: 'More stars and powers to fund the tree' }),
  Object.freeze({ id: 'fever', reason: 'Near-miss chains pay off sooner' }),
])

/**
 * Pick the next recommended upgrade that is not yet maxed.
 * @param {Record<string, number>} levels
 * @param {Array<{ id: string, max: number }>} catalog
 */
export function nextRecommendedUpgrade(levels = {}, catalog = []) {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  for (const step of EARLY_UPGRADE_PATH) {
    const upgrade = byId.get(step.id)
    if (!upgrade) continue
    const owned = Math.max(0, Math.floor(Number(levels[step.id]) || 0))
    if (owned < upgrade.max) {
      return Object.freeze({
        id: step.id,
        reason: step.reason,
        level: owned,
        max: upgrade.max,
      })
    }
  }
  return null
}

export function describeEarlyPathBanner(recommendation, catalog = []) {
  if (!recommendation) {
    return Object.freeze({
      visible: false,
      title: 'Early path complete',
      body: 'Every starter upgrade is maxed — chase prestige or late-tree juice.',
    })
  }
  const entry = catalog.find((item) => item.id === recommendation.id)
  const name = entry ? `${entry.icon || ''} ${entry.name}`.trim() : recommendation.id
  return Object.freeze({
    visible: true,
    title: `Recommended: ${name}`,
    body: recommendation.reason,
    upgradeId: recommendation.id,
  })
}
