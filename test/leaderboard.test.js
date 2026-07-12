import { beforeEach, describe, expect, test } from 'vitest'
import { submitTimeAttackScore, getTimeAttackTop } from '../src/leaderboard.js'

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
})
