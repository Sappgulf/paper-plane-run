import { describe, expect, test } from 'vitest'
import {
  advanceStarStreakState,
  createStarStreakState,
  registerStarPickup,
} from '../src/game/star-streak.js'

describe('steady hands star streak', () => {
  test('extends the pickup window with Steady Hands and banks bonuses every fifth star', () => {
    const baseline = registerStarPickup({ count: 0, streakWindowBonus: 0 })
    const maxed = registerStarPickup({ count: 0, streakWindowBonus: 1.2 })
    expect(maxed.timer).toBeGreaterThan(baseline.timer)
    expect(maxed.windowSeconds).toBeCloseTo(3.4)

    const fifth = registerStarPickup({ count: 4, streakWindowBonus: 0.4 })
    expect(fifth).toMatchObject({
      count: 5,
      milestone: true,
      bonusStars: 2,
      visible: true,
      banner: '⭐ Star Streak x5! +2',
    })
  })

  test('clears the streak once the Steady Hands window expires', () => {
    const live = registerStarPickup({ count: 2, streakWindowBonus: 0 })
    expect(advanceStarStreakState(live, live.timer - 0.01).count).toBe(3)
    expect(advanceStarStreakState(live, live.timer + 0.01)).toEqual(createStarStreakState())
  })
})
