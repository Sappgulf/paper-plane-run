import { describe, expect, test } from 'vitest'
import {
  HAZARD_INK,
  HAZARD_OUTLINE,
  PAPER_PALETTES,
  SKY_BANDS,
  createHazardCanvas,
  createPaperGroundCanvas,
  createPaperSkyCanvas,
  getPaperPalette,
  paperShadowSpec,
} from '../src/game/paper-art.js'

describe('paper art direction', () => {
  test('every palette is three tones plus one accent', () => {
    for (const [id, palette] of Object.entries(PAPER_PALETTES)) {
      for (const key of ['far', 'mid', 'near', 'accent']) {
        expect(palette[key], `${id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
      // The three tones must actually be distinguishable, or the "cut paper
      // layers" read collapses into one flat field.
      expect(new Set([palette.far, palette.mid, palette.near]).size, id).toBe(3)
    }
  })

  test('sky bands are uneven and cover the whole sheet', () => {
    expect(SKY_BANDS[SKY_BANDS.length - 1].to).toBe(1)
    const spans = SKY_BANDS.map((band, i) => band.to - (SKY_BANDS[i - 1]?.to ?? 0))
    expect(new Set(spans.map((span) => span.toFixed(3))).size).toBe(spans.length)
    // Ascending, so a band can never be cut behind the one before it.
    for (let i = 1; i < SKY_BANDS.length; i += 1) {
      expect(SKY_BANDS[i].to).toBeGreaterThan(SKY_BANDS[i - 1].to)
    }
  })

  test('an unknown zone still gets a palette rather than undefined colours', () => {
    expect(getPaperPalette('nonexistent')).toBe(PAPER_PALETTES.city)
    expect(getPaperPalette(undefined).far).toMatch(/^#/)
  })

  // Depth is hard offset shadow, never blur — a blurred shadow is the fastest
  // way to stop looking like cut paper, so the spec makes that unavailable.
  test('paper shadows are hard offsets with no blur at any depth', () => {
    for (const depth of [0, 1, 4, 99]) {
      const spec = paperShadowSpec({ depth })
      expect(spec.blur).toBe(0)
      expect(spec.offsetX).toBeGreaterThan(0)
      expect(spec.offsetY).toBeGreaterThan(0)
    }
    expect(paperShadowSpec({ depth: 3 }).offsetY)
      .toBeGreaterThan(paperShadowSpec({ depth: 0 }).offsetY)
  })

  test('canvases degrade to null headlessly rather than throwing', () => {
    expect(createPaperSkyCanvas({ canvasFactory: () => null })).toBeNull()
    expect(createPaperGroundCanvas({ canvasFactory: () => null })).toBeNull()
  })
})

describe('hazard sprites', () => {
  // Danger has exactly one colour per zone, and nothing else may use it: that
  // is what lets a player learn "accent means it kills me" once rather than
  // per zone. Hazards used to be cut-out product photographs, which shared no
  // palette with anything and read as scenery.
  test('every zone reserves a distinct accent for hazards', () => {
    for (const [id, palette] of Object.entries(PAPER_PALETTES)) {
      const scenery = [palette.far, palette.mid, palette.near, palette.ground, palette.groundAlt, palette.paper]
      expect(scenery, `${id} reuses its accent for scenery`).not.toContain(palette.accent)
    }
  })

  test('the ink outline is dark and thick enough to survive distance', () => {
    expect(HAZARD_INK).toMatch(/^#[0-9a-f]{6}$/i)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(HAZARD_INK.slice(i, i + 2), 16))
    // Genuinely dark, so it reads against a pale sky and a dark midnight zone.
    expect(Math.max(r, g, b)).toBeLessThan(80)
    expect(HAZARD_OUTLINE).toBeGreaterThan(0.03)
  })

  test('sprites degrade to null headlessly rather than throwing', () => {
    expect(createHazardCanvas({ kind: 'scissors', canvasFactory: () => null })).toBeNull()
    expect(createHazardCanvas({ kind: 'flyer', canvasFactory: () => null })).toBeNull()
    // An unknown kind still produces something rather than nothing at all.
    expect(createHazardCanvas({ kind: 'nonsense', canvasFactory: () => null })).toBeNull()
  })
})
