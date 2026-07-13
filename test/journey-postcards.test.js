import { beforeEach, describe, expect, it } from 'vitest'
import { buildPostcardShareModel, loadPostcardAlbum, normalizePostcard, savePostcardOnce } from '../src/journey-postcards.js'

describe('Journey postcard album', () => {
  beforeEach(() => localStorage.clear())

  it('stores each completed Journey postcard once', () => {
    const postcard = { id: 'journey-1-postcard', journeyId: 'journey-1', stampIds: ['city-steady'], routePath: ['city-safe'] }

    expect(savePostcardOnce(localStorage, postcard)).toBe(true)
    expect(savePostcardOnce(localStorage, postcard)).toBe(false)
    expect(loadPostcardAlbum(localStorage)[0]).toEqual(expect.objectContaining({ ...postcard, artworkId: 'city', objectiveResults: [], masteryLevel: 0, decorationIds: [] }))
  })

  it('normalizes legacy cards and skips only invalid neighbors', () => {
    const legacy = { id: 'legacy-postcard', journeyId: 'legacy', routePath: ['city-safe', 'harbor-risky'], stampIds: [] }
    localStorage.setItem('paper-plane-run-postcards-v1', JSON.stringify([
      legacy,
      { id: '', journeyId: 'broken' },
      { id: 'valid', journeyId: 'journey-2', routePath: ['aurora-risky'], stampIds: [] },
    ]))
    const cards = loadPostcardAlbum(localStorage)
    expect(cards).toHaveLength(2)
    expect(cards[0]).toEqual(normalizePostcard(legacy))
    expect(cards[0].artworkId).toBe('harbor')
  })

  it('builds compact fallback share copy', () => {
    const model = buildPostcardShareModel({
      id: 'card', journeyId: 'journey', routePath: ['city-safe', 'harbor-risky'], stampIds: ['one'],
      totalDistance: 1420, totalStars: 17, pilotId: 'navigator', rivalBeaten: true,
    })
    expect(model.text).toContain('Milo')
    expect(model.text).toContain('1,420m')
    expect(model.text).toContain('17★')
    expect(model.text).toContain('Red Dart')
  })

  it('recovers from malformed album data', () => {
    localStorage.setItem('paper-plane-run-postcards-v1', '{broken')
    expect(loadPostcardAlbum(localStorage)).toEqual([])
  })
})
