import { describe, expect, test } from 'vitest'
import {
  BOOST_RAMP_IN_SECONDS,
  BOOST_RAMP_OUT_SECONDS,
  getBoostSurge,
  pickPowerSpawnKind,
  POWER_REFRESH_METERS,
  POWER_REPLACE_METERS,
  POWER_SPAWN_WEIGHTS,
  resolvePowerPickup,
} from '../src/game/power-pickup.js'

describe('power orb pickup resolution', () => {
  test('a fresh pickup with nothing active is free', () => {
    expect(resolvePowerPickup({ nextKind: 'shield' })).toEqual({
      mode: 'new',
      refundMeters: 0,
    })
    expect(resolvePowerPickup({})).toEqual({ mode: 'new', refundMeters: 0 })
  })

  test('same-kind pickup refreshes instead of wiping the timer', () => {
    const result = resolvePowerPickup({ currentKind: 'magnet', nextKind: 'magnet' })
    expect(result.mode).toBe('refresh')
    expect(result.refundMeters).toBe(POWER_REFRESH_METERS)
  })

  test('switching kinds still replaces but compensates lost time', () => {
    const result = resolvePowerPickup({ currentKind: 'magnet', nextKind: 'shield' })
    expect(result.mode).toBe('replace')
    expect(result.refundMeters).toBe(POWER_REPLACE_METERS)
    expect(POWER_REPLACE_METERS).toBeLessThan(POWER_REFRESH_METERS)
  })
})

describe('power orb spawn odds', () => {
  const kinds = ['shield', 'magnet', 'boost']

  test('boost is about one orb in eleven', () => {
    const samples = 12000
    let boost = 0
    for (let i = 0; i < samples; i += 1) {
      if (pickPowerSpawnKind((i + 0.5) / samples, kinds) === 'boost') boost += 1
    }
    expect(boost / samples).toBeCloseTo(1 / 11, 3)
  })

  test('every orb is reachable across the roll range', () => {
    expect(pickPowerSpawnKind(0, kinds)).toBe('shield')
    expect(pickPowerSpawnKind(0.5, kinds)).toBe('magnet')
    expect(pickPowerSpawnKind(0.999, kinds)).toBe('boost')
  })

  test('an unweighted kind still spawns and an empty pool spawns nothing', () => {
    expect(pickPowerSpawnKind(0.99, ['shield', 'phase'], { shield: 1 })).toBe('phase')
    expect(pickPowerSpawnKind(0.3, [])).toBeNull()
  })

  test('the shipped table keeps boost the clear minority', () => {
    expect(POWER_SPAWN_WEIGHTS.boost).toBeLessThan(POWER_SPAWN_WEIGHTS.shield)
    expect(POWER_SPAWN_WEIGHTS.shield).toBe(POWER_SPAWN_WEIGHTS.magnet)
  })
})

describe('boost surge envelope', () => {
  test('builds from nothing, holds at full strength, and drains to nothing', () => {
    expect(getBoostSurge({ age: 0, timeLeft: 5 })).toBe(0)
    expect(getBoostSurge({ age: BOOST_RAMP_IN_SECONDS, timeLeft: 4.2 })).toBe(1)
    expect(getBoostSurge({ age: 2.5, timeLeft: 2.5 })).toBe(1)
    expect(getBoostSurge({ age: 4.9, timeLeft: 0 })).toBe(0)
  })

  test('eases in and out monotonically within 0..1', () => {
    let previous = -1
    for (let age = 0; age <= BOOST_RAMP_IN_SECONDS; age += 0.01) {
      const value = getBoostSurge({ age, timeLeft: 5 })
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeLessThanOrEqual(1)
      previous = value
    }
    previous = -1
    for (let timeLeft = 0; timeLeft <= BOOST_RAMP_OUT_SECONDS; timeLeft += 0.01) {
      const value = getBoostSurge({ age: 4, timeLeft })
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeLessThanOrEqual(1)
      previous = value
    }
  })

  test('a same-kind refresh keeps the surge up instead of rebuilding it', () => {
    // A refresh resets timeLeft to full but keeps age, so the surge stays at full.
    expect(getBoostSurge({ age: 3, timeLeft: 5 })).toBe(1)
  })

  test('stray inputs stay inside the envelope', () => {
    expect(getBoostSurge({})).toBe(0)
    expect(getBoostSurge({ age: Number.NaN, timeLeft: -3 })).toBe(0)
    expect(getBoostSurge({ age: 99, timeLeft: 99 })).toBe(1)
  })
})
