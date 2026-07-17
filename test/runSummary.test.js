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
})
