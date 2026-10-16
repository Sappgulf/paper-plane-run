import { describe, expect, test } from 'vitest'
import { FLYER_DEFS, RETIRED_FLYER_IDS, SEASONAL_FLYER_BIAS, flyerPoolForSeason } from '../src/game/flyers.js'
import { HAZARD_PROFILES } from '../src/game/paper-art.js'

describe('generated obstacle flyers', () => {
  const byId = Object.fromEntries(FLYER_DEFS.map((flyer) => [flyer.id, flyer]))

  test('cuts every flyer from paper rather than loading a sprite file', () => {
    for (const flyer of FLYER_DEFS) expect(flyer.sprite).toBe('paper')
    // Retired types are no longer in the core roster; their art lives in docs/retired-art
    for (const id of RETIRED_FLYER_IDS) expect(byId[id]).toBeUndefined()
  })

  test('every seasonal bias names a flyer on the live roster', () => {
    const live = new Set(FLYER_DEFS.map((flyer) => flyer.id))
    for (const [season, bias] of Object.entries(SEASONAL_FLYER_BIAS)) {
      for (const id of Object.keys(bias)) {
        expect(live.has(id), `${season} biases retired or unknown flyer "${id}"`).toBe(true)
      }
    }
  })

  test('spring favours paper dragonflies without touching the rest of the roster', () => {
    const pool = flyerPoolForSeason(FLYER_DEFS, 'spring')
    expect(pool.map((flyer) => flyer.id)).toEqual(FLYER_DEFS.map((flyer) => flyer.id))
    const dragonfly = pool.find((flyer) => flyer.id === 'dragonfly')
    expect(dragonfly.weight).toBeGreaterThan(byId.dragonfly.weight)
    expect(pool.find((flyer) => flyer.id === 'bird').weight).toBe(byId.bird.weight)
  })

  test('season weighting copies the roster and never mutates the authored weights', () => {
    const before = FLYER_DEFS.map((flyer) => flyer.weight)
    flyerPoolForSeason(FLYER_DEFS, 'halloween')
    flyerPoolForSeason(FLYER_DEFS, 'summer')
    expect(FLYER_DEFS.map((flyer) => flyer.weight)).toEqual(before)
    expect(flyerPoolForSeason(FLYER_DEFS, 'default').map((flyer) => flyer.weight)).toEqual(before)
  })

  test('gives each silhouette a distinct motion personality', () => {
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

  test('every flyer kind has its own cut-paper silhouette profile', () => {
    // The billboard renderer cuts each kind from paper-art; a missing
    // silhouette silently renders "some other flyer", which is exactly the
    // look-alike wall the per-kind art pass was made to prevent.
    for (const flyer of FLYER_DEFS) {
      const profile = HAZARD_PROFILES[flyer.id]
      expect(profile, `${flyer.id} has no cut-paper silhouette`).toBeTruthy()
      expect(profile.length, `${flyer.id} silhouette is not empty`).toBeGreaterThan(0)
    }
  })

  test('retired ids never re-enter the seasonal pool', () => {
    for (const seasonId of ['default', 'halloween', 'winter', 'valentine', 'spring', 'summer']) {
      const ids = flyerPoolForSeason(FLYER_DEFS, seasonId).map((f) => f.id)
      for (const retired of RETIRED_FLYER_IDS) {
        expect(ids, `${retired} in ${seasonId}`).not.toContain(retired)
      }
    }
  })
})
