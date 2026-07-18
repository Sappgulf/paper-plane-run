import { describe, expect, it } from 'vitest'
import { createJourney, JOURNEY_VERSION } from '../src/journey.js'
import { applyJourneyRewardOnce, JOURNEY_STORAGE_KEY, loadJourney, saveJourney } from '../src/journey-storage.js'

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

  it('migrates a valid v1 Journey without losing progress', () => {
    const legacy = { ...createJourney(7, 1000), version: 1, stepIndex: 2 }
    delete legacy.attemptNumber
    delete legacy.lastOutcomeReceiptId
    delete legacy.chapter
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(legacy))
    const result = loadJourney(localStorage)
    expect(result.journey.version).toBe(JOURNEY_VERSION)
    expect(result.journey.chapter).toBe(1)
    expect(result.journey.stepIndex).toBe(2)
    expect(result.journey.attemptNumber).toBe(1)
    expect(result.recovered).toBe(false)
  })

  it('unlocks Chapter 2 when a Chapter 1 journey is saved complete', () => {
    const journey = {
      ...createJourney(3, 1000, 1),
      status: 'complete',
      stepIndex: 4,
      postcard: { id: 'p1' },
    }
    expect(saveJourney(localStorage, journey)).toBe(true)
    expect(JSON.parse(localStorage.getItem('paper-plane-run-journey-chapters'))).toEqual([1, 2])
  })

  it('rejects unknown future Journey versions without touching other saves', () => {
    localStorage.setItem('unrelated', 'keep')
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ ...createJourney(7, 1000), version: JOURNEY_VERSION + 1 }))
    expect(loadJourney(localStorage)).toEqual({ journey: null, recovered: true })
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })

  it('applies a reward identifier once', () => {
    expect(applyJourneyRewardOnce(localStorage, { id: 'j1:step1', stamps: 1 })).toBe(true)
    expect(applyJourneyRewardOnce(localStorage, { id: 'j1:step1', stamps: 1 })).toBe(false)
  })
})
