import { beforeEach, describe, expect, test } from 'vitest'
import {
  claimPlane,
  getEquippedSkinId,
  getLifetimeStars,
  isUnlocked,
  listSkins,
  purchasePlane,
} from '../src/skins.js'
import { UPGRADES, addWallet, doPrestige, getWallet } from '../src/upgrades.js'

describe('prestige-gated skin', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('Golden Fold is available, but not owned, after prestige', () => {
    const before = listSkins().find((s) => s.id === 'goldenfold')
    expect(before.unlocked).toBe(false)

    const maxed = {}
    for (const u of UPGRADES) maxed[u.id] = u.max
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify(maxed))
    expect(doPrestige().ok).toBe(true)

    const after = listSkins().find((s) => s.id === 'goldenfold')
    expect(after).toMatchObject({ state: 'available', unlocked: false })
  })
})

describe('plane collection purchases', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('migrates every legacy unlocked and equipped plane into permanent ownership', () => {
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic', 'mint']))
    localStorage.setItem('paper-plane-run-skin', 'coral')

    const planes = listSkins()

    expect(planes.find((plane) => plane.id === 'mint')).toMatchObject({ state: 'owned' })
    expect(planes.find((plane) => plane.id === 'coral')).toMatchObject({ state: 'equipped' })
    expect(isUnlocked('mint')).toBe(true)
    expect(isUnlocked('coral')).toBe(true)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(
      expect.arrayContaining(['classic', 'mint', 'coral']),
    )
    expect(localStorage.getItem('paper-plane-run-skin')).toBe('coral')
    expect(localStorage.getItem('paper-plane-run-skins-version')).toBe('1')
  })

  test('uses lifetime stars only as an availability requirement, separate from the wallet price', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '24')

    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({
      state: 'locked',
      requirement: { type: 'lifetime-stars', value: 25 },
      price: { currency: 'wallet-stars', value: 25 },
    })

    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({ state: 'available' })
  })

  test('deducts wallet stars, never lifetime stars, when purchasing an available plane', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(25)

    expect(purchasePlane('mint')).toEqual({ ok: true, cost: 25 })
    expect(getWallet()).toBe(0)
    expect(getLifetimeStars()).toBe(25)
    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({ state: 'owned' })
  })

  test('does not purchase an available plane when the wallet is short', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(24)

    expect(purchasePlane('mint')).toEqual({ ok: false, reason: 'poor', need: 1 })
    expect(getWallet()).toBe(24)
    expect(isUnlocked('mint')).toBe(false)
  })

  test('makes repeated plane purchases idempotent', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(25)

    expect(purchasePlane('mint')).toEqual({ ok: true, cost: 25 })
    expect(purchasePlane('mint')).toEqual({ ok: true, already: true })
    expect(getWallet()).toBe(0)
  })

  test('claims seasonal planes only during their active season without spending wallet stars', () => {
    addWallet(20)

    expect(claimPlane('halloween', 'winter')).toEqual({ ok: false, reason: 'locked' })
    expect(claimPlane('halloween', 'halloween')).toEqual({ ok: true })
    expect(getWallet()).toBe(20)
    expect(listSkins('winter').find((plane) => plane.id === 'halloween')).toMatchObject({ state: 'owned' })
    expect(claimPlane('halloween', 'halloween')).toEqual({ ok: true, already: true })
    expect(getWallet()).toBe(20)
  })

  test('claims prestige planes only after their prestige requirement is met', () => {
    expect(claimPlane('goldenfold')).toEqual({ ok: false, reason: 'locked' })
    localStorage.setItem('paper-plane-run-prestige', '1')

    expect(claimPlane('goldenfold')).toEqual({ ok: true })
    expect(listSkins().find((plane) => plane.id === 'goldenfold')).toMatchObject({ state: 'owned' })
    expect(claimPlane('goldenfold')).toEqual({ ok: true, already: true })
  })

  test('recovers from corrupt legacy ownership JSON and retains the equipped plane', () => {
    localStorage.setItem('paper-plane-run-skins', '{bad json')
    localStorage.setItem('paper-plane-run-skin', 'night')

    expect(listSkins().find((plane) => plane.id === 'classic')).toMatchObject({ state: 'owned' })
    expect(listSkins().find((plane) => plane.id === 'night')).toMatchObject({ state: 'equipped' })
    expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(
      expect.arrayContaining(['classic', 'night']),
    )
  })

  test('persists a valid fallback when corrupt ownership has no helpful equipped value', () => {
    for (const equipped of [null, 'missing-plane']) {
      localStorage.clear()
      localStorage.setItem('paper-plane-run-skins', '{bad json')
      if (equipped) localStorage.setItem('paper-plane-run-skin', equipped)

      expect(listSkins().find((plane) => plane.id === 'classic')).toMatchObject({ state: 'equipped' })
      expect(getEquippedSkinId()).toBe('classic')
      expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(['classic'])
    }
  })

  test('repairs null ownership entries to classic', () => {
    localStorage.setItem('paper-plane-run-skins', JSON.stringify([null]))

    listSkins()

    expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(['classic'])
  })

  test('repairs non-string ownership entries to known IDs', () => {
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic', 7]))

    listSkins()

    expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(['classic'])
  })

  test('removes unknown ownership IDs while retaining known IDs', () => {
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic', 'missing-plane', 'mint']))

    listSkins()

    expect(JSON.parse(localStorage.getItem('paper-plane-run-skins'))).toEqual(['classic', 'mint'])
  })

  test('persists classic when the equipped ID is invalid', () => {
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic', 'mint']))
    localStorage.setItem('paper-plane-run-skin', 'missing-plane')

    expect(getEquippedSkinId()).toBe('classic')
    expect(localStorage.getItem('paper-plane-run-skin')).toBe('classic')
  })
})
