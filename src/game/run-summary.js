function nonNegative(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

export function buildRunSummary({
  stars = 0,
  journeyBonus = 0,
  weeklyBonus = 0,
  distance = 0,
  previousBest = 0,
  maxCombo = 0,
  reason = '',
} = {}) {
  const bankedStars = nonNegative(stars) + nonNegative(journeyBonus) + nonNegative(weeklyBonus)
  const improvementMeters = Math.max(0, Math.floor(nonNegative(distance) - nonNegative(previousBest)))
  return Object.freeze({
    bankedStars,
    improvementMeters,
    maxCombo: Math.floor(nonNegative(maxCombo)),
    reason: String(reason || ''),
    nextAction: bankedStars > 0
      ? `Spend ${bankedStars}★ in Upgrades or fly again`
      : 'Fly again and bank your first star',
  })
}
