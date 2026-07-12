import { beforeEach, describe, expect, test, vi } from 'vitest'
import { updatePlayStreak, getPlayStreak, claimWeeklyStreakBonus } from '../src/missions.js'

describe('daily play streak', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  test('starts a streak on first play and ignores repeat calls the same day', () => {
    expect(getPlayStreak()).toBe(0)
    expect(updatePlayStreak()).toBe(1)
    expect(updatePlayStreak()).toBe(1)
    expect(getPlayStreak()).toBe(1)
  })

  test('extends the streak on a consecutive day and resets after a gap', () => {
    const day1 = new Date('2026-07-10T12:00:00Z')
    const day2 = new Date('2026-07-11T12:00:00Z')
    const day4 = new Date('2026-07-13T12:00:00Z')

    vi.setSystemTime(day1)
    expect(updatePlayStreak()).toBe(1)

    vi.setSystemTime(day2)
    expect(updatePlayStreak()).toBe(2)

    vi.setSystemTime(day4)
    expect(updatePlayStreak()).toBe(1)

    vi.useRealTimers()
  })

  test('pays a weekly bonus only once per 7-day multiple', () => {
    let streak = 0
    for (let i = 0; i < 7; i++) {
      streak = updatePlayStreak()
      vi.setSystemTime(new Date(Date.now() + 86400000))
    }
    expect(streak).toBe(7)
    expect(claimWeeklyStreakBonus()).toBe(40)
    expect(claimWeeklyStreakBonus()).toBe(0)
    vi.useRealTimers()
  })
})
