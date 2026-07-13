import { describe, expect, it } from 'vitest'
import { createRivalState, getRivalCallout, getRivalDelta, sampleRivalPosition } from '../src/journey-rival.js'

describe('Red Dart rival', () => {
  it('samples a deterministic signature weave', () => {
    const state = createRivalState({ seed: 8, targetDistance: 900 })
    expect(sampleRivalPosition(state, 300)).toEqual(sampleRivalPosition(state, 300))
    expect(getRivalDelta(state, 400)).toBe(500)
  })

  it('emits milestone callouts only once', () => {
    const state = createRivalState({ seed: 8 })
    expect(getRivalCallout(state, 'start')).toContain('Red Dart')
    expect(getRivalCallout(state, 'start')).toBe(null)
  })
})
