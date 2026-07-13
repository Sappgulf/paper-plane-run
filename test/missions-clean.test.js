import { beforeEach, describe, expect, test } from 'vitest'
import { dailyKey } from '../src/rng.js'
import { claimMission, updateMissionsFromRun } from '../src/missions.js'

describe('clean-run mission type', () => {
  beforeEach(() => {
    localStorage.setItem(
      'paper-plane-run-missions',
      JSON.stringify({
        day: dailyKey(),
        missions: [
          { id: 'clean_run-0', type: 'clean_distance', target: 150, progress: 0, done: false, claimed: false },
        ],
        claimStars: 0,
      }),
    )
  })

  test('only counts distance from a run with zero power-up pickups', () => {
    let missions = updateMissionsFromRun({ stars: 3, distance: 200, maxCombo: 1, powers: 2, winds: 0, mode: 'normal' })
    expect(missions[0].progress).toBe(0)
    expect(missions[0].done).toBe(false)

    missions = updateMissionsFromRun({ stars: 1, distance: 160, maxCombo: 1, powers: 0, winds: 0, mode: 'normal' })
    expect(missions[0].progress).toBe(150)
    expect(missions[0].done).toBe(true)
  })
})

describe('sharpshooter mission type', () => {
  beforeEach(() => {
    localStorage.setItem(
      'paper-plane-run-missions',
      JSON.stringify({
        day: dailyKey(),
        missions: [
          { id: 'sharpshooter-0', type: 'popped', target: 5, progress: 0, done: false, claimed: false },
        ],
        claimStars: 0,
      }),
    )
  })

  test('tracks Ink Blast pops for the run', () => {
    let missions = updateMissionsFromRun({ stars: 0, distance: 50, maxCombo: 0, powers: 0, winds: 0, popped: 2, mode: 'normal' })
    expect(missions[0].progress).toBe(2)
    expect(missions[0].done).toBe(false)

    missions = updateMissionsFromRun({ stars: 0, distance: 60, maxCombo: 0, powers: 0, winds: 0, popped: 5, mode: 'normal' })
    expect(missions[0].progress).toBe(5)
    expect(missions[0].done).toBe(true)
  })
})

describe('mission rewards', () => {
  test('claims a completed mission only once', () => {
    localStorage.setItem(
      'paper-plane-run-missions',
      JSON.stringify({
        day: dailyKey(),
        missions: [
          { id: 'stars-0', type: 'stars', target: 20, progress: 20, done: true, claimed: false },
        ],
        claimStars: 0,
      }),
    )

    expect(claimMission('stars-0')).toBe(10)
    expect(claimMission('stars-0')).toBe(0)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-missions'))).toMatchObject({
      missions: [{ id: 'stars-0', claimed: true }],
      claimStars: 10,
    })
  })
})
