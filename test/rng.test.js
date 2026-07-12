import { describe, expect, test } from 'vitest'
import { dailyKey, dailySeed } from '../src/rng.js'

describe('daily route seeds', () => {
  test('uses the UTC calendar date', () => {
    const date = new Date('2026-07-12T23:59:00-05:00')
    expect(dailyKey(date)).toBe('2026-07-13')
  })

  test('is stable for the same date and mode', () => {
    const date = new Date('2026-07-12T12:00:00Z')
    expect(dailySeed('normal', date)).toBe(dailySeed('normal', date))
  })

  test('varies across dates and difficulty modes', () => {
    const first = new Date('2026-07-12T12:00:00Z')
    const next = new Date('2026-07-13T12:00:00Z')
    expect(dailySeed('normal', first)).not.toBe(dailySeed('normal', next))
    expect(dailySeed('normal', first)).not.toBe(dailySeed('hard', first))
  })
})
