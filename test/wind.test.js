import { describe, expect, test } from 'vitest'
import {
  easeWindTowardWall,
  gustWarningSeconds,
  WIND_WALL_EASE_FROM,
  WIND_WALL_EASE_MAX,
  windPushSide,
} from '../src/game/wind.js'

describe('gust easing near the corridor walls', () => {
  test('leaves a push alone while the plane has room to dodge', () => {
    expect(easeWindTowardWall(12, 0)).toBe(12)
    expect(easeWindTowardWall(-12, 4)).toBe(-12)
    expect(easeWindTowardWall(12, WIND_WALL_EASE_FROM)).toBe(12)
  })

  test('removes the outward share of a push at the wall', () => {
    const eased = easeWindTowardWall(20, 13)
    expect(eased).toBeCloseTo(20 * (1 - WIND_WALL_EASE_MAX))
    expect(easeWindTowardWall(-20, -13)).toBeCloseTo(-20 * (1 - WIND_WALL_EASE_MAX))
  })

  test('never changes an inward push, however close to the wall', () => {
    expect(easeWindTowardWall(-20, 13)).toBe(-20)
    expect(easeWindTowardWall(20, -13)).toBe(20)
  })

  test('fades in smoothly and passes zero through unchanged', () => {
    const near = easeWindTowardWall(20, WIND_WALL_EASE_FROM + 1.5)
    const wall = easeWindTowardWall(20, WIND_WALL_EASE_FROM + 3)
    expect(near).toBeGreaterThan(wall)
    expect(near).toBeLessThan(20)
    expect(easeWindTowardWall(0, 13)).toBe(0)
    expect(easeWindTowardWall(Number.NaN, 13)).toBeNaN()
  })
})

describe('gust side for the banner', () => {
  test('names the side a push goes toward', () => {
    expect(windPushSide(18)).toBe('right')
    expect(windPushSide(-18)).toBe('left')
  })
})

describe('gust telegraph length', () => {
  test('keeps the base warning until Gust Reader adds to it', () => {
    expect(gustWarningSeconds(1.2, {})).toBe(1.2)
    expect(gustWarningSeconds(1.2, { windWarningBonus: 0.9 })).toBeCloseTo(2.1)
  })

  test('ignores a missing, negative or malformed bonus', () => {
    expect(gustWarningSeconds(1.2)).toBe(1.2)
    expect(gustWarningSeconds(1.2, { windWarningBonus: -0.5 })).toBe(1.2)
    expect(gustWarningSeconds(1.2, { windWarningBonus: Number.NaN })).toBe(1.2)
  })
})
