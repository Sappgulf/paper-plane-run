import { beforeEach, describe, expect, test } from 'vitest'
import {
  getLocalTop,
  getTimeAttackTop,
  submitLocalScore,
  submitTimeAttackScore,
} from '../src/leaderboard.js'

describe('Time Attack leaderboard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('sorts by stars, not distance', () => {
    submitTimeAttackScore({ name: 'A', stars: 10, distance: 500, mode: 'normal' })
    submitTimeAttackScore({ name: 'B', stars: 25, distance: 100, mode: 'normal' })
    submitTimeAttackScore({ name: 'C', stars: 15, distance: 300, mode: 'normal' })

    const top = getTimeAttackTop()
    expect(top.map((r) => r.name)).toEqual(['B', 'C', 'A'])
  })

  test('breaks a stars tie by distance', () => {
    submitTimeAttackScore({ name: 'A', stars: 10, distance: 100, mode: 'normal' })
    submitTimeAttackScore({ name: 'B', stars: 10, distance: 400, mode: 'normal' })

    const top = getTimeAttackTop()
    expect(top.map((r) => r.name)).toEqual(['B', 'A'])
  })

  test('keeps its own list separate from the distance board', () => {
    submitTimeAttackScore({ name: 'A', stars: 5, distance: 50, mode: 'normal' })
    expect(getTimeAttackTop().length).toBe(1)
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
