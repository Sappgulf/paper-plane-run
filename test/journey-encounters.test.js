import { describe, expect, it } from 'vitest'
import {
  ENCOUNTER_STAGES,
  buildEncounterTimeline,
  getEncounterEventsAtDistance,
  resolveJourneyObjective,
  journeyGauntletSpec,
} from '../src/journey-encounters.js'

describe('Journey encounter director', () => {
  it('builds ordered deterministic arrival, escalation, and signature events', () => {
    const config = { seed: 42, zone: 'harbor', modifier: 'shortcut-gates', routeId: 'harbor-risky', finale: false }
    const a = buildEncounterTimeline(config)
    const b = buildEncounterTimeline(config)
    expect(a).toEqual(b)
    expect(a.events.map((event) => event.stage)).toEqual(expect.arrayContaining(ENCOUNTER_STAGES))
    expect(a.events.every((event, index) => index === 0 || event.distance >= a.events[index - 1].distance)).toBe(true)
  })

  it.each([
    ['city', ['formation', 'rooftop-gap']],
    ['harbor', ['gust', 'formation']],
    ['storm', ['visibility-pocket', 'reveal']],
    ['aurora', ['rival', 'formation']],
    ['sunset', ['formation']],
    ['midnight', ['visibility-pocket', 'formation']],
  ])('authors recognizable %s encounters', (zone, types) => {
    const timeline = buildEncounterTimeline({ seed: 7, zone, modifier: 'crosswind', routeId: `${zone}-route`, finale: zone === 'aurora' || zone === 'midnight' })
    expect(timeline.events.map((event) => event.type)).toEqual(expect.arrayContaining(types))
    expect(timeline.events.every((event) => event.distance >= 40 && event.distance <= 460)).toBe(true)
    expect(timeline.events.flatMap((event) => event.lanes || []).every((lane) => lane >= -1 && lane <= 1)).toBe(true)
  })

  it('returns only events crossed during a distance update', () => {
    const timeline = buildEncounterTimeline({ seed: 4, zone: 'city', modifier: 'moving-formation', routeId: 'city-safe' })
    const event = timeline.events[0]
    expect(getEncounterEventsAtDistance(timeline, event.distance - 1, event.distance)).toEqual([event])
    expect(getEncounterEventsAtDistance(timeline, event.distance, event.distance + 1)).toEqual([])
  })

  it('preserves authored lane choices across seeded variations', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const events = buildEncounterTimeline({ seed, zone: 'city', routeId: 'city-safe' }).events
      expect(events.map(event => event.lanes.length)).toEqual([3, 1, 2])
      expect(events.every(event => new Set(event.lanes).size === event.lanes.length)).toBe(true)
    }
  })

  it('gives route beats distinct patterns and bounded, authored flight lines', () => {
    expect(journeyGauntletSpec({type: 'rooftop-gap', lanes: [-1], params: {width: 1.2}}, 0, 8))
      .toEqual({gapCenter: -4, pattern: 'scissors', widthMultiplier: 1.2})
    expect(journeyGauntletSpec({type: 'formation', lanes: [1]}, -4, 8))
      .toEqual({gapCenter: 1.7999999999999998, pattern: 'flyers', widthMultiplier: 1.15})
  })

  it.each(['city', 'harbor', 'storm', 'sunset', 'midnight'])(
    'replaces %s shortcut rings with formations and a close-call objective', (zone) => {
      const timeline = buildEncounterTimeline({ seed: 42, zone, modifier: 'shortcut-gates', routeId: `${zone}-shortcut`, finale: false })
      expect(timeline.objective).toMatchObject({ kind: 'near-miss', target: 3 })
      expect(timeline.events.filter((event) => event.type === 'formation').length).toBeGreaterThanOrEqual(2)
      expect(timeline.events.some((event) => event.type === 'shortcut-gate' || event.type === 'boss-gate')).toBe(false)
    },
  )

  it('resolves objectives at exact boundary values', () => {
    expect(resolveJourneyObjective({ id: 'gates', kind: 'shortcut-gates', target: 3 }, { shortcutGatesCleared: 2 }).completed).toBe(false)
    expect(resolveJourneyObjective({ id: 'gates', kind: 'shortcut-gates', target: 3 }, { shortcutGatesCleared: 3 }).completed).toBe(true)
    expect(resolveJourneyObjective({ id: 'close', kind: 'near-miss', target: 3 }, { nearMisses: 2 }).completed).toBe(false)
    expect(resolveJourneyObjective({ id: 'close', kind: 'near-miss', target: 3 }, { nearMisses: 3 }).completed).toBe(true)
    expect(resolveJourneyObjective({ id: 'shield', kind: 'shieldless', target: 1 }, { completed: true, shieldUsed: false }).completed).toBe(true)
    expect(resolveJourneyObjective({ id: 'shield', kind: 'shieldless', target: 1 }, { completed: true, shieldUsed: true }).completed).toBe(false)
  })
})
