import { describe, expect, test } from 'vitest'
import {
  advanceHomingShot,
  getWeaponState,
  getWeaponTuning,
  resolveWeaponHit,
  selectWeaponTargets,
  shotHitsTarget,
  shotHitsTargetSwept,
  WEAPON_POP_STARS,
} from '../src/game/weapon-runtime.js'

describe('weapon tuning', () => {
  test('stays locked until the first Ink Blast rank', () => {
    const locked = getWeaponTuning()
    expect(locked.unlocked).toBe(false)
    expect(getWeaponState({ tuning: locked }).ready).toBe(false)
  })

  test('ranks improve cooldown, range, and damage without becoming a panic button', () => {
    const l1 = getWeaponTuning({ level: 1 })
    const l4 = getWeaponTuning({ level: 4 })
    expect(l1.unlocked).toBe(true)
    expect(l4.cooldownSeconds).toBeLessThan(l1.cooldownSeconds)
    expect(l4.range).toBeGreaterThan(l1.range)
    expect(l4.minRange).toBeGreaterThan(0)
    expect(l4.damage).toBeGreaterThan(1)
  })

  test('salvo adds darts and pierce adds pierce count', () => {
    expect(getWeaponTuning({ level: 1 }).darts).toBe(1)
    expect(getWeaponTuning({ level: 1, salvo: 2 }).darts).toBe(3)
    expect(getWeaponTuning({ level: 1, pierce: 2 }).pierceCount).toBe(2)
  })

  test('cooldown state reports ready and progress', () => {
    const tuning = getWeaponTuning({ level: 2 })
    expect(getWeaponState({ tuning, cooldownLeft: 0 }).ready).toBe(true)
    expect(getWeaponState({ tuning, cooldownLeft: tuning.cooldownSeconds / 2 }).cooldownProgress)
      .toBeCloseTo(0.5, 6)
  })
})

describe('weapon targeting', () => {
  const targets = [
    { type: 'bird', x: 0, y: 8, z: 22, id: 'near' },
    { type: 'scissors', x: 1, y: 9, z: 45, id: 'far' },
    { type: 'bird', x: 20, y: 8, z: 15, id: 'wide' },
    { type: 'star', x: 0, y: 8, z: 12, id: 'pickup' },
    { type: 'bird', x: 0, y: 8, z: 5, id: 'too-close' },
  ]

  test('selects nearest threats inside the forward cone only', () => {
    const picked = selectWeaponTargets({
      targets, x: 0, y: 8, range: 50, maxLateral: 6, maxVertical: 4, limit: 2,
    })
    expect(picked.map((target) => target.id)).toEqual(['near', 'far'])
  })

  test('never targets pickups, hazards outside the cone, or point blank', () => {
    expect(selectWeaponTargets({
      targets: [
        { type: 'star', x: 0, y: 8, z: 12 },
        { type: 'bird', x: 0, y: 8, z: 5 },
        { type: 'bird', x: 20, y: 8, z: 15 },
      ],
      x: 0,
      y: 8,
      range: 50,
      maxLateral: 6,
      maxVertical: 4,
    })).toEqual([])
  })

  test('caps the volley at the requested limit', () => {
    expect(selectWeaponTargets({
      targets, x: 0, y: 8, range: 60, maxLateral: 25, maxVertical: 5, limit: 1,
    })).toHaveLength(1)
  })
})

describe('weapon darts', () => {
  test('darts home laterally and advance forward', () => {
    const next = advanceHomingShot({ x: 0, y: 8, z: 10, dt: 0.1, speed: 55, targetX: 2, targetY: 9, homing: 0.2 })
    expect(next.z).toBeCloseTo(15.5, 6)
    expect(next.x).toBeGreaterThan(0)
    expect(next.y).toBeGreaterThan(8)
  })

  test('a straight dart still advances when it has no target', () => {
    const next = advanceHomingShot({ x: 1, y: 2, z: 3, dt: 0.2, speed: 50 })
    expect(next).toEqual({ x: 1, y: 2, z: 13 })
  })

  test('hit testing uses shot plus target radius', () => {
    expect(shotHitsTarget({ shotX: 0, shotY: 8, shotZ: 20, targetX: 1, targetY: 8, targetZ: 20, targetRadius: 0.7 })).toBe(true)
    expect(shotHitsTarget({ shotX: 0, shotY: 8, shotZ: 20, targetX: 3, targetY: 8, targetZ: 20, targetRadius: 0.7 })).toBe(false)
  })

  test('a fast dart cannot tunnel through a target between frames', () => {
    // The dart jumps from z=10 to z=20 past a target at z=15.
    expect(shotHitsTargetSwept({
      fromX: 0, fromY: 8, fromZ: 10, toX: 0, toY: 8, toZ: 20,
      targetX: 0, targetY: 8, targetZ: 15, targetRadius: 0.7,
    })).toBe(true)
  })

  test('a swept miss stays a miss', () => {
    expect(shotHitsTargetSwept({
      fromX: 0, fromY: 8, fromZ: 10, toX: 0, toY: 8, toZ: 20,
      targetX: 8, targetY: 8, targetZ: 15, targetRadius: 0.7,
    })).toBe(false)
  })

  test('pops are worth a small, non-farmable number of stars', () => {
    expect(WEAPON_POP_STARS).toBe(1)
  })

  test('armored flyers survive one hit and pop to the second', () => {
    const first = resolveWeaponHit({ hp: 2, damage: 1 })
    expect(first).toEqual({ hp: 1, killed: false, damage: 1 })
    const second = resolveWeaponHit({ hp: first.hp, damage: 1 })
    expect(second).toEqual({ hp: 0, killed: true, damage: 1 })
  })

  test('weapon damage cannot underflow armor and stronger darts finish it', () => {
    expect(resolveWeaponHit({ hp: 2, damage: 2 })).toMatchObject({ hp: 0, killed: true })
    expect(resolveWeaponHit({ hp: 2, damage: 9 }).hp).toBe(0)
  })
})
