import { beforeEach, describe, expect, test } from 'vitest'
import {
  addLifetimeFever,
  addLifetimePopped,
  getLifetimeFever,
  getLifetimePopped,
  getAchievementProgress,
  claimAchievementTier,
} from '../src/achievements.js'

describe('Sharpshooter achievement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('accumulates lifetime pops and unlocks tiers in order', () => {
    expect(getLifetimePopped()).toBe(0)
    addLifetimePopped(20)
    addLifetimePopped(10)
    expect(getLifetimePopped()).toBe(30)

    const progress = getAchievementProgress(0)
    const popped = progress.find((a) => a.id === 'popped')
    expect(popped.value).toBe(30)
    expect(popped.tiers[0].done).toBe(true) // threshold 25
    expect(popped.tiers[1].done).toBe(false) // threshold 100

    const reward = claimAchievementTier('popped', 0)
    expect(reward).toBe(10)
  })

  test('ignores non-positive increments', () => {
    addLifetimePopped(0)
    addLifetimePopped(-5)
    expect(getLifetimePopped()).toBe(0)
  })
})

describe('Fever Pitch achievement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('tracks lifetime fever triggers', () => {
    expect(getLifetimeFever()).toBe(0)
    addLifetimeFever(3)
    expect(getLifetimeFever()).toBe(3)
    const fever = getAchievementProgress(0).find((a) => a.id === 'fever')
    expect(fever.tiers[0].done).toBe(true)
    expect(claimAchievementTier('fever', 0)).toBe(10)
  })
})
