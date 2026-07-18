import { describe, expect, test } from 'vitest'
import {
  FEVER_SCORE_MUL,
  advanceFeverState,
  createFeverState,
  describeComboHudValue,
  describeFeverHudValue,
  shouldTriggerFever,
} from '../src/game/combo-fever.js'

describe('combo fever helpers', () => {
  test('teases the last three near-misses before Fever Focus triggers', () => {
    expect(describeComboHudValue({ combo: 4, feverThresholdBonus: 0 })).toBe('4x')
    expect(describeComboHudValue({ combo: 5, feverThresholdBonus: 0 })).toBe('5x · 🔥3')
    expect(describeComboHudValue({ combo: 6, feverThresholdBonus: 0 })).toBe('6x · 🔥2')
    expect(describeComboHudValue({ combo: 7, feverThresholdBonus: 3 })).toBe('7x')
    expect(shouldTriggerFever({ combo: 7, feverThresholdBonus: 3 })).toBe(true)
    expect(shouldTriggerFever({ combo: 7, feverThresholdBonus: 0 })).toBe(false)
  })

  test('creates a longer fever window at max Fever Focus and counts it down cleanly', () => {
    const maxed = createFeverState({ feverThresholdBonus: 3, feverDurationBonus: 2.25 })
    expect(maxed).toMatchObject({
      active: true,
      threshold: 5,
      duration: 6.25,
      scoreMul: FEVER_SCORE_MUL,
    })
    expect(describeFeverHudValue(maxed)).toBe('1.5x · 6.3s')
    const mid = advanceFeverState(maxed, 2)
    expect(mid.active).toBe(true)
    expect(mid.timer).toBeCloseTo(4.25)
    expect(advanceFeverState(mid, 5)).toMatchObject({ active: false, timer: 0 })
  })
})
