import { beforeEach, describe, expect, test } from 'vitest'
import {
  addWallet,
  buyUpgrade,
  getUpgradeLevel,
  getWallet,
  UPGRADES,
  canPrestige,
  doPrestige,
  getPrestigeLevel,
  getUpgradeEffects,
} from '../src/upgrades.js'

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
