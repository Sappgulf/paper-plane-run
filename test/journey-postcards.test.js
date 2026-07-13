import { beforeEach, describe, expect, it } from 'vitest'
import { loadPostcardAlbum, savePostcardOnce } from '../src/journey-postcards.js'

describe('Journey postcard album', () => {
  beforeEach(() => localStorage.clear())

  it('stores each completed Journey postcard once', () => {
    const postcard = { id: 'journey-1-postcard', stampIds: ['city-steady'] }

    expect(savePostcardOnce(localStorage, postcard)).toBe(true)
    expect(savePostcardOnce(localStorage, postcard)).toBe(false)
    expect(loadPostcardAlbum(localStorage)).toEqual([postcard])
  })

  it('recovers from malformed album data', () => {
    localStorage.setItem('paper-plane-run-postcards-v1', '{broken')
    expect(loadPostcardAlbum(localStorage)).toEqual([])
  })
})
