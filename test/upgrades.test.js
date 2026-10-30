import { beforeEach, describe, expect, test } from 'vitest'
import {
  addWallet,
  buyUpgrade,
  getUpgradeLevel,
  getWallet,
  UPGRADES,
  describeUpgradeEffect,
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
    labels: [
      'Ink Blast locked',
      'Auto-fire 3.20s · 46m range',
      'Auto-fire 2.75s · 52m range',
      'Auto-fire 2.30s · 58m range',
      'Auto-fire 1.85s · 64m range',
    ],
    values: [
      { cooldownSeconds: 0, range: 0 },
      { cooldownSeconds: 3.2, range: 46 },
      { cooldownSeconds: 2.75, range: 52 },
      { cooldownSeconds: 2.3, range: 58 },
      { cooldownSeconds: 1.85, range: 64 },
    ],
    directions: { cooldownSeconds: 'down', range: 'up' },
    // 0 means locked; the unlock transition is not a cooldown regression.
    skipFirstDirection: true,
  },
  {
    id: 'salvo',
    labels: ['Darts per volley 1', 'Darts per volley 2', 'Darts per volley 3'],
    values: [1, 2, 3].map((darts) => ({ darts })),
    directions: { darts: 'up' },
  },
  {
    id: 'pierce',
    labels: [
      'Pierce 0 targets · damage +0',
      'Pierce 1 target · damage +0',
      'Pierce 2 targets · damage +1',
    ],
    values: [0, 1, 2].map((pierce) => ({ pierce })),
    directions: { pierce: 'up' },
  },
  {
    id: 'flare',
    labels: [
      'Flare pays base',
      'Charge 1.16x · flare 1.18x',
      'Charge 1.32x · flare 1.36x',
      'Charge 1.48x · flare 1.54x',
      'Charge 1.64x · flare 1.72x',
    ],
    values: [0, 1, 2, 3, 4].map((level) => ({
      chargeRate: Number((1 + level * 0.16).toFixed(2)),
      payoutMul: Number((1 + level * 0.18).toFixed(2)),
    })),
    directions: { chargeRate: 'up', payoutMul: 'up' },
  },
  {
    id: 'fever',
    labels: [
      'Fever at 8 near-misses · 4.00s',
      'Fever at 7 near-misses · 4.75s',
      'Fever at 6 near-misses · 5.50s',
      'Fever at 5 near-misses · 6.25s',
    ],
    values: [0, 1, 2, 3].map((thresholdReduction) => ({
      thresholdReduction,
      durationBonusSeconds: thresholdReduction * 0.75,
      threshold: Math.max(4, 8 - thresholdReduction),
      durationSeconds: 4 + thresholdReduction * 0.75,
    })),
    directions: { thresholdReduction: 'up', durationBonusSeconds: 'up' },
  },
  {
    id: 'streak',
    labels: [
      'Star streak window 2.20s',
      'Star streak window 2.60s',
      'Star streak window 3.00s',
      'Star streak window 3.40s',
    ],
    values: [0, 0.4, 0.8, 1.2].map((windowBonusSeconds) => ({
      windowBonusSeconds,
      windowSeconds: Number((2.2 + windowBonusSeconds).toFixed(2)),
    })),
    directions: { windowBonusSeconds: 'up' },
  },
  {
    id: 'wealth',
    labels: [
      'Cluster chance +0% (stacks with Lucky Scrap)',
      'Cluster chance +8% (stacks with Lucky Scrap)',
      'Cluster chance +16% (stacks with Lucky Scrap)',
      'Cluster chance +24% (stacks with Lucky Scrap)',
    ],
    values: [0, 8, 16, 24].map((doubleStarPercent) => ({ doubleStarPercent })),
    directions: { doubleStarPercent: 'up' },
  },
  {
    id: 'gust',
    labels: [
      'Gusts push at full strength',
      'Gust push -15%',
      'Gust push -30%',
      'Gust push -45%',
    ],
    values: [0, 15, 30, 45].map((pushReductionPercent) => ({ pushReductionPercent })),
    directions: { pushReductionPercent: 'up' },
  },
  {
    id: 'thermal',
    labels: [
      'Updrafts lift at base strength',
      'Updraft lift +12%',
      'Updraft lift +24%',
      'Updraft lift +36%',
    ],
    values: [0, 12, 24, 36].map((liftPercent) => ({ liftPercent })),
    directions: { liftPercent: 'up' },
  },
  {
    id: 'reader',
    labels: [
      'Gust warnings at base length',
      'Gust warning +0.30s',
      'Gust warning +0.60s',
      'Gust warning +0.90s',
    ],
    values: [0, 0.3, 0.6, 0.9].map((warningBonusSeconds) => ({ warningBonusSeconds })),
    directions: { warningBonusSeconds: 'up' },
  },
  {
    id: 'bounty',
    labels: [
      'Formation clears pay base stars',
      'Formation clears +2★',
      'Formation clears +4★',
      'Formation clears +6★',
    ],
    values: [0, 2, 4, 6].map((starBonus) => ({ starBonus })),
    directions: { starBonus: 'up' },
  },
  {
    id: 'lens',
    labels: [
      'Fog draws at base distance',
      'Fog draw +12%',
      'Fog draw +24%',
      'Fog draw +36%',
    ],
    values: [0, 12, 24, 36].map((drawPercent) => ({ drawPercent })),
    directions: { drawPercent: 'up' },
  },
  {
    id: 'purse',
    labels: [
      'Skim tiers pay base stars',
      'Skim tiers +1★',
      'Skim tiers +2★',
      'Skim tiers +3★',
    ],
    values: [0, 1, 2, 3].map((tierStars) => ({ tierStars })),
    directions: { tierStars: 'up' },
  },
  {
    id: 'mail',
    labels: [
      'Near misses pay base meters',
      'Near misses +1m',
      'Near misses +2m',
      'Near misses +3m',
    ],
    values: [0, 1, 2, 3].map((nearMissMeters) => ({ nearMissMeters })),
    directions: { nearMissMeters: 'up' },
  },
  {
    id: 'patient',
    labels: [
      'Combo holds at base length',
      'Combo hold +0.25s',
      'Combo hold +0.50s',
      'Combo hold +0.75s',
    ],
    values: [0, 0.25, 0.5, 0.75].map((holdBonusSeconds) => ({ holdBonusSeconds })),
    directions: { holdBonusSeconds: 'up' },
  },
]

