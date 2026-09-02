import { describe, expect, test } from 'vitest'

import { ZONES } from '../src/zones.js'
import {
  CORRIDOR_HALF_X,
  FIELD_HALF_X,
  FIELD_INNER_X,
  FLAT_MAX_Y,
  FIELD_RECYCLE_Z,
  FIELD_SPAN_Z,
  PAVEMENT_OFFSET_X,
  ROAD_LANES_X,
  roadSegmentLength,
  GROUND_LIFE_ZONES,
  getGroundLifeSpecies,
  groundLifeCount,
  groundLifeSlotX,
  groundLifeSlotZ,
  groundLifeTransform,
  resolveGroundLifeBudget,
  wrapGroundLifeZ,
} from '../src/game/ground-life.js'

const everySpecies = Object.values(GROUND_LIFE_ZONES).flat()
const byId = (id) => everySpecies.find((s) => s.id === id)
const decal = (speciesDef) => ({ ...speciesDef, flat: true, align: 'decal' })

describe('ground life placement', () => {
  test('dresses every shipped zone with at least two species', () => {
    for (const zone of ZONES) {
      const list = GROUND_LIFE_ZONES[zone.id]
      expect(list, `zone ${zone.id} has no ground life`).toBeDefined()
      expect(list.length).toBeGreaterThanOrEqual(2)
    }
  })

  test('falls back to city scenery for an unknown zone', () => {
    expect(getGroundLifeSpecies('nope')).toBe(GROUND_LIFE_ZONES.city)
    expect(getGroundLifeSpecies('harbor')).toBe(GROUND_LIFE_ZONES.harbor)
  })

  test('never places an upright prop inside the flight corridor', () => {
    for (let index = 0; index < 200; index++) {
      for (const rand of [0, 0.25, 0.5, 0.75, 1]) {
        const x = groundLifeSlotX(index, rand)
        expect(Math.abs(x)).toBeGreaterThanOrEqual(FIELD_INNER_X)
        expect(Math.abs(x)).toBeLessThanOrEqual(FIELD_HALF_X)
      }
    }
  })

  test('lets flat decals cross the corridor, and only flat ones', () => {
    // Decals are the exception that dresses the near ground under the plane.
    const seams = byId('street-seams')
    const spans = []
    for (let index = 0; index < 40; index++) {
      for (const rand of [0, 0.2, 0.5, 1]) {
        const x = groundLifeSlotX(index, rand, seams)
        expect(Math.abs(x)).toBeLessThanOrEqual(FIELD_HALF_X)
        spans.push(Math.abs(x))
      }
    }
    expect(Math.min(...spans)).toBeLessThan(CORRIDOR_HALF_X)
  })

  test('lays traffic on the road lanes and walkers on the pavement beside them', () => {
    const traffic = byId('traffic')
    const walkers = byId('pedestrians')
    for (let index = 0; index < 24; index++) {
      const carX = Math.abs(groundLifeSlotX(index, 0.5, traffic))
      const walkX = Math.abs(groundLifeSlotX(index, 0.5, walkers))
      expect(ROAD_LANES_X).toContain(carX)
      expect(ROAD_LANES_X.map((lane) => lane + PAVEMENT_OFFSET_X)).toContain(walkX)
      // Pavement is always outside its own road, never in the traffic lane.
      expect(walkX).toBeGreaterThan(carX - PAVEMENT_OFFSET_X - 0.001)
    }
    // Both roads get used rather than everything piling onto the inner lane.
    const lanes = new Set(
      Array.from({ length: 24 }, (_, i) => Math.abs(groundLifeSlotX(i, 0.5, traffic))),
    )
    expect(lanes.size).toBe(ROAD_LANES_X.length)
  })

  test('tiles road segments end to end so the surface has no gaps', () => {
    const roads = byId('roads')
    const length = roadSegmentLength(roads.count)
    const perLane = Math.floor(roads.count / 2)
    expect(length * perLane).toBeCloseTo(FIELD_SPAN_Z)
    // Consecutive segments on one lane sit exactly one segment apart.
    const first = groundLifeSlotZ(0, roads.count, 0, roads)
    const second = groundLifeSlotZ(2, roads.count, 0, roads)
    expect(second - first).toBeCloseTo(length)
  })

  test('keeps the road surface at full density even on a thinned field', () => {
    // Thinning a continuous ribbon would leave holes in the road, so roads opt
    // out of the count budget that every scattered species obeys.
    const roads = byId('roads')
    const medium = resolveGroundLifeBudget({ level: 'medium' })
    expect(groundLifeCount(roads, medium)).toBe(roads.count)
    expect(groundLifeCount(byId('park-blocks'), medium))
      .toBeLessThan(byId('park-blocks').count)
    // It is still dropped entirely when scenery is switched off.
    expect(groundLifeCount(roads, resolveGroundLifeBudget({ level: 'low' }))).toBe(0)
  })

  test('anything allowed under the flight path lies flat on the ground', () => {
    // This is the safety argument for the exception above: a decal below the
    // plane's own floor (MIN_Y 2.2) cannot read as an obstacle.
    const flat = everySpecies.filter((s) => s.flat)
    expect(flat.length).toBeGreaterThan(0)
    for (const speciesDef of flat) {
      expect(speciesDef.y).toBeLessThanOrEqual(FLAT_MAX_Y)
      expect(speciesDef.motion).toBe('none')
    }
    // Conversely, every upright species must stand clear of the corridor.
    for (const speciesDef of everySpecies.filter((s) => !s.flat)) {
      expect(Math.abs(groundLifeSlotX(0, 0, false))).toBeGreaterThanOrEqual(FIELD_INNER_X)
    }
  })

  test('drifting props cannot wander into the corridor at full motion', () => {
    const drifters = everySpecies.filter((s) => s.motion === 'drift')
    for (const speciesDef of drifters) {
      // Innermost slot (rand 0) swung fully inward must still clear the lanes
      // hazards actually spawn on, or scenery starts reading as an obstacle.
      const closest = Math.abs(groundLifeSlotX(0, 0, speciesDef)) - speciesDef.amplitude
      expect(closest).toBeGreaterThanOrEqual(CORRIDOR_HALF_X - 5)
      expect(closest).toBeGreaterThan(0)
    }
  })

  test('alternates flanks so a thinned field still dresses both sides', () => {
    expect(groundLifeSlotX(0, 0.5)).toBeGreaterThan(0)
    expect(groundLifeSlotX(1, 0.5)).toBeLessThan(0)
    const left = [0, 1, 2, 3, 4, 5].filter((i) => groundLifeSlotX(i, 0.5) < 0)
    expect(left).toHaveLength(3)
  })

  test('spreads slots down the field and recycles them behind the camera', () => {
    const count = 10
    const zs = Array.from({ length: count }, (_, i) => groundLifeSlotZ(i, count))
    expect(new Set(zs).size).toBe(count)
    for (const z of zs) {
      expect(z).toBeGreaterThanOrEqual(FIELD_RECYCLE_Z)
      expect(z).toBeLessThan(FIELD_RECYCLE_Z + FIELD_SPAN_Z)
    }
    expect(groundLifeSlotZ(0, 0)).toBe(FIELD_RECYCLE_Z)
  })

  test('wraps past the camera without leaving a gap, even on a long stall frame', () => {
    expect(wrapGroundLifeZ(FIELD_RECYCLE_Z + 1, 5)).toBeCloseTo(FIELD_RECYCLE_Z + FIELD_SPAN_Z - 4)
    // A tab-restore frame can hand us a move far larger than the field.
    const recovered = wrapGroundLifeZ(0, FIELD_SPAN_Z * 3.5)
    expect(recovered).toBeGreaterThanOrEqual(FIELD_RECYCLE_Z)
    expect(recovered).toBeLessThan(FIELD_RECYCLE_Z + FIELD_SPAN_Z)
  })
})

