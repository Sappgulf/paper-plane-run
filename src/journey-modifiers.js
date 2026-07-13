export function applyJourneyModifier(base, config = {}) {
  const result = { ...base }
  switch (config.modifier) {
  case 'crosswind': result.wind = (base.wind || 1) * 1.7; break
  case 'low-visibility':
    result.fog = (base.fog || 1) * 1.65
    result.visibilityPocket = { duration: 5, density: 0.78 }
    break
  case 'star-trail': result.stars = (base.stars || 1) * 1.6; break
  case 'moving-formation':
    result.movingObstacles = true
    result.movingFormation = { amplitude: 4.5, speed: 2.4 }
    break
  case 'shortcut-gates':
    result.shortcutGates = true
    result.shortcutGateSequence = { required: 3, bonus: 1 }
    break
  case 'red-dart-finale': result.rival = true; result.wind = (base.wind || 1) * 1.25; break
  case 'scissors-finale': result.boss = true; break
  default: break
  }
  return result
}

export function getPilotEffect(pilotId, telemetry = {}) {
  if (pilotId === 'daredevil') {
    return { momentum: Math.min(0.12, Math.max(0, Number(telemetry.nearMisses) || 0) * 0.012), shortcutHint: false }
  }
  return { momentum: 0, shortcutHint: pilotId === 'navigator' }
}

export function getJourneyRewardMultiplier(config) {
  return Math.max(1, Number(config?.rewardMultiplier) || 1)
}
