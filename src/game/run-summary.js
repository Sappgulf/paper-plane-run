function nonNegative(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function normalizeAffordable(list) {
  if (!Array.isArray(list)) return null
  return list
    .map((item) => ({
      id: String(item?.id || ''),
      name: String(item?.name || 'Upgrade'),
      cost: Math.max(0, Math.floor(nonNegative(item?.cost))),
    }))
    .filter((item) => item.id && item.cost > 0)
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
}

export function buildRunSummary({
  stars = 0,
  journeyBonus = 0,
  weeklyBonus = 0,
  distance = 0,
  previousBest = 0,
  maxCombo = 0,
  reason = '',
  walletAfterRun = null,
  affordableUpgrades = null,
} = {}) {
  const bankedStars = nonNegative(stars) + nonNegative(journeyBonus) + nonNegative(weeklyBonus)
  const improvementMeters = Math.max(0, Math.floor(nonNegative(distance) - nonNegative(previousBest)))
  const wallet = walletAfterRun == null ? Math.floor(bankedStars) : Math.floor(nonNegative(walletAfterRun))
  const affordable = normalizeAffordable(affordableUpgrades)
  const cheapest = affordable?.[0] || null

  let nextActionKind = 'fly'
  let ctaLabel = 'Fly Again'
  let nextAction = 'Fly again and bank your first star'
  let focusUpgradeId = null

  if (cheapest) {
    nextActionKind = 'spend'
    focusUpgradeId = cheapest.id
    ctaLabel = `Buy ${cheapest.name} · ${cheapest.cost}★`
    nextAction = `Buy ${cheapest.name} for ${cheapest.cost}★ or fly again`
  } else if (affordable) {
    // Wallet known but nothing buyable yet — still open Hangar when stars landed.
    if (bankedStars > 0 || wallet > 0) {
      nextActionKind = 'hangar'
      ctaLabel = `Hangar · ${wallet}★`
      nextAction = bankedStars > 0
        ? `Banked ${Math.floor(bankedStars)}★ · keep flying toward an upgrade`
        : `Wallet ${wallet}★ · check upgrades in the Hangar`
    }
  } else if (bankedStars > 0) {
    nextActionKind = 'spend'
    ctaLabel = `Spend ${Math.floor(bankedStars)}★ in Hangar`
    nextAction = `Spend ${Math.floor(bankedStars)}★ in Upgrades or fly again`
  }

  return Object.freeze({
    bankedStars,
    improvementMeters,
    maxCombo: Math.floor(nonNegative(maxCombo)),
    reason: String(reason || ''),
    walletAfterRun: wallet,
    focusUpgradeId,
    nextActionKind,
    ctaLabel,
    nextAction,
  })
}
