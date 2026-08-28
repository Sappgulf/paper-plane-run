import { describe, expect, test } from 'vitest'
import {
  POWER_REFRESH_METERS,
  POWER_REPLACE_METERS,
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
