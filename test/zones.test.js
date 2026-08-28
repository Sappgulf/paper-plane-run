import { describe, expect, test } from 'vitest'
import { ZONES, nextZone, zoneAt } from '../src/zones.js'
import { PAPER_PALETTES } from '../src/game/paper-art.js'

describe('zones', () => {
  test('includes Midnight Origami after Aurora', () => {
    expect(ZONES.map((z) => z.id)).toEqual([
      'city', 'harbor', 'storm', 'sunset', 'aurora', 'midnight',
    ])
    const midnight = zoneAt(1700)
    expect(midnight.id).toBe('midnight')
    expect(midnight.name).toBe('Midnight Origami')
    expect(midnight.nightReadability).toBe(true)
    expect(nextZone(1200)?.id).toBe('midnight')
    expect(nextZone(1700)).toBeNull()
  })

  // The art rule is enforced at the zone table, not by convention: a zone that
  // reintroduced a photographic sky or ground would sail past a review, so the
  // only shape a zone's art may take is a `paper:` spec backed by a palette.
  test('every zone cuts its sky and ground from its own paper palette', () => {
    for (const zone of ZONES) {
      expect(zone.sky).toBe(`paper:sky:${zone.id}`)
      expect(zone.ground).toBe(`paper:ground:${zone.id}`)
      const palette = PAPER_PALETTES[zone.id]
      expect(palette, `missing palette for ${zone.id}`).toBeTruthy()
      // Three tones plus an accent — no more, or it stops being cut paper.
      for (const tone of ['far', 'mid', 'near', 'accent', 'ground', 'groundAlt', 'paper']) {
        expect(palette[tone], `${zone.id}.${tone}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})
