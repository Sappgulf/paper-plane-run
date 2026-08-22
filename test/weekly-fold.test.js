import { describe, expect, test } from 'vitest'
import { WEEKLY_FOLDS, foldById, thisWeeksFold, weeklyKey, weeklySeed } from '../src/game/weekly-fold.js'

describe('weekly fold', () => {
  test('every fold has a stable id, copy, and a non-negative zone offset', () => {
    const ids = new Set(WEEKLY_FOLDS.map((fold) => fold.id))
    expect(ids.size).toBe(WEEKLY_FOLDS.length)
    for (const fold of WEEKLY_FOLDS) {
      expect(fold.icon).toBeTruthy()
      expect(fold.name).toBeTruthy()
      expect(fold.desc).toBeTruthy()
      expect(fold.zoneOffset).toBeGreaterThanOrEqual(0)
    }
  })

  test('ISO week keys are UTC-stable and zero-padded', () => {
    const friday = new Date('2026-08-21T15:00:00Z')
    const stillFriday = new Date('2026-08-21T01:00:00Z')
    expect(weeklyKey(friday)).toMatch(/^\d{4}-W\d{2}$/)
    expect(weeklyKey(friday)).toBe(weeklyKey(stillFriday))
    expect(weeklyKey(new Date('2026-08-24T12:00:00Z'))).not.toBe(weeklyKey(friday))
  })

  test('the same week always picks the same fold and seed', () => {
    const date = new Date('2026-08-21T00:00:00Z')
    expect(thisWeeksFold(date)).toEqual(thisWeeksFold(date))
    expect(weeklySeed('normal', date)).toBe(weeklySeed('normal', date))
    expect(weeklySeed('hard', date)).not.toBe(weeklySeed('normal', date))
  })

  test('foldById only returns catalog entries', () => {
    expect(foldById('harbor-week')?.name).toBe('Harbor Week')
    expect(foldById('not-a-fold')).toBeNull()
  })
})
