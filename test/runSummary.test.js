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
      nextAction: 'Spend 12★ in Upgrades or fly again',
    })
  })
})
