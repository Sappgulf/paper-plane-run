import { describe, expect, test } from 'vitest'

import { UPGRADES, getUpgradeEffects } from '../src/upgrades.js'
import {
  getControlResponse,
  getUpgradeRuntimeSnapshot,
  getWeaponState,
} from '../src/game/upgrade-runtime.js'

const NORMAL_FLIGHT = {
  controlMode: 'keyboard',
  dt: 1 / 60,
  distance: 240,
  difficulty: {
    sink: 2.4,
    speedBase: 28,
    speedRamp: 0.038,
    speedCap: 45,
    starChance: 0.58,
    powerChance: 0.18,
  },
}

function runtimeAt(levels = {}, flight = NORMAL_FLIGHT) {
  localStorage.setItem('paper-plane-run-upgrades', JSON.stringify(levels))
  return getUpgradeRuntimeSnapshot({ effects: getUpgradeEffects(), ...flight })
}

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const RUNTIME_ASSERTIONS = [
  { id: 'handling', value: (runtime) => runtime.handling.acceleration, direction: 'up' },
  { id: 'lift', value: (runtime) => runtime.lift.sinkPerSecond, direction: 'down' },
  { id: 'glide', value: (runtime) => runtime.glide.cruiseSpeed, direction: 'up' },
  { id: 'magnet', value: (runtime) => runtime.magnet.catchRadius, direction: 'up' },
  { id: 'shield', value: (runtime) => runtime.shield.duration, direction: 'up' },
  { id: 'luck', value: (runtime) => runtime.luck.starChance, direction: 'up' },
  { id: 'wingspan', value: (runtime) => runtime.wingspan.nearMissRadius, direction: 'up' },
  { id: 'trail', value: (runtime) => runtime.trail.opacity, direction: 'up' },
  { id: 'turbo', value: (runtime) => runtime.turbo.graceSeconds, direction: 'up' },
  { id: 'guardian', value: (runtime) => runtime.guardian.charges, direction: 'up' },
  { id: 'weapon', value: (runtime) => Number(runtime.weapon.ready), direction: 'up' },
]

describe('upgrade runtime contracts', () => {
  test('has one deterministic baseline-versus-max runtime assertion for every upgrade', () => {
    expect(RUNTIME_ASSERTIONS.map(({ id }) => id)).toEqual(UPGRADES.map(({ id }) => id))

    const baseline = runtimeAt()
    for (const assertion of RUNTIME_ASSERTIONS) {
      const upgrade = UPGRADES.find(({ id }) => id === assertion.id)
      const maxed = runtimeAt({ [assertion.id]: upgrade.max })
      const baseValue = assertion.value(baseline)
      const maxValue = assertion.value(maxed)

      if (assertion.direction === 'up') expect(maxValue).toBeGreaterThan(baseValue)
      else expect(maxValue).toBeLessThan(baseValue)
    }
  })

  test('applies Fold Handling to keyboard, stick, pointer/touch, tilt, and custom control response paths', () => {
    const baseline = runtimeAt()
    const maxed = runtimeAt({ handling: 5 })
    const modes = ['keyboard', 'stick', 'pointer', 'touch', 'tilt', 'custom']

    for (const mode of modes) {
      const base = getControlResponse({
        mode,
        dt: NORMAL_FLIGHT.dt,
        accelMul: baseline.effects.accelMul,
        sensitivity: 1,
      })
      const improved = getControlResponse({
        mode,
        dt: NORMAL_FLIGHT.dt,
        accelMul: maxed.effects.accelMul,
        sensitivity: 1,
      })

      if (base.absolute) expect(improved.follow).toBeGreaterThan(base.follow)
      else expect(improved.acceleration).toBeGreaterThan(base.acceleration)
    }
  })

  test('keeps Wide Wings collision fairness while expanding only the visual and near-miss envelope', () => {
    const baseline = runtimeAt()
    const maxed = runtimeAt({ wingspan: 3 })

    expect(maxed.wingspan.visualScale).toBeGreaterThan(baseline.wingspan.visualScale)
    expect(maxed.wingspan.nearMissRadius).toBeGreaterThan(baseline.wingspan.nearMissRadius)
    expect(maxed.wingspan.collisionPlaneRadius).toBe(0.7)
    expect(maxed.wingspan.collisionPlaneRadius).toBe(baseline.wingspan.collisionPlaneRadius)
  })

  test('uses seeded luck samples to make star and power spawn rates observably more favorable', () => {
    const baseline = runtimeAt()
    const maxed = runtimeAt({ luck: 4 })
    const random = mulberry32(0xC0FFEE)
    const samples = Array.from({ length: 80 }, () => random())

    const countBelow = (limit) => samples.filter((sample) => sample < limit).length
    expect(countBelow(maxed.luck.starChance)).toBeGreaterThan(countBelow(baseline.luck.starChance))
    expect(countBelow(maxed.luck.powerChance)).toBeGreaterThan(countBelow(baseline.luck.powerChance))
  })

  test('reports ink readiness and deterministic cooldown recovery without exposing a weapon before purchase', () => {
    expect(getWeaponState({ weaponLevel: 0, cooldownSeconds: 1.1, cooldownLeft: 0 })).toMatchObject({
      unlocked: false,
      ready: false,
      cooldownRemaining: 0,
    })
    expect(getWeaponState({ weaponLevel: 4, cooldownSeconds: 0.38, cooldownLeft: 0 })).toMatchObject({
      unlocked: true,
      ready: true,
      cooldownRemaining: 0,
    })
    expect(getWeaponState({ weaponLevel: 4, cooldownSeconds: 0.38, cooldownLeft: 0.19 })).toMatchObject({
      unlocked: true,
      ready: false,
      cooldownRemaining: 0.19,
      cooldownProgress: 0.5,
    })
  })
})
