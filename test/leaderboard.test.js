import { beforeEach, describe, expect, test } from 'vitest'
import {
  getLocalTop,
  getWeeklyTop,
  submitLocalScore,
} from '../src/leaderboard.js'

describe('leaderboards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('keeps a weekly board separate from the daily list', () => {
    submitLocalScore({
      name: 'Fold',
      distance: 900,
      stars: 11,
      mode: 'normal',
      weekly: true,
      weeklyKey: '2026-W34',
    })
    expect(getWeeklyTop('2026-W34', 'normal').map((row) => row.distance)).toEqual([900])
    expect(getWeeklyTop('2026-W33', 'normal')).toEqual([])
  })

  test('normalizes names and numeric scores at the storage boundary', () => {
    submitLocalScore({
      name: '  <img src=x>\u0000  ',
      distance: '42.9',
      stars: '-3.4',
      mode: 'unknown',
    })

    expect(getLocalTop()).toEqual([
      expect.objectContaining({
        name: '<img src=x>',
        distance: 42,
        stars: 0,
        mode: 'normal',
      }),
    ])
  })
})
