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
  getPrestigeBonusPercent,
  getPrestigeLevel,
  getUpgradeEffects,
  spendWallet,
} from '../src/upgrades.js'

const UPGRADE_CONTRACTS = [
  {
    id: 'handling',
    labels: ['Control response +0%', 'Control response +8%', 'Control response +16%', 'Control response +24%', 'Control response +32%', 'Control response +40%'],
    values: [0, 8, 16, 24, 32, 40].map((responsePercent) => ({ responsePercent })),
    directions: { responsePercent: 'up' },
  },
  {
    id: 'lift',
    labels: ['Sink rate -0%', 'Sink rate -8%', 'Sink rate -16%', 'Sink rate -24%', 'Sink rate -32%', 'Sink rate -40%'],
    values: [0, 8, 16, 24, 32, 40].map((sinkReductionPercent) => ({ sinkReductionPercent })),
    directions: { sinkReductionPercent: 'up' },
  },
  {
    id: 'glide',
    labels: ['Cruise speed +0% · score +0%', 'Cruise speed +4% · score +3%', 'Cruise speed +8% · score +6%', 'Cruise speed +12% · score +9%', 'Cruise speed +16% · score +12%', 'Cruise speed +20% · score +15%'],
    values: [
      { speedPercent: 0, scorePercent: 0 },
      { speedPercent: 4, scorePercent: 3 },
      { speedPercent: 8, scorePercent: 6 },
      { speedPercent: 12, scorePercent: 9 },
      { speedPercent: 16, scorePercent: 12 },
      { speedPercent: 20, scorePercent: 15 },
    ],
    directions: { speedPercent: 'up', scorePercent: 'up' },
  },
  {
    id: 'magnet',
    labels: ['Star pull +0%', 'Star pull +55%', 'Star pull +110%', 'Star pull +165%', 'Star pull +220%'],
    values: [0, 55, 110, 165, 220].map((pullPercent) => ({ pullPercent })),
    directions: { pullPercent: 'up' },
  },
  {
    id: 'shield',
    labels: ['Shield duration +0%', 'Shield duration +20%', 'Shield duration +40%', 'Shield duration +60%', 'Shield duration +80%'],
    values: [0, 20, 40, 60, 80].map((durationPercent) => ({ durationPercent })),
    directions: { durationPercent: 'up' },
  },
  {
    id: 'luck',
    labels: ['Star spawns +0% · power-ups +0%', 'Star spawns +12% · power-ups +10%', 'Star spawns +24% · power-ups +20%', 'Star spawns +36% · power-ups +30%', 'Star spawns +48% · power-ups +40%'],
    values: [
      { starSpawnPercent: 0, powerSpawnPercent: 0 },
      { starSpawnPercent: 12, powerSpawnPercent: 10 },
      { starSpawnPercent: 24, powerSpawnPercent: 20 },
      { starSpawnPercent: 36, powerSpawnPercent: 30 },
      { starSpawnPercent: 48, powerSpawnPercent: 40 },
    ],
    directions: { starSpawnPercent: 'up', powerSpawnPercent: 'up' },
  },
  {
    id: 'wingspan',
    labels: ['Plane scale 1.20× · near-miss window 1.40×', 'Plane scale 1.28× · near-miss window 1.55×', 'Plane scale 1.36× · near-miss window 1.70×', 'Plane scale 1.44× · near-miss window 1.85×'],
    values: [
      { planeScale: 1.2, nearMissWindow: 1.4 },
      { planeScale: 1.28, nearMissWindow: 1.55 },
      { planeScale: 1.36, nearMissWindow: 1.7 },
      { planeScale: 1.44, nearMissWindow: 1.85 },
    ],
    directions: { planeScale: 'up', nearMissWindow: 'up' },
  },
  {
    id: 'trail',
    labels: ['Score aura +0%', 'Score aura +2%', 'Score aura +4%', 'Score aura +6%'],
    values: [0, 2, 4, 6].map((scoreAuraPercent) => ({ scoreAuraPercent })),
    directions: { scoreAuraPercent: 'up' },
  },
  {
    id: 'turbo',
    labels: ['Boost grace +0.00s · hitbox 0.78×', 'Boost grace +0.15s · hitbox 0.72×', 'Boost grace +0.30s · hitbox 0.66×', 'Boost grace +0.45s · hitbox 0.60×'],
    values: [
      { boostGraceSeconds: 0, boostHitboxScale: 0.78 },
      { boostGraceSeconds: 0.15, boostHitboxScale: 0.72 },
      { boostGraceSeconds: 0.3, boostHitboxScale: 0.66 },
      { boostGraceSeconds: 0.45, boostHitboxScale: 0.6 },
    ],
    directions: { boostGraceSeconds: 'up', boostHitboxScale: 'down' },
  },
  {
    id: 'guardian',
    labels: ['Crash saves 0 per run', 'Crash saves 1 per run', 'Crash saves 2 per run'],
    values: [0, 1, 2].map((charges) => ({ charges })),
    directions: { charges: 'up' },
  },
  {
    id: 'weapon',
    labels: ['Ink Blast locked', 'Ink cooldown 0.92s', 'Ink cooldown 0.74s', 'Ink cooldown 0.56s', 'Ink cooldown 0.38s'],
    values: [1.1, 0.92, 0.74, 0.56, 0.38].map((cooldownSeconds) => ({ cooldownSeconds })),
    directions: { cooldownSeconds: 'down' },
  },
]

