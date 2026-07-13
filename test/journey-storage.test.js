import { describe, expect, it } from 'vitest'
import { createJourney } from '../src/journey.js'
import { applyJourneyRewardOnce, loadJourney, saveJourney } from '../src/journey-storage.js'

describe('Journey storage', () => {
  it('round trips a valid journey', () => {
    const journey = createJourney(4, 1000)
    saveJourney(localStorage, journey)
    expect(loadJourney(localStorage)).toEqual({ journey, recovered: false })
  })

  it('recovers only Journey from corrupt data', () => {
    localStorage.setItem('unrelated', 'keep')
    localStorage.setItem('paper-plane-run-journey-v1', '{bad')
    expect(loadJourney(localStorage)).toEqual({ journey: null, recovered: true })
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })

  it('applies a reward identifier once', () => {
    expect(applyJourneyRewardOnce(localStorage, { id: 'j1:step1', stamps: 1 })).toBe(true)
    expect(applyJourneyRewardOnce(localStorage, { id: 'j1:step1', stamps: 1 })).toBe(false)
  })
})