const MAXED_LEVELS = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.max]))

describe('upgrade purchases', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  function seedRequirement(upgrade) {
    if (!upgrade.requires) return
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({
      [upgrade.requires.id]: upgrade.requires.level,
    }))
  }

  test.each(UPGRADES)('persists $id rank one and deducts its exact first price', (upgrade) => {
    const cost = upgrade.costs[0]
    addWallet(cost + 7)
    seedRequirement(upgrade)

    expect(buyUpgrade(upgrade.id)).toEqual({ ok: true, level: 1, cost })
    expect(getWallet()).toBe(7)
    expect(getUpgradeLevel(upgrade.id)).toBe(1)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-upgrades'))).toMatchObject({ [upgrade.id]: 1 })
  })

  test.each(UPGRADES)('rejects $id without mutating persistence when one wallet star short', (upgrade) => {
    const cost = upgrade.costs[0]
    addWallet(cost - 1)
    seedRequirement(upgrade)
    const before = localStorage.getItem('paper-plane-run-upgrades')

    expect(buyUpgrade(upgrade.id)).toEqual({ ok: false, reason: 'poor', need: 1 })
    expect(getWallet()).toBe(cost - 1)
    expect(getUpgradeLevel(upgrade.id)).toBe(0)
    expect(localStorage.getItem('paper-plane-run-upgrades')).toBe(before)
  })

  test('weapon ranks gate salvo and pierce until their prerequisites are met', () => {
    addWallet(300)
    expect(buyUpgrade('salvo')).toEqual({
      ok: false,
      reason: 'requires',
      requires: { id: 'weapon', level: 1 },
    })
    expect(buyUpgrade('pierce')).toEqual({
      ok: false,
      reason: 'requires',
      requires: { id: 'weapon', level: 2 },
    })
    expect(buyUpgrade('weapon').ok).toBe(true)
    expect(buyUpgrade('salvo').ok).toBe(true)
    expect(buyUpgrade('pierce').reason).toBe('requires')
    expect(buyUpgrade('weapon').ok).toBe(true)
    expect(buyUpgrade('pierce').ok).toBe(true)
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

  test('treats corrupted wallet storage as zero and keeps gameplay currency operations safe', () => {
    localStorage.setItem('paper-plane-run-wallet', 'not-a-number')

    expect(getWallet()).toBe(0)
    expect(spendWallet(1)).toBe(false)
    expect(addWallet(3.9)).toBe(3)
    expect(getWallet()).toBe(3)
  })
})

