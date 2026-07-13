import { describe, expect, it } from 'vitest'
import { applyJourneyModifier, getPilotEffect } from '../src/journey-modifiers.js'

describe('Journey modifiers', () => {
  it('applies configured flight changes without mutating defaults', () => {
    const base = { wind: 1, fog: 1, stars: 1, movingObstacles: false, shortcutGates: false }
    expect(applyJourneyModifier(base, { modifier: 'crosswind' }).wind).toBeGreaterThan(1)
    expect(applyJourneyModifier(base, { modifier: 'low-visibility' }).fog).toBeGreaterThan(1)
    expect(base.wind).toBe(1)
  })

  it('caps Daredevil momentum and exposes Navigator hints', () => {
    expect(getPilotEffect('daredevil', { nearMisses: 50 }).momentum).toBeLessThanOrEqual(0.12)
    expect(getPilotEffect('navigator', {}).shortcutHint).toBe(true)
  })
})
