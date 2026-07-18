import { describe, expect, it } from 'vitest'
import {
  PILOTS,
  buildRunConfiguration,
  createJourney,
  getRouteChoices,
  resolveJourneyFlight,
  selectJourneyRoute,
} from '../src/journey.js'

describe('Living Journey domain', () => {
  it('creates deterministic safe and risky route choices', () => {
    const a = createJourney(42, 1000)
    const b = createJourney(42, 2000)
    expect(getRouteChoices(a)).toEqual(getRouteChoices(b))
    expect(getRouteChoices(a).map((route) => route.risk)).toEqual(['safe', 'risky'])
  })

  it('keeps a selected route stable for retries', () => {
    const journey = selectJourneyRoute(createJourney(7, 1000), getRouteChoices(createJourney(7, 1000))[1].id)
    expect(getRouteChoices(journey)).toEqual(getRouteChoices(journey))
    expect(buildRunConfiguration(journey).routeId).toBe(journey.selectedRouteId)
    expect(buildRunConfiguration(journey).attemptId).toBe(`${journey.id}:${journey.selectedRouteId}:1`)
    expect(buildRunConfiguration(journey).objective).toBeTruthy()
    expect(buildRunConfiguration(journey).encounterSeed).toBeTypeOf('number')
  })

  it('maps every Journey step to its matching gameplay zone', () => {
    let journey = createJourney(12, 1000)
    const zones = []
    for (let step = 0; step < 4; step += 1) {
      journey = selectJourneyRoute(journey, getRouteChoices(journey)[0].id)
      zones.push(buildRunConfiguration(journey).zone)
      journey = resolveJourneyFlight(journey, { completed: true, distance: 350, stars: 1 })
    }
    expect(zones).toEqual(['city', 'harbor', 'storm', 'aurora'])
  })

  it('maps Chapter 2 through sunset, midnight, storm, and midnight finale', () => {
    let journey = createJourney(12, 1000, 2)
    expect(journey.chapter).toBe(2)
    const zones = []
    for (let step = 0; step < 4; step += 1) {
      journey = selectJourneyRoute(journey, getRouteChoices(journey)[0].id)
      zones.push(buildRunConfiguration(journey).zone)
      journey = resolveJourneyFlight(journey, { completed: true, distance: 350, stars: 1 })
    }
    expect(zones).toEqual(['sunset', 'midnight', 'storm', 'midnight'])
    expect(journey.status).toBe('complete')
    expect(journey.postcard.chapter).toBe(2)
  })

  it('uses stapler finale modifiers on Chapter 2', () => {
    let journey = createJourney(5, 1000, 2)
    for (let step = 0; step < 3; step += 1) {
      journey = selectJourneyRoute(journey, getRouteChoices(journey)[0].id)
      journey = resolveJourneyFlight(journey, { completed: true, distance: 300, stars: 1 })
    }
    const choices = getRouteChoices(journey)
    expect(choices.map((route) => route.modifier)).toEqual(['stapler-finale', 'red-dart-stapler'])
  })

  it('preserves stars on crash but awards stamps only on completion', () => {
    const base = createJourney(10, 1000)
    const selected = selectJourneyRoute(base, getRouteChoices(base)[0].id)
    const crashed = resolveJourneyFlight(selected, { completed: false, distance: 120, stars: 4 })
    expect(crashed.stepIndex).toBe(0)
    expect(crashed.runStars).toBe(4)
    expect(crashed.earnedStampIds).toEqual([])
    expect(crashed.attemptNumber).toBe(2)

    const finished = resolveJourneyFlight(selected, { completed: true, distance: 500, stars: 8 })
    expect(finished.stepIndex).toBe(1)
    expect(finished.earnedStampIds).toHaveLength(1)
  })

  it('completes four flights and creates a postcard', () => {
    let journey = createJourney(99, 1000)
    for (let step = 0; step < 4; step += 1) {
      journey = selectJourneyRoute(journey, getRouteChoices(journey)[step % 2].id)
      journey = resolveJourneyFlight(journey, { completed: true, distance: 500 + step, stars: 5, rivalBeaten: step === 3 })
    }
    expect(journey.status).toBe('complete')
    expect(journey.postcard.routePath).toHaveLength(4)
    expect(journey.postcard.rivalBeaten).toBe(true)
  })

  it('ships Navigator immediately and locks Daredevil behind stamps', () => {
    expect(PILOTS.navigator.unlockedAt).toBe(0)
    expect(PILOTS.daredevil.unlockedAt).toBeGreaterThan(0)
  })
})
