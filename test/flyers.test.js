import { describe, expect, test } from 'vitest'
import { FLYER_DEFS } from '../src/game/flyers.js'

describe('generated obstacle flyers', () => {
  const byId = Object.fromEntries(FLYER_DEFS.map((flyer) => [flyer.id, flyer]))

  test('registers every approved transparent obstacle asset', () => {
    expect(byId.hawk.tex).toBe('/assets/obstacles/obstacle-origami-hawk.webp')
    // Retired types are no longer in the core roster but remain on disk
    expect(byId.butterfly).toBeUndefined()
    expect(byId.swarm).toBeUndefined()
  })

  test('gives each new silhouette a distinct motion personality', () => {
    expect(byId.hawk.dive).toBe(true)
    expect(byId.balloon.floaty).toBe(true)
    expect(byId.kite.weave).toBe(true)
    expect(byId.wasp.weave).toBe(true)
  })

  test('keeps initial spawn weights conservative', () => {
    for (const id of ['hawk']) {
      expect(byId[id].weight).toBeGreaterThan(0)
      expect(byId[id].weight).toBeLessThan(0.5)
    }
    expect(byId.hawk.weight).toBeLessThan(byId.bird.weight)
  })
})
