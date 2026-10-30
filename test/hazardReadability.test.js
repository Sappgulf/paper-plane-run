import { describe, expect, test } from 'vitest'
import { hazardWarningScale } from '../src/game/hazard-readability.js'

describe('lethal warning ring', () => {
  const birds = 0.7 + 0.7 * 0.52
  const scissors = 1.6 + 0.7 * 0.52

  test('is never smaller than the real hit radius at close range', () => {
    expect(hazardWarningScale({ z: 0, hitRadius: birds })).toBeGreaterThanOrEqual(birds)
    expect(hazardWarningScale({ z: 20, hitRadius: scissors })).toBeGreaterThanOrEqual(scissors)
  })

  test('grows beyond the hit radius with distance for haze readability', () => {
    expect(hazardWarningScale({ z: 120, hitRadius: birds })).toBeGreaterThan(birds * 1.5)
  })

  test('pulses larger while a diver is descending', () => {
    const still = hazardWarningScale({ z: 10, hitRadius: birds, clock: 0 })
    const diving = hazardWarningScale({ z: 10, hitRadius: birds, diving: true, clock: 0 })
    expect(diving).toBeGreaterThan(still)
  })

  test('junk input falls back to a finite ring', () => {
    const scale = hazardWarningScale({ z: NaN, hitRadius: NaN, clock: NaN })
    expect(Number.isFinite(scale)).toBe(true)
    expect(scale).toBeGreaterThan(0)
  })
})

test('warnings prioritize nearby threats in the flight corridor', async () => {
  const { shouldShowHazardWarning } = await import('../src/game/hazard-readability.js')
  expect(shouldShowHazardWarning({ z: 25, dx: 0.8, dy: 0.5, hitRadius: 1.2 })).toBe(true)
  expect(shouldShowHazardWarning({ z: 25, dx: 11, dy: 0, hitRadius: 1.2 })).toBe(false)
  expect(shouldShowHazardWarning({ z: 25, dx: 0, dy: 9, hitRadius: 1.2 })).toBe(false)
  expect(shouldShowHazardWarning({ z: -1, dx: 0, dy: 0, hitRadius: 1.2 })).toBe(false)
  expect(shouldShowHazardWarning({ z: 80, dx: 0, dy: 0, hitRadius: 1.2, fogDepth: 50 })).toBe(false)
})