describe('deep flare', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  // An unpurchased tree has to be exactly the shipped baseline, not a penalty:
  // the Tuck is the core move and must feel identical on a fresh save.
  test('is exactly neutral until purchased, then scales charge and payout', () => {
    const base = getUpgradeEffects()
    expect(base.flareChargeRate).toBe(1)
    expect(base.flarePayoutMul).toBe(1)

    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ flare: 1 }))
    const lvl1 = getUpgradeEffects()
    expect(lvl1.flareChargeRate).toBeCloseTo(1.16)
    expect(lvl1.flarePayoutMul).toBeCloseTo(1.18)

    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ flare: 4 }))
    const maxed = getUpgradeEffects()
    expect(maxed.flareChargeRate).toBeCloseTo(1.64)
    expect(maxed.flarePayoutMul).toBeCloseTo(1.72)
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

        if (level > 0 && !(contract.skipFirstDirection && level === 1)) {
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
        if (contract.id === 'weapon') {
          expect(effects.weaponCooldown).toBeCloseTo(values.cooldownSeconds)
          expect(effects.weaponRange).toBe(values.range)
        }
        if (contract.id === 'salvo') expect(effects.weaponSalvo).toBe(values.darts - 1)
        if (contract.id === 'pierce') expect(effects.weaponPierce).toBe(values.pierce)
        if (contract.id === 'flare') {
          expect(effects.flareChargeRate).toBeCloseTo(values.chargeRate)
          expect(effects.flarePayoutMul).toBeCloseTo(values.payoutMul)
        }
        if (contract.id === 'fever') {
          expect(effects.feverThresholdBonus).toBe(values.thresholdReduction)
          expect(effects.feverDurationBonus).toBeCloseTo(values.durationBonusSeconds)
        }
        if (contract.id === 'streak') expect(effects.streakWindowBonus).toBeCloseTo(values.windowBonusSeconds)
        if (contract.id === 'wealth') expect(effects.doubleStarBonus).toBeCloseTo(values.doubleStarPercent / 100)
        if (contract.id === 'reader') expect(effects.windWarningBonus).toBeCloseTo(values.warningBonusSeconds)
        if (contract.id === 'bounty') expect(effects.gateStarBonus).toBe(values.starBonus)
        if (contract.id === 'lens') expect(effects.fogDistanceMul).toBeCloseTo(1 + values.drawPercent / 100)
        if (contract.id === 'purse') expect(effects.skimTierStarBonus).toBe(values.tierStars)
        if (contract.id === 'mail') expect(effects.nearMissPayBonus).toBe(values.nearMissMeters)
        if (contract.id === 'patient') expect(effects.comboHoldBonus).toBeCloseTo(values.holdBonusSeconds)
      }
    }
  })

  test('normalizes malformed persisted levels to known upgrade caps', () => {
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ handling: '2.9', guardian: 99, flare: -4 }))
    expect(getUpgradeLevel('handling')).toBe(2)
    expect(getUpgradeLevel('guardian')).toBe(2)
    expect(getUpgradeLevel('flare')).toBe(0)

    localStorage.setItem('paper-plane-run-upgrades', 'null')
    expect(getUpgradeLevel('handling')).toBe(0)

    localStorage.setItem('paper-plane-run-upgrades', '{')
    expect(getUpgradeLevel('handling')).toBe(0)
  })

  test('returns no descriptor for a missing upgrade id', () => {
    expect(describeUpgradeEffect('missing', 0)).toBeNull()
  })
})
