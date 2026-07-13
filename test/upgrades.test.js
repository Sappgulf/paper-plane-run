import { beforeEach, describe, expect, test } from 'vitest'
import {
  addWallet,
  buyUpgrade,
  getUpgradeLevel,
  getWallet,
  UPGRADES,
  canPrestige,
  describeUpgradeEffect,
  doPrestige,
  getPrestigeLevel,
  getUpgradeEffects,
  spendWallet,
} from '../src/upgrades.js'

const UPGRADE_CONTRACTS = [
  {
    id: 'handling',
    labels: ['Control response +0%', 'Control response +8%', 'Control response +16%', 'Control response +24%', 'Control response +32%', 'Control response +40%'],
    values: [0, 8, 16, 24, 32, 40],
    valueKey: 'responsePercent',
    direction: 'up',
  },
  {
    id: 'lift',
    labels: ['Sink rate -0%', 'Sink rate -8%', 'Sink rate -16%', 'Sink rate -24%', 'Sink rate -32%', 'Sink rate -40%'],
    values: [0, 8, 16, 24, 32, 40],
    valueKey: 'sinkReductionPercent',
    direction: 'up',
  },
  {
    id: 'glide',
    labels: ['Cruise speed +0% · score +0%', 'Cruise speed +4% · score +3%', 'Cruise speed +8% · score +6%', 'Cruise speed +12% · score +9%', 'Cruise speed +16% · score +12%', 'Cruise speed +20% · score +15%'],
    values: [0, 4, 8, 12, 16, 20],
    valueKey: 'speedPercent',
    direction: 'up',
  },
  {
    id: 'magnet',
    labels: ['Star pull +0%', 'Star pull +55%', 'Star pull +110%', 'Star pull +165%', 'Star pull +220%'],
    values: [0, 55, 110, 165, 220],
    valueKey: 'pullPercent',
    direction: 'up',
  },
  {
    id: 'shield',
    labels: ['Shield duration +0%', 'Shield duration +20%', 'Shield duration +40%', 'Shield duration +60%', 'Shield duration +80%'],
    values: [0, 20, 40, 60, 80],
    valueKey: 'durationPercent',
    direction: 'up',
  },
  {
    id: 'luck',
    labels: ['Star spawns +0% · power-ups +0%', 'Star spawns +12% · power-ups +10%', 'Star spawns +24% · power-ups +20%', 'Star spawns +36% · power-ups +30%', 'Star spawns +48% · power-ups +40%'],
    values: [0, 12, 24, 36, 48],
    valueKey: 'starSpawnPercent',
    direction: 'up',
  },
  {
    id: 'wingspan',
    labels: ['Plane scale 1.20× · near-miss window 1.40×', 'Plane scale 1.28× · near-miss window 1.55×', 'Plane scale 1.36× · near-miss window 1.70×', 'Plane scale 1.44× · near-miss window 1.85×'],
    values: [1.2, 1.28, 1.36, 1.44],
    valueKey: 'planeScale',
    direction: 'up',
  },
  {
    id: 'trail',
    labels: ['Score aura +0%', 'Score aura +2%', 'Score aura +4%', 'Score aura +6%'],
    values: [0, 2, 4, 6],
    valueKey: 'scoreAuraPercent',
    direction: 'up',
  },
  {
    id: 'turbo',
    labels: ['Boost grace +0.00s · hitbox 0.78×', 'Boost grace +0.15s · hitbox 0.72×', 'Boost grace +0.30s · hitbox 0.66×', 'Boost grace +0.45s · hitbox 0.60×'],
    values: [0.78, 0.72, 0.66, 0.6],
    valueKey: 'boostHitboxScale',
    direction: 'down',
  },
  {
    id: 'guardian',
    labels: ['Crash saves 0 per run', 'Crash saves 1 per run', 'Crash saves 2 per run'],
    values: [0, 1, 2],
    valueKey: 'charges',
    direction: 'up',
  },
  {
    id: 'weapon',
    labels: ['Ink Blast locked', 'Ink cooldown 0.92s', 'Ink cooldown 0.74s', 'Ink cooldown 0.56s', 'Ink cooldown 0.38s'],
    values: [1.1, 0.92, 0.74, 0.56, 0.38],
    valueKey: 'cooldownSeconds',
    direction: 'down',
  },
]

describe('upgrade purchases', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('deducts the exact price and persists the rank', () => {
    addWallet(20)

    expect(buyUpgrade('handling')).toEqual({ ok: true, level: 1, cost: 12 })
    expect(getWallet()).toBe(8)
    expect(getUpgradeLevel('handling')).toBe(1)
  })

  test('rejects a purchase when the wallet is short', () => {
    addWallet(11)

    expect(buyUpgrade('handling')).toEqual({ ok: false, reason: 'poor', need: 1 })
    expect(getUpgradeLevel('handling')).toBe(0)
  })

  test('stops purchases at the rank cap', () => {
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ guardian: 2 }))
    addWallet(200)

    expect(buyUpgrade('guardian')).toEqual({ ok: false, reason: 'max' })
    expect(getWallet()).toBe(200)
  })

  test('spends only wallet stars and leaves lifetime availability stars untouched', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '200')
    addWallet(20)

    expect(spendWallet(12)).toBe(true)
    expect(getWallet()).toBe(8)
    expect(localStorage.getItem('paper-plane-run-lifetime-stars')).toBe('200')
  })
})