describe('ground life budget', () => {
  test('drops scenery entirely on low-power and low-quality devices', () => {
    for (const input of [
      { level: 'low' },
      { lowPower: true },
      { secondaryEffects: false },
    ]) {
      const budget = resolveGroundLifeBudget(input)
      expect(budget.enabled).toBe(false)
      expect(groundLifeCount(GROUND_LIFE_ZONES.city[0], budget)).toBe(0)
    }
  })

  test('halves the field at medium quality and keeps it whole at high', () => {
    const scatter = byId('park-blocks')
    expect(groundLifeCount(scatter, resolveGroundLifeBudget({ level: 'medium' })))
      .toBe(Math.floor(scatter.count * 0.42))
    expect(groundLifeCount(scatter, resolveGroundLifeBudget({ level: 'high' })))
      .toBe(Math.floor(scatter.count * 0.62))
  })

  test('reduced motion keeps the scenery but stops it moving', () => {
    const budget = resolveGroundLifeBudget({ level: 'high', reducedMotion: true })
    expect(budget.enabled).toBe(true)
    expect(budget.countScale).toBe(0.62)
    expect(budget.motionScale).toBe(0)
    const still = groundLifeTransform(byId('pedestrians'), 0.3, 12, budget.motionScale)
    expect(still.offsetX).toBe(0)
    expect(still.offsetY).toBe(0)
    expect(still.scale).toBe(1)
  })
})

describe('ground life motion', () => {
  test('is a pure function of clock and phase, not accumulated state', () => {
    const reed = GROUND_LIFE_ZONES.sunset[0]
    expect(groundLifeTransform(reed, 0.7, 3.25)).toEqual(groundLifeTransform(reed, 0.7, 3.25))
  })

  test('stays inside the amplitude each species declares', () => {
    for (const speciesDef of everySpecies) {
      for (let step = 0; step < 60; step++) {
        const t = groundLifeTransform(speciesDef, step * 0.37, step * 0.21)
        expect(Math.abs(t.offsetX)).toBeLessThanOrEqual(speciesDef.amplitude)
        expect(Math.abs(t.offsetY)).toBeLessThanOrEqual(speciesDef.amplitude)
        expect(t.scale).toBeGreaterThan(0)
        expect(Number.isFinite(t.rotation)).toBe(true)
      }
    }
  })

  test('gives each motion kind its own signature', () => {
    const byMotion = (motion) => everySpecies.find((s) => s.motion === motion)
    expect(groundLifeTransform(byMotion('bob'), 0, Math.PI / 2).offsetY).not.toBe(0)
    expect(groundLifeTransform(byMotion('sway'), 0, Math.PI / 2).rotation).not.toBe(0)
    expect(groundLifeTransform(byMotion('none'), 0, Math.PI / 2))
      .toEqual({ offsetX: 0, offsetY: 0, rotation: 0, scale: 1 })
    expect(groundLifeTransform(byMotion('pulse'), 0, Math.PI / 2).scale).not.toBe(1)
    // Spin advances monotonically through a turn rather than oscillating.
    const spin = byMotion('spin')
    expect(groundLifeTransform(spin, 0, 0.5).rotation)
      .toBeLessThan(groundLifeTransform(spin, 0, 1).rotation)
  })

  test('phase separates instances so a field never moves in lockstep', () => {
    const flags = byId('rooftop-flags')
    const a = groundLifeTransform(flags, 0, 2)
    const b = groundLifeTransform(flags, 1.1, 2)
    expect(a.rotation).not.toBeCloseTo(b.rotation)
  })
})
