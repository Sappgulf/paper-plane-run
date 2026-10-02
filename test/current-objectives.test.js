import { beforeEach, describe, expect, test, vi, afterEach } from 'vitest'
import * as achievements from '../src/achievements.js'
import { getDailyMissions, claimMission } from '../src/missions.js'
import { dailyKey } from '../src/rng.js'

const missionKey = 'paper-plane-run-missions'

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('missions for the current flight loop', () => {
  test('never assigns the retired weapon across sixty daily rotations', () => {
    vi.useFakeTimers()
    for (let day = 1; day <= 60; day++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, day)))
      const missions = getDailyMissions()
      expect(missions).toHaveLength(3)
      expect(missions.some((mission) => mission.type === 'popped' || mission.label.includes('Ink Blast'))).toBe(false)
    }
  })

  test('replaces only an unfinished retired objective and preserves today’s progress and streak', () => {
    const earned = { id: 'stars-0', type: 'stars', target: 8, progress: 8, done: true, claimed: true }
    const partial = { id: 'distance-2', type: 'distance', target: 200, progress: 120, done: false, claimed: false }
    localStorage.setItem(missionKey, JSON.stringify({
      day: dailyKey(), streakDays: 7, claimStars: 8, missions: [earned,
        { id: 'sharpshooter-1', type: 'popped', target: 5, progress: 0, done: false, claimed: false }, partial],
    }))
    const missions = getDailyMissions()
    expect(missions[0]).toEqual(earned)
    expect(missions[2]).toEqual(partial)
    expect(missions[1].type).not.toBe('popped')
    expect(missions[1].target).toBeGreaterThan(0)
    expect(new Set(missions.map((mission) => mission.type)).size).toBe(3)
    expect(getDailyMissions()).toEqual(missions)
    expect(JSON.parse(localStorage.getItem(missionKey))).toMatchObject({ streakDays: 7, claimStars: 8 })
  })

  test('keeps a previously completed retired mission claimable', () => {
    localStorage.setItem(missionKey, JSON.stringify({ day: dailyKey(), missions: [
      { id: 'sharpshooter-0', type: 'popped', target: 5, progress: 5, done: true, claimed: false },
    ] }))
    expect(getDailyMissions()[0].done).toBe(true)
    expect(claimMission('sharpshooter-0')).toBe(8)
    expect(claimMission('sharpshooter-0')).toBe(0)
  })

  test('recovers from a valid JSON value with an invalid mission-state shape', () => {
    localStorage.setItem(missionKey, 'null')
    expect(getDailyMissions()).toHaveLength(3)
  })

  test('daily mission rotation preserves the consecutive-day streak', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'))
    getDailyMissions()
    const state = JSON.parse(localStorage.getItem(missionKey))
    localStorage.setItem(missionKey, JSON.stringify({ ...state, streakDays: 6, lastPlayDay: dailyKey() }))
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
    getDailyMissions()
    expect(JSON.parse(localStorage.getItem(missionKey))).toMatchObject({ streakDays: 6, lastPlayDay: '2026-10-02' })
  })
})

describe('current and historical lifetime awards', () => {
  test('fresh profiles have an attainable gauntlet award instead of the retired weapon award', () => {
    const ids = achievements.getAchievementProgress(0).map((award) => award.id)
    expect(ids).toContain('gauntlets')
    expect(ids).not.toContain('popped')
  })

  test('records gauntlets and allows each earned tier to be claimed once', () => {
    achievements.addLifetimeGauntlets(2)
    achievements.addLifetimeGauntlets(1)
    expect(achievements.getLifetimeGauntlets()).toBe(3)
    const award = achievements.getAchievementProgress(0).find((entry) => entry.id === 'gauntlets')
    expect(award.tiers[0].claimable).toBe(true)
    expect(award.tiers[1].claimable).toBe(false)
    expect(achievements.claimAchievementTier('gauntlets', 0)).toBe(10)
    expect(achievements.claimAchievementTier('gauntlets', 0)).toBe(0)
  })

  test('retains historical weapon progress and claimed reward tiers', () => {
    localStorage.setItem('paper-plane-run-lifetime-popped', '30')
    localStorage.setItem('paper-plane-run-achievements-claimed', JSON.stringify({ popped: 0 }))
    const old = achievements.getAchievementProgress(0).find((award) => award.id === 'popped')
    expect(old.value).toBe(30)
    expect(old.tiers[0].claimed).toBe(true)
  })
})
