import { describe, expect, test } from 'vitest'
import { BOSS_PASS_LINE, crossedPassLine } from '../src/game/gate-crossing.js'

describe('boss gate crossing', () => {
  test('a normal frame crossing the pass line resolves', () => {
    expect(crossedPassLine(0.8, -0.7)).toBe(true)
  })

  test('a fast frame that tunnels the whole slice still resolves', () => {
    expect(crossedPassLine(3.4, -3.2)).toBe(true)
  })

  test('approaching but not yet through does not resolve', () => {
    expect(crossedPassLine(2.1, 0.4)).toBe(false)
  })

  test('already behind the gate does not re-resolve', () => {
    expect(crossedPassLine(-0.7, -2.4)).toBe(false)
  })

  test('first frame or junk input stays inert', () => {
    expect(crossedPassLine(undefined, -1)).toBe(false)
    expect(crossedPassLine(NaN, -1)).toBe(false)
    expect(crossedPassLine(1, NaN)).toBe(false)
  })

  test('a custom pass line is honored', () => {
    expect(crossedPassLine(0.2, -0.1, 0)).toBe(true)
    expect(crossedPassLine(0.2, -0.1, BOSS_PASS_LINE)).toBe(false)
  })
})
