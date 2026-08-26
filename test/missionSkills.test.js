import { beforeEach, describe, expect, test } from 'vitest'
import { dailyKey } from '../src/rng.js'
import { updateMissionsFromRun } from '../src/missions.js'

describe('skill-reward mission types', () => {
  beforeEach(() => {
    localStorage.setItem(
      'paper-plane-run-missions',
      JSON.stringify({
        day: dailyKey(),
        missions: [
          { id: 'gauntlet_runner-0', type: 'gauntlets', target: 2, progress: 0, done: false, claimed: false },
          { id: 'gap_threader-0', type: 'threads', target: 1, progress: 0, done: false, claimed: false },
        ],
        claimStars: 0,
      }),
    )
  })

  test('gauntlet clears count toward the gauntlet mission', () => {
    let missions = updateMissionsFromRun({ distance: 100, stars: 0, gauntlets: 1, mode: 'normal' })
    expect(missions[0].progress).toBe(1)
    expect(missions[0].done).toBe(false)
    missions = updateMissionsFromRun({ distance: 120, stars: 0, gauntlets: 3, mode: 'normal' })
    expect(missions[0].progress).toBe(2)
    expect(missions[0].done).toBe(true)
  })

  test('threaded gaps count toward the thread mission, missing stats default to 0', () => {
    let missions = updateMissionsFromRun({ distance: 100, stars: 0, threads: 1, mode: 'normal' })
    expect(missions[1].progress).toBe(1)
    expect(missions[1].done).toBe(true)
    missions = updateMissionsFromRun({ distance: 100, stars: 0, mode: 'normal' })
    expect(missions[1].progress).toBe(1)
  })
})
