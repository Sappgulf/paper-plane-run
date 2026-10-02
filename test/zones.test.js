import { describe, expect, test } from 'vitest'
import { ZONES, nextZone, zoneAt } from '../src/zones.js'
import { PAPER_PALETTES } from '../src/game/paper-art.js'
import { createWorldCanvas } from '../src/game/paper-world-art.js'

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

  test('every zone resolves complete, distinct sky and ground plates without network assets', () => {
    const skyDraws = new Set(), groundDraws = new Set()
    for (const zone of ZONES) {
      for (const kind of ['sky','ground','wall']) {
        if (kind !== 'wall') expect(zone[kind]).toBe(`paper:${kind}:${zone.id}`)
        const commands = []
        // Record the real generator's complete draw stream, including paints
        // and coordinates. The browser suite verifies its visible rendering.
        const context = new Proxy({}, {
          get: (_,name) => (...args) => { commands.push([name,...args]) },
          set: (_,name,value) => { commands.push([name,value]); return true },
        })
        const canvas = createWorldCanvas({ kind,zoneId:zone.id,canvasFactory:()=>({getContext:()=>context}) })
        expect(canvas.width).toBe(512)
        expect(canvas.height).toBe(kind === 'sky' ? 256 : 512)
        expect(commands.length).toBeGreaterThan(100)
        expect(commands.flat().filter(value=>typeof value === 'number').every(Number.isFinite)).toBe(true)
        const signature = JSON.stringify(commands)
        if (kind === 'sky') skyDraws.add(signature)
        if (kind === 'ground') groundDraws.add(signature)
      }
    }
    expect(skyDraws.size).toBe(ZONES.length)
    expect(groundDraws.size).toBe(ZONES.length)
    expect(createWorldCanvas({canvasFactory:()=>null})).toBeNull()
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
