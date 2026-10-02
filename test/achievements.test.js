import { beforeEach, describe, expect, test } from 'vitest'
import {
  addLifetimeDistance,
  addLifetimeFever,
  addLifetimePopped,
  getLifetimeDistance,
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

  test('refuses to claim a tier before its threshold is met', () => {
    addLifetimePopped(30) // above tier 0 (25), below tier 1 (100)

    expect(claimAchievementTier('popped', 1)).toBe(0)
    expect(claimAchievementTier('popped', 0)).toBe(10)
  })

  test('ignores non-positive increments', () => {
    addLifetimePopped(0)
    addLifetimePopped(-5)
    expect(getLifetimePopped()).toBe(0)
  })

  test('treats malformed storage as zero and still accepts valid lifetime reward input', () => {
    localStorage.setItem('paper-plane-run-lifetime-popped', 'bad data')
    localStorage.setItem('paper-plane-run-lifetime-fever', 'bad data')
    localStorage.setItem('paper-plane-run-lifetime-distance', 'bad data')

    expect(getLifetimePopped()).toBe(0)
    expect(getLifetimeFever()).toBe(0)
    expect(getLifetimeDistance()).toBe(0)

    addLifetimePopped(4.9)
    addLifetimeFever(3.2)
    addLifetimeDistance(120.6)

    expect(getLifetimePopped()).toBe(4)
    expect(getLifetimeFever()).toBe(3)
    expect(getLifetimeDistance()).toBe(120)
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

describe('Star Collector achievement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('checks the lifetime-stars threshold before paying out', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '60')

    expect(claimAchievementTier('stars', 0)).toBe(10) // threshold 50
    expect(claimAchievementTier('stars', 1)).toBe(0) // threshold 250
  })
})
