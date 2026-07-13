import { describe, expect, it } from 'vitest'
import { JOURNEY_ART, getJourneyArtwork } from '../src/journey-art.js'

describe('Journey destination artwork', () => {
  it.each(['city', 'harbor', 'storm', 'aurora'])('resolves %s artwork to a bundled stable path', (id) => {
    const artwork = getJourneyArtwork(id)
    expect(artwork.src).toMatch(new RegExp(`/assets/journey/${id}-postcard\\.webp$`))
    expect(artwork.alt).toBeTruthy()
  })

  it('falls back safely to City artwork', () => {
    expect(getJourneyArtwork('unknown')).toEqual(JOURNEY_ART.city)
  })
})
