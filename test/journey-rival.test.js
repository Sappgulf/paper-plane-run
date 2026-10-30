import { describe, expect, it } from 'vitest'
import { advanceRivalRace, createRivalState, getRivalCallout, getRivalDelta, getRivalRaceResult, sampleRivalPosition } from '../src/journey-rival.js'

describe('Red Dart rival', () => {
  it('samples a deterministic signature weave', () => {
    const state = createRivalState({ seed: 8, targetDistance: 900 })
    expect(sampleRivalPosition(state, 300)).toEqual(sampleRivalPosition(state, 300))
    expect(getRivalDelta(state, 400)).toBe(400)
  })

  it('emits milestone callouts only once', () => {
    const state = createRivalState({ seed: 8 })
    expect(getRivalCallout(state, 'start')).toContain('Red Dart')
    expect(getRivalCallout(state, 'start')).toBe(null)
  })
})

// A finale win is determined by who reaches the finish first, rather than
// automatically awarding the rival objective to every completed route.
describe('Red Dart race', () => {
  it('tracks a fair finish and preserves it while the final gate resolves', () => {
    const race = createRivalState({ seed: 3, targetDistance: 500, speed: 20 })
    advanceRivalRace(race, 250, 10)
    expect(getRivalRaceResult(race).playerFinished).toBe(false)
    expect(getRivalDelta(race, 250)).toBe(50)
    advanceRivalRace(race, 500, 10)
    expect(getRivalRaceResult(race).won).toBe(true)
    advanceRivalRace(race, 600, 20)
    expect(getRivalRaceResult(race).won).toBe(true)
  })

  it('resolves a finish within the frame and treats an exact tie as no win', () => {
    const race = createRivalState({ targetDistance: 100, speed: 10 })
    advanceRivalRace(race, 90, 9)
    advanceRivalRace(race, 110, 2)
    expect(getRivalRaceResult(race).won).toBe(false)
    expect(getRivalRaceResult(race).playerFinished).toBe(true)
  })

  it('distinguishes a rival victory and an unfinished flight', () => {
    const race = createRivalState({ targetDistance: 500, speed: 20 })
    advanceRivalRace(race, 300, 30)
    expect(getRivalRaceResult(race).won).toBe(false)
    expect(getRivalRaceResult(race).rivalFinished).toBe(true)
    advanceRivalRace(race, 500, 10)
    expect(getRivalRaceResult(race).won).toBe(false)
  })
})
