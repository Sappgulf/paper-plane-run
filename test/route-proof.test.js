import { describe, expect, it } from 'vitest'
import {
  buildJourneyRouteMatrix,
  buildJourneyRouteProof,
  createDeterministicJourneyRoute,
} from '../src/game/route-proof.js'
import { JOURNEY_ROUTE_DISTANCE } from '../src/journey-encounters.js'

describe('deterministic Journey route proof', () => {
  it('recreates the same route configuration and fingerprint for a seed', () => {
    const options = { seed: 4242, chapter: 1, stepIndex: 1, risk: 'safe' }
    const first = createDeterministicJourneyRoute(options)
    const second = createDeterministicJourneyRoute(options)
    const firstProof = buildJourneyRouteProof(options)
    const secondProof = buildJourneyRouteProof(options)

    expect(first.config).toEqual(second.config)
    expect(first.route.id).toBe(second.route.id)
    expect(firstProof.fingerprint).toBe(secondProof.fingerprint)
    expect(firstProof.seed).toBe(4242)
    expect(firstProof.encounterSeed).toBe(first.config.encounterSeed)
  })

  it('keeps every authored beat, objective, passage, and boss recovery window playable', () => {
    const matrix = buildJourneyRouteMatrix({
      seeds: [1, 42, 4242, 20260730, 2147483647],
    })

    expect(matrix).toHaveLength(80)
    expect(matrix.every((proof) => proof.allChecksPass)).toBe(true)
    expect(matrix.every((proof) => proof.timeline.events.every((event) => event.distance < proof.targetDistance))).toBe(true)
    expect(matrix.every((proof) => proof.targetDistance === (
      proof.routeId.includes('finale') || proof.routeId.includes('aurora') || proof.routeId.includes('desk-finale')
        ? JOURNEY_ROUTE_DISTANCE.finale
        : JOURNEY_ROUTE_DISTANCE.standard
    ))).toBe(true)
  })

  it('turns modifier promises into reachable authored beats', () => {
    const matrix = buildJourneyRouteMatrix({ seeds: [20260730] })
    const shortcutRoute = matrix.find((proof) => proof.modifier === 'shortcut-gates')
    const formationRoute = matrix.find((proof) => proof.modifier === 'moving-formation')

    expect(shortcutRoute.objective).toMatchObject({ kind: 'shortcut-gates', target: 3 })
    expect(shortcutRoute.shortcutGateBudget).toBeGreaterThanOrEqual(shortcutRoute.objective.target)
    expect(shortcutRoute.timeline.events.filter((event) => event.type === 'shortcut-gate')).toHaveLength(2)
    expect(formationRoute.objective).toMatchObject({ kind: 'near-miss', target: 4 })
    expect(formationRoute.nearMissWindows).toBeGreaterThanOrEqual(formationRoute.objective.target)
  })
})
