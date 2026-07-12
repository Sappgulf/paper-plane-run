import { describe, expect, test } from 'vitest'
import { FLYER_DEFS } from '../src/game/flyers.js'

describe('generated obstacle flyers', () => {
  const byId = Object.fromEntries(FLYER_DEFS.map((flyer) => [flyer.id, flyer]))

  test('registers every approved transparent obstacle asset', () => {
    expect(byId.hawk.tex).toBe('/assets/obstacles/obstacle-origami-hawk.png')
    expect(byId.pinwheel.tex).toBe('/assets/obstacles/obstacle-paper-pinwheel.png')
    expect(byId.meteor.tex).toBe('/assets/obstacles/obstacle-paperclip-meteor.png')
    expect(byId.clothespinDragonfly.tex).toBe('/assets/obstacles/obstacle-clothespin-dragonfly.png')
  })

  test('gives each new silhouette a distinct motion personality', () => {
    expect(byId.hawk.dive).toBe(true)
    expect(byId.pinwheel.spin).toBe(true)
    expect(byId.meteor.barrel).toBe(true)
    expect(byId.clothespinDragonfly.weave).toBe(true)
  })

  test('keeps initial spawn weights conservative', () => {
    for (const id of ['hawk', 'pinwheel', 'meteor', 'clothespinDragonfly']) {
      expect(byId[id].weight).toBeGreaterThan(0)
      expect(byId[id].weight).toBeLessThanOrEqual(0.35)
    }
  })
})
