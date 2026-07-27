import { describe, expect, test } from 'vitest'

import { buildRunSummary } from '../src/game/run-summary.js'

describe('post-run summary', () => {
  test('prioritizes banked rewards, personal improvement, and the next action', () => {
    expect(buildRunSummary({
      stars: 7,
      journeyBonus: 2,
      weeklyBonus: 3,
      distance: 240,
      previousBest: 210,
      maxCombo: 4,
      reason: 'Hit a kite',
    })).toEqual({
      bankedStars: 12,
      improvementMeters: 30,
      maxCombo: 4,
      reason: 'Hit a kite',
      walletAfterRun: 12,
      focusUpgradeId: null,
      nextActionKind: 'spend',
      ctaLabel: 'Spend 12★ in Hangar',
      nextAction: 'Spend 12★ in Upgrades or fly again',
    })
  })

  test('steers starless runs toward flying again without a hangar spend CTA', () => {
    expect(buildRunSummary({ stars: 0, distance: 40, previousBest: 90, maxCombo: 1 })).toMatchObject({
      bankedStars: 0,
      nextActionKind: 'fly',
      ctaLabel: 'Fly Again',
      nextAction: 'Fly again and bank your first star',
    })
  })

  test('names the cheapest affordable upgrade when the wallet can buy', () => {
    expect(buildRunSummary({
      stars: 4,
      walletAfterRun: 14,
      affordableUpgrades: [
        { id: 'lift', name: 'Lift Crease', cost: 10 },
        { id: 'handling', name: 'Fold Handling', cost: 10 },
        { id: 'magnet', name: 'Star Magnet', cost: 25 },
      ],
    })).toMatchObject({
      bankedStars: 4,
      walletAfterRun: 14,
      focusUpgradeId: 'handling',
      nextActionKind: 'spend',
      ctaLabel: 'Buy Fold Handling · 10★',
      nextAction: 'Buy Fold Handling for 10★ or fly again',
    })
  })

  test('nudges Hangar when stars banked but nothing is affordable yet', () => {
    expect(buildRunSummary({
      stars: 3,
      walletAfterRun: 3,
      affordableUpgrades: [],
    })).toMatchObject({
      bankedStars: 3,
      walletAfterRun: 3,
      focusUpgradeId: null,
      nextActionKind: 'hangar',
      ctaLabel: 'Hangar · 3★',
      nextAction: 'Banked 3★ · keep flying toward an upgrade',
    })
  })
})
