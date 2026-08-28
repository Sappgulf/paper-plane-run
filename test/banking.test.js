import { describe, expect, test } from 'vitest'
import {
  MAX_BANK,
  advanceBank,
  bankSinkPerSecond,
  bankTurnAcceleration,
  createBankState,
} from '../src/game/banking.js'

const step = (state, inputX, seconds, dt = 1 / 60) => {
  let current = state
  for (let t = 0; t < seconds; t += dt) current = advanceBank(current, { inputX, dt })
  return current
}

describe('banking', () => {
  test('a full deflection takes real time to reach full bank', () => {
    const oneFrame = advanceBank(createBankState(), { inputX: 1, dt: 1 / 60 })
    expect(oneFrame.bank).toBeGreaterThan(0)
    expect(oneFrame.bank).toBeLessThan(MAX_BANK * 0.2)
    expect(step(createBankState(), 1, 0.5).bank).toBeCloseTo(MAX_BANK, 2)
  })

  // This is the property the whole change exists for: you cannot reverse
  // instantly, so committing early to a gap has to beat reacting late to it.
  test('reversing costs time because the roll passes through level', () => {
    const banked = step(createBankState(), 1, 0.5)
    const reversing = step(banked, -1, 0.08)
    expect(reversing.bank).toBeGreaterThan(-MAX_BANK)
    // Mid-reversal the plane is still turning the *old* way for a moment.
    const crossing = step(banked, -1, 0.05)
    expect(bankTurnAcceleration(crossing.bank)).toBeGreaterThan(0)
  })

  test('bank is clamped and never exceeds MAX_BANK on any input', () => {
    for (const input of [5, -5, Infinity, NaN, '2']) {
      const held = step(createBankState(), input, 2)
      expect(Math.abs(held.bank)).toBeLessThanOrEqual(MAX_BANK + 1e-9)
    }
  })

  test('turning acceleration is signed with the bank and zero when level', () => {
    expect(bankTurnAcceleration(0)).toBe(0)
    expect(bankTurnAcceleration(MAX_BANK)).toBeGreaterThan(0)
    expect(bankTurnAcceleration(-MAX_BANK)).toBeLessThan(0)
  })

  // Gentle steering has to stay near-free or the altitude economy punishes
  // ordinary play; a committed carve has to be genuinely expensive.
  test('sink from bank is quadratic, so small corrections are cheap', () => {
    expect(bankSinkPerSecond(0)).toBe(0)
    const half = bankSinkPerSecond(MAX_BANK * 0.5)
    const full = bankSinkPerSecond(MAX_BANK)
    expect(half).toBeLessThan(full * 0.3)
    expect(full).toBeGreaterThan(0)
  })

  test('rolling back to level is faster than rolling into a turn', () => {
    const banked = step(createBankState(), 1, 0.5)
    const recovering = advanceBank(banked, { inputX: 0, dt: 1 / 60 })
    const entering = advanceBank(createBankState(), { inputX: 1, dt: 1 / 60 })
    expect(banked.bank - recovering.bank).toBeGreaterThan(entering.bank)
  })
})
