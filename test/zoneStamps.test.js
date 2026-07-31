import { describe, expect, it } from 'vitest'
import { routeRiskLabel, stampSpriteZone, zoneStampLabel } from '../src/game/zone-stamps.js'

describe('zone stamp presentation contract', () => {
  it('maps every Chapter 1 zone to a distinct sprite cell', () => {
    expect(['city', 'harbor', 'storm', 'aurora'].map(stampSpriteZone)).toEqual(['city', 'harbor', 'storm', 'aurora'])
  })

  it('keeps Chapter 2 zones on the closest available stamp palette', () => {
    expect(stampSpriteZone('sunset')).toBe('aurora')
    expect(stampSpriteZone('midnight')).toBe('storm')
    expect(stampSpriteZone('unknown')).toBe('city')
  })

  it('turns persisted route risk into readable in-flight copy', () => {
    expect(routeRiskLabel({ risk: 'safe', rewardMultiplier: 1.15 })).toBe('SCENIC · 1.15×')
    expect(routeRiskLabel({ risk: 'risky', rewardMultiplier: 1.5 })).toBe('SHORTCUT · 1.50×')
    expect(routeRiskLabel()).toBe('OPEN AIR')
    expect(zoneStampLabel('Cloud Harbor')).toBe('Cloud Harbor stamp')
  })
})
