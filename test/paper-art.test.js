import { describe, expect, test } from 'vitest'
import {
  PAPER_PALETTES,
  SKY_BANDS,
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
