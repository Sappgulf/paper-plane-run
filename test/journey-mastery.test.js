import { describe, expect, it } from 'vitest'
import {
  createMasteryState,
  getPilotMasteryView,
  resolveMasteryOutcome,
} from '../src/journey-mastery.js'
import {
  JOURNEY_MASTERY_STORAGE_KEY,
  loadMastery,
  saveMastery,
} from '../src/journey-mastery-storage.js'

describe('Journey pilot mastery', () => {
  it('applies one mastery receipt once', () => {
    const outcome = { receiptId: 'j:r:1', pilotId: 'daredevil', nearMisses: 8, risky: true }
    const once = resolveMasteryOutcome(createMasteryState(), outcome)
    const twice = resolveMasteryOutcome(once, outcome)
    expect(twice).toEqual(once)
    expect(getPilotMasteryView(once, 'daredevil').level).toBe(1)
    expect(getPilotMasteryView(once, 'daredevil').cosmetics).toContain('pip-portrait-close-call')
  })

  it('unlocks Navigator mastery at exact route, gate, and destination thresholds', () => {
    let state = createMasteryState()
    for (const [index, destinationId] of ['city', 'harbor', 'storm', 'aurora'].entries()) {
      state = resolveMasteryOutcome(state, {
        receiptId: `milo:${index}`,
        pilotId: 'navigator',
        completed: true,
        shortcutGatesCleared: index < 2 ? 3 : 0,
        destinationId,
      })
    }
    const view = getPilotMasteryView(state, 'navigator')
    expect(view.level).toBe(3)
    expect(view.cosmetics).toEqual(['milo-portrait-route-reader', 'milo-map-trail', 'milo-compass-border'])
  })

  it('credits chapter 2 destinations toward navigator mastery', () => {
    let state = createMasteryState()
    for (const [index, destinationId] of ['sunset', 'midnight'].entries()) {
      state = resolveMasteryOutcome(state, {
        receiptId: `c2:${index}`,
        pilotId: 'navigator',
        completed: true,
        destinationId,
      })
    }
    expect(state.pilots.navigator.counters.routesCompleted).toBe(2)
    expect(state.pilots.navigator.counters.destinations).toEqual(['sunset', 'midnight'])
  })

  it('unlocks Daredevil mastery without granting gameplay currency', () => {
    let state = createMasteryState()
    state = resolveMasteryOutcome(state, { receiptId: 'pip:1', pilotId: 'daredevil', nearMisses: 8, completed: true, risky: true })
    state = resolveMasteryOutcome(state, { receiptId: 'pip:2', pilotId: 'daredevil', nearMisses: 0, completed: true, risky: true })
    state = resolveMasteryOutcome(state, { receiptId: 'pip:3', pilotId: 'daredevil', completed: true, rivalBeaten: true })
    expect(getPilotMasteryView(state, 'daredevil').level).toBe(3)
    expect(state).not.toHaveProperty('stars')
  })

  it('round trips valid mastery and recovers only mastery from corrupt storage', () => {
    const mastery = resolveMasteryOutcome(createMasteryState(), { receiptId: 'one', pilotId: 'navigator', completed: true, destinationId: 'city' })
    expect(saveMastery(localStorage, mastery)).toBe(true)
    expect(loadMastery(localStorage)).toEqual({ mastery, recovered: false })

    localStorage.setItem('unrelated', 'keep')
    localStorage.setItem(JOURNEY_MASTERY_STORAGE_KEY, '{broken')
    expect(loadMastery(localStorage)).toEqual({ mastery: createMasteryState(), recovered: true })
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })

  it('preserves raw storage when the save version is unknown', () => {
    const raw = JSON.stringify({ version: 99, receipts: ['kept'], pilots: { navigator: { counters: { destinations: [] } } } })
    localStorage.setItem(JOURNEY_MASTERY_STORAGE_KEY, raw)

    expect(loadMastery(localStorage)).toEqual({ mastery: createMasteryState(), recovered: false })
    expect(localStorage.getItem(JOURNEY_MASTERY_STORAGE_KEY)).toBe(raw)
  })
})
