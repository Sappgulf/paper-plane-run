import { describe, expect, test } from 'vitest'
import { GOLDEN_STAR_VALUE, resolveStarPickup } from '../src/game/star-value.js'

describe('star pickup value', () => {
  test('baseline star pays the shipped flat bonus', () => {
    const pickup = resolveStarPickup({})
    expect(pickup).toMatchObject({ stars: 1, meters: 18, golden: false })
    expect(pickup.label).toBe('STAR +1 · +18m')
  })

  test('fever and skim stack multiplicatively on the distance bonus', () => {
    const feverOnly = resolveStarPickup({ feverActive: true })
    // 18 * 1.5 = 27
    expect(feverOnly.meters).toBe(27)

    // skim tier 3 → 1 + 3*0.08 = 1.24 → 18 * 1.24 rounds to 22
    const skimOnly = resolveStarPickup({ skimTier: 3 })
    expect(skimOnly.meters).toBe(22)

    const stacked = resolveStarPickup({ feverActive: true, skimTier: 5 })
    // 18 * 1.5 * 1.4 = 37.8 → 38
    expect(stacked.meters).toBe(38)
    expect(stacked.stars).toBe(1)
  })

  test('golden stars are worth five and double the meter payout', () => {
    const plain = resolveStarPickup({})
    const golden = resolveStarPickup({ golden: true })
    expect(golden.stars).toBe(GOLDEN_STAR_VALUE)
    expect(golden.meters).toBe(plain.meters * 2)
    expect(golden.label).toContain('GOLDEN STAR +5★')

    const goldenFever = resolveStarPickup({ golden: true, feverActive: true, skimTier: 5 })
    // 18 * 1.5 * 1.4 * 2 = 75.6 → 76
    expect(goldenFever.meters).toBe(76)
  })

  test('never pays negative or NaN meters', () => {
    expect(resolveStarPickup({ baseMeters: -5 }).meters).toBe(0)
    expect(resolveStarPickup({ baseMeters: Number.NaN }).meters).toBe(18)
    expect(resolveStarPickup({ skimTier: 99 }).meters).toBeGreaterThan(0)
  })
})
