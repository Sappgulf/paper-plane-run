import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
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

  // Skies and grounds are painted art that ships with the build; hazards are
  // cut at runtime from the zone's own palette. Both halves have to hold for a
  // zone to be complete, and a zone added without either would otherwise only
  // show up as a missing texture in a screenshot nobody takes.
  test('every zone ships its painted sky and ground', () => {
    for (const zone of ZONES) {
      expect(zone.sky, zone.id).toBe(`/assets/sky-${zone.id}.jpg`)
      expect(zone.ground, zone.id).toBe(`/assets/ground-${zone.id}.jpg`)
      expect(existsSync(new URL(`../public${zone.sky}`, import.meta.url)), zone.sky).toBe(true)
      expect(existsSync(new URL(`../public${zone.ground}`, import.meta.url)), zone.ground).toBe(true)
    }
  })

  test('every zone backs its runtime-cut hazards with a full palette', () => {
    for (const zone of ZONES) {
      const palette = PAPER_PALETTES[zone.id]
      expect(palette, `missing palette for ${zone.id}`).toBeTruthy()
      // Three tones plus an accent — no more, or it stops being cut paper.
      for (const tone of ['far', 'mid', 'near', 'accent', 'ground', 'groundAlt', 'paper']) {
        expect(palette[tone], `${zone.id}.${tone}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})