const MAXED_LEVELS = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.max]))

describe('upgrade purchases', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test.each(UPGRADES)('persists $id rank one and deducts its exact first price', (upgrade) => {
    const cost = upgrade.costs[0]
    addWallet(cost + 7)

    expect(buyUpgrade(upgrade.id)).toEqual({ ok: true, level: 1, cost })
    expect(getWallet()).toBe(7)
    expect(getUpgradeLevel(upgrade.id)).toBe(1)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-upgrades'))).toMatchObject({ [upgrade.id]: 1 })
  })

  test.each(UPGRADES)('rejects $id without mutating persistence when one wallet star short', (upgrade) => {
    const cost = upgrade.costs[0]
    addWallet(cost - 1)

    expect(buyUpgrade(upgrade.id)).toEqual({ ok: false, reason: 'poor', need: 1 })
    expect(getWallet()).toBe(cost - 1)
    expect(getUpgradeLevel(upgrade.id)).toBe(0)
    expect(localStorage.getItem('paper-plane-run-upgrades')).toBeNull()
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

  test.each([
    {
      name: 'not maxed',
      prestige: 0,
      levels: {},
      state: { level: 0, max: 50, capped: false, ready: false, bonusPercent: 0, nextBonusPercent: 3 },
      result: { ok: false, reason: 'not-maxed' },
      expectedLevels: {},
    },
    {
      name: 'first prestige',
      prestige: 0,
      levels: MAXED_LEVELS,
      state: { level: 0, max: 50, capped: false, ready: true, bonusPercent: 0, nextBonusPercent: 3 },
      result: { ok: true, level: 1 },
      expectedLevels: {},
    },
    {
      name: 'final rewarded prestige',
      prestige: 49,
      levels: MAXED_LEVELS,
      state: { level: 49, max: 50, capped: false, ready: true, bonusPercent: 147, nextBonusPercent: 150 },
      result: { ok: true, level: 50 },
      expectedLevels: {},
    },
    {
      name: 'prestige cap',
      prestige: 50,
      levels: MAXED_LEVELS,
      state: { level: 50, max: 50, capped: true, ready: false, bonusPercent: 150, nextBonusPercent: null },
      result: { ok: false, reason: 'max-prestige', level: 50 },
      expectedLevels: MAXED_LEVELS,
    },
  ])('$name exposes one consistent state and mutation result', ({ prestige, levels, state, result, expectedLevels }) => {
    localStorage.setItem('paper-plane-run-prestige', String(prestige))
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify(levels))

    expect(getPrestigeLevel()).toBe(state.level)
    expect(getPrestigeBonusPercent()).toBe(state.bonusPercent)
    const nextBonusPercent = getPrestigeBonusPercent(state.level + 1)
    expect(nextBonusPercent > state.bonusPercent ? nextBonusPercent : null).toBe(state.nextBonusPercent)
    expect(canPrestige()).toBe(state.ready)
    expect(doPrestige()).toEqual(result)
    expect(getPrestigeLevel()).toBe(result.ok ? result.level : state.level)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-upgrades'))).toEqual(expectedLevels)

    if (result.ok) {
      const fx = getUpgradeEffects()
      expect(fx.scoreMul).toBeCloseTo(1 + result.level * 0.03)
      expect(fx.starChanceMul).toBeCloseTo(1 + result.level * 0.03)
    }
  })

  test('caps explicit bonus queries at the existing prestige maximum', () => {
    expect(getPrestigeBonusPercent(49)).toBe(147)
    expect(getPrestigeBonusPercent(50)).toBe(150)
    expect(getPrestigeBonusPercent(51)).toBe(150)
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

        expect(descriptor).toEqual({
          id: contract.id,
          level,
          max: upgrade.max,
          maxed: level === upgrade.max,
          current: {
            label: contract.labels[level],
            values: contract.values[level],
          },
          next: level === upgrade.max ? null : {
            label: contract.labels[nextLevel],
            values: contract.values[nextLevel],
          },
        })

        if (level > 0) {
          const priorValues = describeUpgradeEffect(contract.id, level - 1).current.values
          for (const [valueKey, direction] of Object.entries(contract.directions)) {
            const prior = priorValues[valueKey]
            const current = descriptor.current.values[valueKey]
            expect(direction === 'up' ? current : prior).toBeGreaterThan(direction === 'up' ? prior : current)
          }
        }
      }
    }
  })

  test('keeps every descriptor value aligned with runtime at every persisted level', () => {
    for (const contract of UPGRADE_CONTRACTS) {
      const upgrade = UPGRADES.find((entry) => entry.id === contract.id)
      for (let level = 0; level <= upgrade.max; level += 1) {
        localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ [contract.id]: level }))

        expect(getUpgradeLevel(contract.id)).toBe(level)
        const values = describeUpgradeEffect(contract.id, level).current.values
        const effects = getUpgradeEffects()
        expect(values).toEqual(contract.values[level])

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
        if (contract.id === 'turbo') {
          expect(effects.boostSafety).toBe(level)
          expect(effects.boostGraceSeconds).toBe(values.boostGraceSeconds)
          expect(effects.boostHitboxScale).toBe(values.boostHitboxScale)
        }
        if (contract.id === 'guardian') expect(effects.guardianCharges).toBe(values.charges)
        if (contract.id === 'weapon') expect(effects.weaponCooldown).toBeCloseTo(values.cooldownSeconds)
      }
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
