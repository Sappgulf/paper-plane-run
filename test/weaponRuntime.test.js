import { describe, expect, test } from 'vitest'
import {
  advanceShot,
  inkPopReward,
  resolveWeaponFire,
  shotHitsTarget,
} from '../src/game/weapon-runtime.js'

describe('weapon runtime', () => {
  test('fires only when unlocked and cooled down', () => {
    const locked = resolveWeaponFire({ weaponLevel: 0, cooldownSeconds: 1, cooldownLeft: 0 })
    expect(locked.fired).toBe(false)
    const ready = resolveWeaponFire({ weaponLevel: 2, cooldownSeconds: 0.8, cooldownLeft: 0 })
    expect(ready.fired).toBe(true)
    expect(ready.cooldownLeft).toBe(0.8)
    expect(ready.shot.speed).toBe(46)
  })

  test('advances shots and detects hits', () => {
    const moved = advanceShot({ z: 4, ttl: 1.4, dt: 0.1, speed: 46 })
    expect(moved.z).toBeCloseTo(8.6)
    expect(moved.expired).toBe(false)
    expect(shotHitsTarget({
      shotX: 0, shotY: 10, shotZ: 20, shotRadius: 0.5,
      targetX: 0.2, targetY: 10.1, targetZ: 20.2, targetRadius: 0.7,
    })).toBe(true)
    expect(inkPopReward()).toBe(2)
  })
})