describe('prestige', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('is unavailable until every upgrade is maxed', () => {
    expect(canPrestige()).toBe(false)
    expect(doPrestige()).toEqual({ ok: false, reason: 'not-maxed' })
  })

  test('resets every level and grants a permanent score/luck bonus', () => {
    const maxed = {}
    for (const u of UPGRADES) maxed[u.id] = u.max
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify(maxed))

    expect(canPrestige()).toBe(true)
    expect(doPrestige()).toEqual({ ok: true, level: 1 })
    expect(getPrestigeLevel()).toBe(1)
    expect(getUpgradeLevel('handling')).toBe(0)
    expect(canPrestige()).toBe(false)

    const fx = getUpgradeEffects()
    expect(fx.scoreMul).toBeCloseTo(1.03)
    expect(fx.starChanceMul).toBeCloseTo(1.03)
  })
})

describe('ink blast weapon', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('is inert until purchased, then fires faster per level', () => {
    expect(getUpgradeEffects().weaponLevel).toBe(0)

    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ weapon: 1 }))
    const lvl1 = getUpgradeEffects()
    expect(lvl1.weaponLevel).toBe(1)
    expect(lvl1.weaponCooldown).toBeCloseTo(0.92)

    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ weapon: 4 }))
    expect(getUpgradeEffects().weaponCooldown).toBeCloseTo(0.38)
  })
})

describe('wide wings + paper trail synergy', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('flags synergyGold only when both trees are maxed', () => {
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ wingspan: 2, trail: 3 }))
    expect(getUpgradeEffects().synergyGold).toBe(false)

    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ wingspan: 3, trail: 3 }))
    expect(getUpgradeEffects().synergyGold).toBe(true)
  })
})

describe('exact upgrade contracts', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('describes every existing upgrade from zero through its exact cap', () => {
    expect(UPGRADE_CONTRACTS.map((contract) => contract.id)).toEqual(UPGRADES.map((upgrade) => upgrade.id))

    for (const contract of UPGRADE_CONTRACTS) {
      const upgrade = UPGRADES.find((entry) => entry.id === contract.id)
      expect(upgrade.max).toBe(contract.labels.length - 1)

      for (let level = 0; level <= upgrade.max; level += 1) {
        const descriptor = describeUpgradeEffect(contract.id, level)
        const nextLevel = level + 1

        expect(descriptor).toMatchObject({
          id: contract.id,
          level,
          max: upgrade.max,
          maxed: level === upgrade.max,
          current: {
            label: contract.labels[level],
            values: { [contract.valueKey]: contract.values[level] },
          },
        })
        expect(descriptor.next).toEqual(level === upgrade.max ? null : expect.objectContaining({
          label: contract.labels[nextLevel],
          values: expect.objectContaining({ [contract.valueKey]: contract.values[nextLevel] }),
        }))

        if (level > 0) {
          const prior = describeUpgradeEffect(contract.id, level - 1).current.values[contract.valueKey]
          const current = descriptor.current.values[contract.valueKey]
          expect(contract.direction === 'up' ? current : prior).toBeGreaterThan(contract.direction === 'up' ? prior : current)
        }
      }
    }
  })

  test('keeps descriptors and runtime values on the same persisted level', () => {
    for (const contract of UPGRADE_CONTRACTS) {
      const upgrade = UPGRADES.find((entry) => entry.id === contract.id)
      localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ [contract.id]: upgrade.max }))

      expect(getUpgradeLevel(contract.id)).toBe(upgrade.max)
      const descriptor = describeUpgradeEffect(contract.id, upgrade.max)
      const values = descriptor.current.values
      const effects = getUpgradeEffects()
      expect(values[contract.valueKey]).toBe(contract.values.at(-1))

      if (contract.id === 'handling') expect(effects.accelMul).toBeCloseTo(1 + values.responsePercent / 100)
      if (contract.id === 'lift') expect(effects.sinkMul).toBeCloseTo(1 - values.sinkReductionPercent / 100)
      if (contract.id === 'glide') {
        expect(effects.speedMul).toBeCloseTo(1 + values.speedPercent / 100)
        expect(effects.scoreMul).toBeCloseTo(1 + values.scorePercent / 100)
      }
      if (contract.id === 'magnet') expect(effects.magnetBonus).toBeCloseTo(values.pullPercent / 100)
      if (contract.id === 'shield') expect(effects.shieldDurationMul).toBeCloseTo(1 + values.durationPercent / 100)
      if (contract.id === 'luck') {
        expect(effects.starChanceMul).toBeCloseTo(1 + values.starSpawnPercent / 100)
        expect(effects.powerChanceMul).toBeCloseTo(1 + values.powerSpawnPercent / 100)
      }
      if (contract.id === 'wingspan') {
        expect(effects.planeScale).toBeCloseTo(values.planeScale)
        expect(effects.nearMissBonus).toBeCloseTo(values.nearMissWindow - 1.4)
      }
      if (contract.id === 'trail') expect(effects.scoreMul).toBeCloseTo(1 + values.scoreAuraPercent / 100)
      if (contract.id === 'turbo') expect(effects.boostSafety).toBe(upgrade.max)
      if (contract.id === 'guardian') expect(effects.guardianCharges).toBe(values.charges)
      if (contract.id === 'weapon') expect(effects.weaponCooldown).toBeCloseTo(values.cooldownSeconds)
    }
  })

  test('normalizes malformed persisted levels to known upgrade caps', () => {
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ handling: '2.9', guardian: 99, weapon: -4 }))
    expect(getUpgradeLevel('handling')).toBe(2)
    expect(getUpgradeLevel('guardian')).toBe(2)
    expect(getUpgradeLevel('weapon')).toBe(0)

    localStorage.setItem('paper-plane-run-upgrades', 'null')
    expect(getUpgradeLevel('handling')).toBe(0)

    localStorage.setItem('paper-plane-run-upgrades', '{')
    expect(getUpgradeLevel('handling')).toBe(0)
  })

  test('returns no descriptor for a missing upgrade id', () => {
    expect(describeUpgradeEffect('missing', 0)).toBeNull()
  })
})
