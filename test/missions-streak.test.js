import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { claimWeeklyStreakBonus, getPlayStreak, updatePlayStreak } from '../src/missions.js'

const DAY = 86400000

function advanceDays(days) {
  vi.setSystemTime(Date.now() + days * DAY)
}

describe('play streak and weekly bonus', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z').getTime())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('continues a streak on consecutive days and ignores same-day replays', () => {
    expect(updatePlayStreak()).toBe(1)
    expect(updatePlayStreak()).toBe(1)
    advanceDays(1)
    expect(updatePlayStreak()).toBe(2)
    advanceDays(1)
    expect(updatePlayStreak()).toBe(3)
    expect(getPlayStreak()).toBe(3)
  })

  test('resets the streak after a missed day', () => {
    updatePlayStreak()
    advanceDays(1)
    updatePlayStreak()
    expect(getPlayStreak()).toBe(2)
    advanceDays(2)
    expect(updatePlayStreak()).toBe(1)
    expect(getPlayStreak()).toBe(1)
  })

  test('pays the weekly bonus exactly once at a 7-day multiple', () => {
    for (let day = 0; day < 7; day++) {
      updatePlayStreak()
      advanceDays(1)
    }
    expect(getPlayStreak()).toBe(7)
    expect(claimWeeklyStreakBonus()).toBe(40)
    expect(claimWeeklyStreakBonus()).toBe(0)
    advanceDays(-1)
    expect(claimWeeklyStreakBonus()).toBe(0)
  })

  test('pays again only at the next 7-day multiple', () => {
    for (let day = 0; day < 14; day++) {
      updatePlayStreak()
      if (day < 13) advanceDays(1)
      if (day === 6) expect(claimWeeklyStreakBonus()).toBe(40)
      if (day === 11) expect(claimWeeklyStreakBonus()).toBe(0)
    }
    expect(getPlayStreak()).toBe(14)
    expect(claimWeeklyStreakBonus()).toBe(40)
  })

  test('never pays while the streak sits below a 7-day multiple', () => {
    updatePlayStreak()
    advanceDays(2)
    updatePlayStreak()
    expect(getPlayStreak()).toBe(1)
    expect(claimWeeklyStreakBonus()).toBe(0)
  })
})
