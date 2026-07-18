import { describe, expect, it } from 'vitest'
import {
  ENCOUNTER_STAGES,
  buildEncounterTimeline,
  getEncounterEventsAtDistance,
  resolveJourneyObjective,
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
    ['harbor', ['gust', 'shortcut-gate']],
    ['storm', ['visibility-pocket', 'reveal']],
    ['aurora', ['rival', 'boss-gate']],
    ['sunset', ['formation', 'shortcut-gate']],
    ['midnight', ['visibility-pocket', 'boss-gate']],
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

  it('resolves objectives at exact boundary values', () => {
    expect(resolveJourneyObjective({ id: 'gates', kind: 'shortcut-gates', target: 3 }, { shortcutGatesCleared: 2 }).completed).toBe(false)
    expect(resolveJourneyObjective({ id: 'gates', kind: 'shortcut-gates', target: 3 }, { shortcutGatesCleared: 3 }).completed).toBe(true)
    expect(resolveJourneyObjective({ id: 'shield', kind: 'shieldless', target: 1 }, { completed: true, shieldUsed: false }).completed).toBe(true)
    expect(resolveJourneyObjective({ id: 'shield', kind: 'shieldless', target: 1 }, { completed: true, shieldUsed: true }).completed).toBe(false)
  })
})
