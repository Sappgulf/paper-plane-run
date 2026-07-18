import { describe, expect, test } from 'vitest'
import { consumeGuardianCharge, shouldGuardianSave } from '../src/game/guardian-runtime.js'

describe('guardian runtime', () => {
  test('only saves on real crashes with remaining charges', () => {
    expect(shouldGuardianSave({ remaining: 1, isCleanEnd: false })).toBe(true)
    expect(shouldGuardianSave({ remaining: 0, isCleanEnd: false })).toBe(false)
    expect(shouldGuardianSave({ remaining: 2, isCleanEnd: true })).toBe(false)
  })

  test('consume decrements and returns banner feedback', () => {
    const next = consumeGuardianCharge({ charges: 2, remaining: 2 })
    expect(next.remaining).toBe(1)
    expect(next.visible).toBe(true)
    expect(next.banner).toMatch(/Guardian/)
    expect(next.invulnSeconds).toBeGreaterThan(1)
  })
})
