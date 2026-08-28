import { describe, expect, test } from 'vitest'
import { BANK_SINK } from '../src/game/banking.js'
import { TUCK_SINK } from '../src/game/tuck-flare.js'
import {
  ENERGY_EXCHANGE,
  CUSHION_MAX_SINK,
  GROUND_EFFECT_HEIGHT,
  GROUND_EFFECT_LIFT,
  cushionDescent,
  groundEffectLift,
  GROUND_HEIGHT,
  MAX_DIVE_SPEED,
  advanceDiveSpeed,
  diveSpeedMultiplier,
  evaluateAltitude,
  resolveSinkPerSecond,
  spendSpeedForHeight,
  updraftLift,
} from '../src/game/glide.js'

describe('glide', () => {
  test('holding the nose up is the most expensive thing you can do', () => {
    const level = resolveSinkPerSecond({ inputY: 0 })
    const climbing = resolveSinkPerSecond({ inputY: 1 })
    const descending = resolveSinkPerSecond({ inputY: -1 })
    expect(climbing).toBeGreaterThan(level)
    // A commanded descent costs nothing extra — falling is the default state.
    expect(descending).toBe(level)
  })

  test('bank sink adds on top of the base glide', () => {
    expect(resolveSinkPerSecond({ bankSink: 4 })).toBe(resolveSinkPerSecond({}) + 4)
  })

  test('descending buys speed and it is capped', () => {
    expect(advanceDiveSpeed(0, { deltaHeight: -4, dt: 1 / 60 })).toBeCloseTo(4 * ENERGY_EXCHANGE, 5)
    expect(advanceDiveSpeed(0, { deltaHeight: -1000, dt: 1 / 60 })).toBe(MAX_DIVE_SPEED)
  })

  // The point of one conserved pool: a dive followed by a climb must not print
  // free speed, or the altitude economy has a hole straight through it.
  test('a dive-then-climb round trip does not print speed', () => {
    let borrowed = advanceDiveSpeed(0, { deltaHeight: -5, dt: 1 / 60 })
    borrowed = advanceDiveSpeed(borrowed, { deltaHeight: 5, dt: 1 / 60 })
    expect(borrowed).toBeLessThanOrEqual(1e-9)
  })

  test('borrowed speed decays once the plane stops descending', () => {
    const borrowed = advanceDiveSpeed(0, { deltaHeight: -4, dt: 1 / 60 })
    const later = advanceDiveSpeed(borrowed, { deltaHeight: 0, dt: 0.5 })
    expect(later).toBeGreaterThan(0)
    expect(later).toBeLessThan(borrowed)
  })

  test('height is only ever bought with speed you actually have', () => {
    const broke = spendSpeedForHeight({ diveSpeed: 0, requestedHeight: 10 })
    expect(broke.height).toBe(0)
    expect(broke.speedSpent).toBe(0)
    const rich = spendSpeedForHeight({ diveSpeed: MAX_DIVE_SPEED, requestedHeight: 1 })
    expect(rich.height).toBe(1)
    expect(rich.speedSpent).toBeCloseTo(ENERGY_EXCHANGE, 5)
  })

  test('updraft lift tapers to nothing at the edge of the column', () => {
    expect(updraftLift({ distance: 0, radius: 3, strength: 9 })).toBeCloseTo(9, 5)
    expect(updraftLift({ distance: 3, radius: 3, strength: 9 })).toBeCloseTo(0, 5)
    expect(updraftLift({ distance: 99, radius: 3, strength: 9 })).toBe(0)
    // Symmetric: approaching from below is worth the same as from above.
    expect(updraftLift({ distance: -1.5, radius: 3, strength: 9 }))
      .toBeCloseTo(updraftLift({ distance: 1.5, radius: 3, strength: 9 }), 9)
  })

  test('the ground is the fail state and warns before it arrives', () => {
    expect(evaluateAltitude(GROUND_HEIGHT).grounded).toBe(true)
    expect(evaluateAltitude(GROUND_HEIGHT - 1).grounded).toBe(true)
    expect(evaluateAltitude(8).grounded).toBe(false)
    expect(evaluateAltitude(8).warning).toBe(false)
    expect(evaluateAltitude(GROUND_HEIGHT + 0.5).warning).toBe(true)
    expect(evaluateAltitude(GROUND_HEIGHT).urgency).toBeCloseTo(1, 5)
  })

  test('borrowed speed is worth a bounded multiplier', () => {
    expect(diveSpeedMultiplier(0)).toBe(1)
    expect(diveSpeedMultiplier(MAX_DIVE_SPEED)).toBeCloseTo(1.42, 5)
    expect(diveSpeedMultiplier(9999)).toBeCloseTo(1.42, 5)
  })
})

