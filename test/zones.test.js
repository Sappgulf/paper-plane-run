import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { ZONES, nextZone, zoneAt } from '../src/zones.js'

describe('zones', () => {
  test('includes Midnight Origami after Aurora with bundled art', () => {
    expect(ZONES.map((z) => z.id)).toEqual([
      'city', 'harbor', 'storm', 'sunset', 'aurora', 'midnight',
    ])
    const midnight = zoneAt(1700)
    expect(midnight.id).toBe('midnight')
    expect(midnight.name).toBe('Midnight Origami')
    expect(nextZone(1200)?.id).toBe('midnight')
    expect(nextZone(1700)).toBeNull()
    expect(existsSync(new URL(`../public${midnight.sky}`, import.meta.url))).toBe(true)
    expect(existsSync(new URL(`../public${midnight.ground}`, import.meta.url))).toBe(true)
  })
})
