import { describe, expect, test } from 'vitest'
import {
  FLARE_FLOOR,
  TUCK_COOLDOWN,
  TUCK_FULL_SECONDS,
  advanceTuck,
  createTuckState,
  tuckCharge,
  tuckFlightModifiers,
} from '../src/game/tuck-flare.js'

const hold = (state, seconds, dt = 1 / 60, options = {}) => {
  let current = state
  for (let t = 0; t < seconds; t += dt) {
    current = advanceTuck(current, { held: true, dt, height: 12, ...options })
  }
  return current
}

describe('tuck and flare', () => {
  test('charge is superlinear, so the last moment of a tuck is worth the most', () => {
    expect(tuckCharge(0)).toBe(0)
    expect(tuckCharge(TUCK_FULL_SECONDS)).toBeCloseTo(1, 5)
    expect(tuckCharge(TUCK_FULL_SECONDS * 2)).toBeCloseTo(1, 5)
    const firstHalf = tuckCharge(TUCK_FULL_SECONDS * 0.5)
    const secondHalf = 1 - firstHalf
    expect(secondHalf).toBeGreaterThan(firstHalf)
  })

  test('holding tucks, releasing flares and pays', () => {
    const tucked = hold(createTuckState(), TUCK_FULL_SECONDS)
    expect(tucked.phase).toBe('tucking')
    expect(tucked.charge).toBeCloseTo(1, 1)
    const flared = advanceTuck(tucked, { held: false, dt: 1 / 60, height: 12 })
    expect(flared.phase).toBe('flaring')
    expect(flared.payout.clean).toBe(true)
    expect(flared.payout.distance).toBeGreaterThan(0)
    expect(flared.payout.climb).toBeGreaterThan(0)
  })

  // The save clause: a blown tuck is survivable and never profitable. Without
  // it, the optimal play would be to hold until the ground and take the climb.
  test('a flare below the floor still saves you but pays nothing', () => {
    const tucked = hold(createTuckState(), TUCK_FULL_SECONDS)
    const scraped = advanceTuck(tucked, { held: false, dt: 1 / 60, height: FLARE_FLOOR - 0.1 })
    expect(scraped.payout.clean).toBe(false)
    expect(scraped.payout.distance).toBe(0)
    expect(scraped.payout.climb).toBeGreaterThan(0)
    expect(scraped.payout.banner).toBe('SAVED')
  })

  test('the payout is emitted exactly once', () => {
    const tucked = hold(createTuckState(), 0.5)
    let current = advanceTuck(tucked, { held: false, dt: 1 / 60, height: 12 })
    expect(current.payout).toBeTruthy()
    let extra = 0
    for (let t = 0; t < 1; t += 1 / 60) {
      current = advanceTuck(current, { held: false, dt: 1 / 60, height: 12 })
      if (current.payout) extra += 1
    }
    expect(extra).toBe(0)
  })

  test('a held button cannot re-arm a tuck through the cooldown', () => {
    const tucked = hold(createTuckState(), 0.4)
    let current = advanceTuck(tucked, { held: false, dt: 1 / 60, height: 12 })
    // Hold the button down again immediately; the cooldown must swallow it.
    current = hold(current, TUCK_COOLDOWN * 0.5)
    expect(current.phase).not.toBe('tucking')
  })

  test('tucking dives hard and steers badly; flaring climbs', () => {
    const tucking = tuckFlightModifiers(hold(createTuckState(), TUCK_FULL_SECONDS))
    expect(tucking.extraSink).toBeGreaterThan(0)
    expect(tucking.speedBonus).toBeGreaterThan(0)
    expect(tucking.rollMul).toBeLessThan(1)

    const flaring = tuckFlightModifiers(
      advanceTuck(hold(createTuckState(), TUCK_FULL_SECONDS), { held: false, dt: 1 / 60, height: 12 }),
    )
    expect(flaring.extraSink).toBeLessThan(0)
    expect(flaring.rollMul).toBeGreaterThan(1)
  })

  test('idle is inert and disabling resets everything', () => {
    const idle = tuckFlightModifiers(createTuckState())
    expect(idle).toEqual({ extraSink: 0, speedBonus: 0, rollMul: 1, fov: 0 })
    expect(advanceTuck(hold(createTuckState(), 1), { held: true, dt: 1 / 60, enabled: false }))
      .toEqual(createTuckState())
  })
})

describe('deep flare upgrade', () => {
  test('a higher charge rate reaches the same charge in less held time', () => {
    const base = hold(createTuckState(), 0.6)
    const upgraded = hold(createTuckState(), 0.6, 1 / 60, { chargeRate: 1.64 })
    expect(upgraded.charge).toBeGreaterThan(base.charge)
  })

  test('payout scales the reward but never rescues a blown tuck', () => {
    const tucked = hold(createTuckState(), TUCK_FULL_SECONDS)
    const clean = advanceTuck(tucked, { held: false, dt: 1 / 60, height: 12, payoutMul: 1.72 })
    const plain = advanceTuck(tucked, { held: false, dt: 1 / 60, height: 12 })
    expect(clean.payout.distance).toBeGreaterThan(plain.payout.distance)
    expect(clean.payout.climb).toBeGreaterThan(plain.payout.climb)

    const blown = advanceTuck(tucked, { held: false, dt: 1 / 60, height: FLARE_FLOOR - 0.1, payoutMul: 1.72 })
    expect(blown.payout.distance).toBe(0)
  })
})
