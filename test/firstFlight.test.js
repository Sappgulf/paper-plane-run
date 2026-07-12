import { describe, expect, test } from 'vitest'
import {
  FIRST_FLIGHT_GRACE_SECONDS,
  isLaunchGraceActive,
  shouldGrantLaunchGrace,
} from '../src/game/firstFlight.js'

describe('first-flight launch grace', () => {
  test('protects a first classic run', () => {
    expect(shouldGrantLaunchGrace({ runKind: 'classic', tutorialDone: false, completedRuns: 0 })).toBe(true)
  })

  test('always protects tutorial runs', () => {
    expect(shouldGrantLaunchGrace({ runKind: 'tutorial', tutorialDone: true, completedRuns: 12 })).toBe(true)
  })

  test('does not protect returning classic players', () => {
    expect(shouldGrantLaunchGrace({ runKind: 'classic', tutorialDone: true, completedRuns: 1 })).toBe(false)
  })

  test('does not protect competitive or shared modes', () => {
    for (const runKind of ['daily', 'layout', 'coop', 'hotseat']) {
      expect(shouldGrantLaunchGrace({ runKind, tutorialDone: false, completedRuns: 0 })).toBe(false)
    }
  })

  test('ends at exactly four seconds', () => {
    expect(FIRST_FLIGHT_GRACE_SECONDS).toBe(4)
    expect(isLaunchGraceActive(3.999, FIRST_FLIGHT_GRACE_SECONDS)).toBe(true)
    expect(isLaunchGraceActive(4, FIRST_FLIGHT_GRACE_SECONDS)).toBe(false)
  })
})
