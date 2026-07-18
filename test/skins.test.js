import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  SKINS,
  claimPlane,
  getEquippedSkinId,
  getLifetimeStars,
  isUnlocked,
  listSkins,
  purchasePlane,
} from '../src/skins.js'
import { UPGRADES, addWallet, doPrestige, getWallet } from '../src/upgrades.js'

describe('plane collection art manifest', () => {
  test('maps every existing plane to valid generated art assets', () => {
    const silhouetteFamilies = new Set(['classic', 'dart', 'glider', 'stunt'])

    expect(SKINS.map((plane) => plane.id)).toEqual([
      'classic',
      'mint',
      'coral',
      'night',
      'gold',
      'sunset',
      'stormfoil',
      'neon',
      'rainbow',
      'halloween',
      'winter',
      'valentine',
      'spring',
      'goldenfold',
      'inkveil',
      'starcrest',
      'paperlegend',
    ])

    for (const plane of SKINS) {
      expect(plane.portrait).toBe(`/assets/planes/${plane.id}.webp`)
      expect(plane.texture).toBe(`/assets/planes/${plane.id}.png`)
      expect(silhouetteFamilies.has(plane.silhouette)).toBe(true)
      expect(existsSync(new URL(`../public${plane.portrait}`, import.meta.url))).toBe(true)
      expect(existsSync(new URL(`../public${plane.texture}`, import.meta.url))).toBe(true)
    }
  })
})

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

  test('preserves every legacy lifetime gate separately from the new wallet prices', () => {
    expect(listSkins().map(({ id, requirement, price }) => ({ id, requirement, price }))).toEqual([
      { id: 'classic', requirement: { type: 'lifetime-stars', value: 0 }, price: { currency: 'wallet-stars', value: 0 } },
      { id: 'mint', requirement: { type: 'lifetime-stars', value: 25 }, price: { currency: 'wallet-stars', value: 20 } },
      { id: 'coral', requirement: { type: 'lifetime-stars', value: 50 }, price: { currency: 'wallet-stars', value: 35 } },
      { id: 'night', requirement: { type: 'lifetime-stars', value: 80 }, price: { currency: 'wallet-stars', value: 55 } },
      { id: 'gold', requirement: { type: 'lifetime-stars', value: 120 }, price: { currency: 'wallet-stars', value: 80 } },
      { id: 'sunset', requirement: { type: 'lifetime-stars', value: 140 }, price: { currency: 'wallet-stars', value: 90 } },
      { id: 'stormfoil', requirement: { type: 'lifetime-stars', value: 150 }, price: { currency: 'wallet-stars', value: 100 } },
      { id: 'neon', requirement: { type: 'lifetime-stars', value: 160 }, price: { currency: 'wallet-stars', value: 110 } },
      { id: 'rainbow', requirement: { type: 'lifetime-stars', value: 200 }, price: { currency: 'wallet-stars', value: 140 } },
      { id: 'halloween', requirement: { type: 'season', value: 'halloween' }, price: null },
      { id: 'winter', requirement: { type: 'season', value: 'winter' }, price: null },
      { id: 'valentine', requirement: { type: 'season', value: 'valentine' }, price: null },
      { id: 'spring', requirement: { type: 'season', value: 'spring' }, price: null },
      { id: 'goldenfold', requirement: { type: 'prestige', value: 1 }, price: null },
      { id: 'inkveil', requirement: { type: 'prestige', value: 3 }, price: null },
      { id: 'starcrest', requirement: { type: 'prestige', value: 5 }, price: null },
      { id: 'paperlegend', requirement: { type: 'prestige', value: 10 }, price: null },
    ])
  })

  test('uses lifetime stars only as an availability requirement, separate from the wallet price', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '24')

    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({
      state: 'locked',
      requirement: { type: 'lifetime-stars', value: 25 },
      price: { currency: 'wallet-stars', value: 20 },
    })

    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({ state: 'available' })
  })

  test('deducts wallet stars, never lifetime stars, when purchasing an available plane', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(20)

    expect(purchasePlane('mint')).toEqual({ ok: true, cost: 20 })
    expect(getWallet()).toBe(0)
    expect(getLifetimeStars()).toBe(25)
    expect(listSkins().find((plane) => plane.id === 'mint')).toMatchObject({ state: 'owned' })
  })

  test('does not purchase an available plane when the wallet is short', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(19)

    expect(purchasePlane('mint')).toEqual({ ok: false, reason: 'poor', need: 1 })
    expect(getWallet()).toBe(19)
    expect(isUnlocked('mint')).toBe(false)
  })

  test('makes repeated plane purchases idempotent', () => {
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    addWallet(20)

    expect(purchasePlane('mint')).toEqual({ ok: true, cost: 20 })
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
