import { beforeEach, describe, expect, test } from 'vitest'
import { FUTURE_PRICE_TABLE, NORMAL_RUN_EARNINGS, estimateProgression } from '../src/game/economy.js'
import { UPGRADES, addWallet, buyUpgrade, getWallet } from '../src/upgrades.js'
import { SKINS, getLifetimeStars, listSkins, purchasePlane } from '../src/skins.js'

function runsToAfford(price, starsPerRun = NORMAL_RUN_EARNINGS[1].stars) {
  return Math.ceil(price / starsPerRun)
}

describe('economy progression model', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('encodes the measured normal-run earnings checkpoints instead of treating novice probes as the average', () => {
    expect(NORMAL_RUN_EARNINGS).toEqual([
      { distance: 100, stars: 3.5 },
      { distance: 200, stars: 7 },
      { distance: 350, stars: 12 },
    ])
    expect(estimateProgression({ starsPerRun: 7, runs: 3 })).toEqual({
      starsPerRun: 7,
      runs: 3,
      walletStars: 21,
    })
  })

  test('puts early upgrades and the first paid plane within three normal runs', () => {
    const normalRunWallet = estimateProgression({ starsPerRun: 7, runs: 3 }).walletStars

    expect(FUTURE_PRICE_TABLE.upgrades.handling[0]).toBe(10)
    expect(FUTURE_PRICE_TABLE.planes.mint).toBe(20)
    expect(normalRunWallet).toBeGreaterThanOrEqual(FUTURE_PRICE_TABLE.upgrades.handling[0])
    expect(normalRunWallet).toBeGreaterThanOrEqual(FUTURE_PRICE_TABLE.planes.mint)
  })

  test('makes mid-tier choices require saving while preserving meaningful late progression', () => {
    const midTierCost = FUTURE_PRICE_TABLE.upgrades.handling[3]
    const latePlaneCost = FUTURE_PRICE_TABLE.planes.rainbow

    expect(midTierCost).toBe(55)
    expect(estimateProgression({ starsPerRun: 7, runs: 3 }).walletStars).toBeLessThan(midTierCost)
    expect(runsToAfford(midTierCost)).toBe(8)
    expect(latePlaneCost).toBe(140)
    expect(runsToAfford(latePlaneCost)).toBe(20)
  })

  test('has one monotonic future-price table for every paid upgrade rank and plane', () => {
    expect(Object.keys(FUTURE_PRICE_TABLE.upgrades)).toEqual(UPGRADES.map(({ id }) => id))
    expect(Object.keys(FUTURE_PRICE_TABLE.planes)).toEqual(
      SKINS.filter((skin) => skin.id !== 'classic' && !skin.seasonal && skin.prestigeReq == null).map(({ id }) => id),
    )

    for (const upgrade of UPGRADES) {
      expect(FUTURE_PRICE_TABLE.upgrades[upgrade.id]).toHaveLength(upgrade.max)
      expect(FUTURE_PRICE_TABLE.upgrades[upgrade.id]).toEqual([...upgrade.costs])
      expect(FUTURE_PRICE_TABLE.upgrades[upgrade.id].every((cost, index, prices) => index === 0 || cost > prices[index - 1])).toBe(true)
    }
    for (const skin of SKINS.filter((skin) => skin.id !== 'classic' && !skin.seasonal && skin.prestigeReq == null)) {
      expect(FUTURE_PRICE_TABLE.planes[skin.id]).toBe(skin.cost)
    }
    const paidPlanePrices = SKINS
      .filter((skin) => skin.id !== 'classic' && !skin.seasonal && skin.prestigeReq == null)
      .map((skin) => skin.cost)
    expect(paidPlanePrices.every((cost, index) => index === 0 || cost > paidPlanePrices[index - 1])).toBe(true)
  })

  test('spends only wallet stars for an upgrade and a plane, never lifetime stars', () => {
    const upgradeCost = FUTURE_PRICE_TABLE.upgrades.handling[0]
    const planeCost = FUTURE_PRICE_TABLE.planes.mint
    const lifetimeRequirement = listSkins().find((skin) => skin.id === 'mint').requirement.value
    localStorage.setItem('paper-plane-run-lifetime-stars', String(lifetimeRequirement))
    addWallet(upgradeCost + planeCost)

    expect(buyUpgrade('handling')).toEqual({ ok: true, level: 1, cost: upgradeCost })
    expect(purchasePlane('mint')).toEqual({ ok: true, cost: planeCost })
    expect(getWallet()).toBe(0)
    expect(getLifetimeStars()).toBe(lifetimeRequirement)
  })
})
