import { beforeEach, describe, expect, test } from 'vitest'
import { addWallet, buyUpgrade, getUpgradeLevel, getWallet } from '../src/upgrades.js'

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
