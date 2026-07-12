import { beforeEach, describe, expect, test } from 'vitest'
import { dailyKey } from '../src/rng.js'
import { updateMissionsFromRun } from '../src/missions.js'

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