describe('ground effect', () => {
  test('is absent at altitude and firm at the floor', () => {
    expect(groundEffectLift(99)).toBe(0)
    expect(groundEffectLift(GROUND_EFFECT_HEIGHT)).toBe(0)
    expect(groundEffectLift(GROUND_HEIGHT)).toBeCloseTo(GROUND_EFFECT_LIFT, 5)
    // Squared falloff: the cushion is soft at the top of the band.
    expect(groundEffectLift((GROUND_EFFECT_HEIGHT + GROUND_HEIGHT) / 2))
      .toBeCloseTo(GROUND_EFFECT_LIFT * 0.25, 5)
  })

  test('it grows monotonically as the plane descends', () => {
    let previous = -1
    for (let y = GROUND_EFFECT_HEIGHT; y >= GROUND_HEIGHT; y -= 0.1) {
      const lift = groundEffectLift(y)
      expect(lift).toBeGreaterThanOrEqual(previous)
      previous = lift
    }
  })

  // This gap is the whole design: ordinary low flight can be held, but a
  // deliberate dive into the deck still ends the run.
  test('outlifts a hard banked glide but never a tuck', () => {
    const peak = groundEffectLift(GROUND_HEIGHT)
    const hardBankedGlide = resolveSinkPerSecond({ inputY: 0, bankSink: BANK_SINK })
    expect(peak).toBeGreaterThan(hardBankedGlide)
    expect(peak).toBeLessThan(hardBankedGlide + TUCK_SINK)
  })
})

describe('cushion descent clamp', () => {
  test('caps sink inside the band but leaves normal flight untouched', () => {
    expect(cushionDescent({ velY: -30, height: GROUND_HEIGHT + 0.2 })).toBe(-CUSHION_MAX_SINK)
    // Above the band, nothing is clamped.
    expect(cushionDescent({ velY: -30, height: 12 })).toBe(-30)
    // Climbing is never clamped.
    expect(cushionDescent({ velY: 20, height: GROUND_HEIGHT })).toBe(20)
    // Already slower than the cap: unchanged.
    expect(cushionDescent({ velY: -2, height: GROUND_HEIGHT })).toBe(-2)
  })

  // The escape hatch: without it the cushion would quietly delete the fail state.
  test('a tuck punches through the cushion', () => {
    expect(cushionDescent({ velY: -30, height: GROUND_HEIGHT, punchThrough: true })).toBe(-30)
  })

  // The bug this exists for: identical input must not be survivable at 60Hz and
  // fatal at the engine's dt cap.
  test('the floor is unreachable in one long frame but reachable by holding down', () => {
    const oneLongFrame = GROUND_EFFECT_HEIGHT + cushionDescent({ velY: -38, height: GROUND_EFFECT_HEIGHT }) * 0.05
    expect(oneLongFrame).toBeGreaterThan(GROUND_HEIGHT)

    let y = GROUND_EFFECT_HEIGHT
    for (let i = 0; i < 20; i += 1) y += cushionDescent({ velY: -38, height: y }) * 0.05
    expect(y).toBeLessThan(GROUND_HEIGHT)
  })
})
