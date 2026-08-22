import { describe, expect, test } from 'vitest'
import {
  FINAL_ZONE_SPAN,
  ZONES,
  ZONE_LOOP_SPAN,
  cyclicZoneAt,
  cyclicZoneProgress,
  zoneAt,
} from '../src/zones.js'

const LAST = ZONES[ZONES.length - 1]

describe('cyclicZoneAt', () => {
  test('matches the authored table for the whole first lap', () => {
    for (let distance = 0; distance < ZONE_LOOP_SPAN; distance += 37) {
      expect(cyclicZoneAt(distance)).toMatchObject({ zone: zoneAt(distance), lap: 0 })
    }
  })

  test('folds back to Paper City instead of freezing on the final zone', () => {
    expect(zoneAt(ZONE_LOOP_SPAN).id).toBe(LAST.id)
    expect(cyclicZoneAt(ZONE_LOOP_SPAN)).toMatchObject({ zone: ZONES[0], lap: 1, localDistance: 0 })
  })

  test('keeps the sky turning over deep into an endless run', () => {
    const seen = new Set()
    for (let distance = ZONE_LOOP_SPAN; distance < ZONE_LOOP_SPAN * 2; distance += 25) {
      seen.add(cyclicZoneAt(distance).zone.id)
    }
    expect([...seen].sort()).toEqual(ZONES.map((z) => z.id).sort())
  })

  test('counts laps and repeats the same zone order every lap', () => {
    for (const lap of [0, 1, 2, 7]) {
      for (const zone of ZONES) {
        const at = cyclicZoneAt(lap * ZONE_LOOP_SPAN + zone.from)
        expect(at.zone.id).toBe(zone.id)
        expect(at.lap).toBe(lap)
      }
    }
  })

  test('gives the final zone its authored span before the fold', () => {
    expect(ZONE_LOOP_SPAN).toBe(LAST.from + FINAL_ZONE_SPAN)
    expect(cyclicZoneAt(ZONE_LOOP_SPAN - 1).zone.id).toBe(LAST.id)
  })

  test('clamps junk and negative distances to the opening zone', () => {
    for (const distance of [-1, -50_000, NaN, undefined, null, 'far']) {
      expect(cyclicZoneAt(distance)).toMatchObject({ zone: ZONES[0], lap: 0 })
    }
  })
})

describe('cyclicZoneProgress', () => {
  test('counts down to the next zone mid-lap', () => {
    const midCity = ZONES[1].from / 2
    expect(cyclicZoneProgress(midCity)).toMatchObject({
      zone: ZONES[0],
      next: ZONES[1],
      lap: 0,
      nextAt: ZONES[1].from,
    })
    expect(cyclicZoneProgress(midCity).t).toBeCloseTo(0.5, 5)
    expect(cyclicZoneProgress(midCity).remain).toBeCloseTo(ZONES[1].from - midCity)
  })

  test('remain is measured in the same space as the distance you pass in', () => {
    const offset = ZONES[1].from
    const progress = cyclicZoneProgress(offset)
    expect(progress.zone.id).toBe('harbor')
    expect(progress.remain).toBe(ZONES[2].from - offset)
  })

  test('wraps the countdown to the next lap instead of reporting no next zone', () => {
    const progress = cyclicZoneProgress(LAST.from + FINAL_ZONE_SPAN / 2)
    expect(progress.zone.id).toBe(LAST.id)
    expect(progress.next.id).toBe(ZONES[0].id)
    expect(progress.nextAt).toBe(ZONE_LOOP_SPAN)
    expect(progress.t).toBeCloseTo(0.5, 5)
  })

  test('always points at a strictly future boundary', () => {
    for (let distance = 0; distance < ZONE_LOOP_SPAN * 3; distance += 53) {
      const { nextAt, t } = cyclicZoneProgress(distance)
      expect(nextAt).toBeGreaterThan(distance)
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(1)
    }
  })
})
