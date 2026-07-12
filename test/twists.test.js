import { describe, expect, test } from 'vitest'
import { TWISTS, todaysTwist } from '../src/twists.js'

describe('daily twists', () => {
  test('every twist carries a distinct, well-formed modifier', () => {
    const ids = new Set(TWISTS.map((t) => t.id))
    expect(ids.size).toBe(TWISTS.length)
    for (const t of TWISTS) {
      expect(t.icon).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.desc).toBeTruthy()
    }
  })

  test('fog and featherlight twists apply their expected fields', () => {
    const fog = TWISTS.find((t) => t.id === 'fog')
    const feather = TWISTS.find((t) => t.id === 'feather')
    expect(fog.fogMul).toBeLessThan(1)
    expect(feather.sinkMul).toBeLessThan(1)
  })

  test('is deterministic for a given date', () => {
    const d = new Date('2026-07-12T00:00:00Z')
    expect(todaysTwist(d)).toEqual(todaysTwist(d))
  })
})
