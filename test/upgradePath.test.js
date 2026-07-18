import { describe, expect, test } from 'vitest'
import { UPGRADES } from '../src/upgrades.js'
import {
  EARLY_UPGRADE_PATH,
  describeEarlyPathBanner,
  nextRecommendedUpgrade,
} from '../src/game/upgrade-path.js'

describe('upgrade early path', () => {
  test('recommends handling first for a fresh tree', () => {
    const next = nextRecommendedUpgrade({}, UPGRADES)
    expect(next?.id).toBe('handling')
    expect(EARLY_UPGRADE_PATH[0].id).toBe('handling')
  })

  test('skips maxed early steps and clears when path is done', () => {
    const levels = { handling: 5, lift: 5, magnet: 4, luck: 4, fever: 3 }
    expect(nextRecommendedUpgrade(levels, UPGRADES)).toBeNull()
    const mid = nextRecommendedUpgrade({ handling: 5, lift: 2 }, UPGRADES)
    expect(mid?.id).toBe('lift')
    const banner = describeEarlyPathBanner(mid, UPGRADES)
    expect(banner.visible).toBe(true)
    expect(banner.title).toMatch(/Lift/)
  })
})
