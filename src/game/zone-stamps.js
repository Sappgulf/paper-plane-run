/**
 * Small, code-addressable art contract for Journey stamps.
 * The generated sprite sheet stays presentation-only; gameplay state still
 * refers to the stable zone id and route stamp id.
 */
export const ZONE_STAMP_SPRITES = Object.freeze({
  city: 'city',
  harbor: 'harbor',
  storm: 'storm',
  aurora: 'aurora',
})

const STAMP_FALLBACKS = Object.freeze({
  sunset: 'aurora',
  midnight: 'storm',
})

const ZONE_STAMP_NAMES = Object.freeze({
  city: 'Paper City',
  harbor: 'Cloud Harbor',
  storm: 'Storm Scrapyard',
  aurora: 'Aurora Washi',
  sunset: 'Golden Fold',
  midnight: 'Midnight Origami',
})

export function stampSpriteZone(zoneId = 'city') {
  return ZONE_STAMP_SPRITES[zoneId] || STAMP_FALLBACKS[zoneId] || 'city'
}

export function routeRiskLabel(config = {}) {
  if (config.risk === 'risky') return `SHORTCUT · ${(Number(config.rewardMultiplier) || 0).toFixed(2)}×`
  if (config.risk === 'safe') return `SCENIC · ${(Number(config.rewardMultiplier) || 0).toFixed(2)}×`
  return 'OPEN AIR'
}

export function zoneStampLabel(zoneName = 'Paper City') {
  return `${ZONE_STAMP_NAMES[zoneName] || zoneName} stamp`
}
