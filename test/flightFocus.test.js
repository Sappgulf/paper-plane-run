import { describe, expect, test } from 'vitest'
import {
  pickFlightFocus,
  shouldTelegraphHazard,
} from '../src/game/flight-focus.js'

describe('flight focus lane scoring', () => {
  test('names the in-lane star over a closer-in-Z building off to the side', () => {
    const picked = pickFlightFocus([
      { type: 'building', x: 12, y: 8, z: 18 },
      { type: 'star', x: 0.4, y: 10, z: 24 },
    ], { planeX: 0, planeY: 10 })
    expect(picked).toMatchObject({ cue: 'star', label: 'STAR LINE', type: 'star' })
  })

  test('still warns for a boss even if a star is slightly closer', () => {
    const picked = pickFlightFocus([
      { type: 'star', x: 0, y: 10, z: 22 },
      { type: 'boss', x: 1, y: 10, z: 26 },
    ], { planeX: 0, planeY: 10 })
    expect(picked.label).toBe('GATE AHEAD')
  })

  test('first-flight teaching ignores hazards and names the star line', () => {
    const picked = pickFlightFocus([
      { type: 'scissors', x: 0, y: 10, z: 16 },
      { type: 'star', x: 1, y: 10, z: 30 },
    ], { planeX: 0, planeY: 10, teachStars: true })
    expect(picked.type).toBe('star')
  })

  test('returns FLY when the corridor ahead is empty', () => {
    expect(pickFlightFocus([], { planeX: 0, planeY: 10 })).toMatchObject({
      cue: 'clear',
      label: 'FLY',
    })
  })
})

describe('hazard telegraph lane filter', () => {
  test('pings scissors in the flight corridor and ignores the far flank', () => {
    expect(shouldTelegraphHazard({ type: 'scissors', z: 20, dx: 2 })).toBe(true)
    expect(shouldTelegraphHazard({ type: 'scissors', z: 20, dx: 14 })).toBe(false)
  })

  test('always telegraphs a boss gate in range', () => {
    expect(shouldTelegraphHazard({ type: 'boss', z: 22, dx: 16 })).toBe(true)
    expect(shouldTelegraphHazard({ type: 'boss', z: 50, dx: 0 })).toBe(false)
  })

  test('does not re-ping an already warned hazard', () => {
    expect(shouldTelegraphHazard({ type: 'scissors', z: 20, dx: 0, alreadyWarned: true })).toBe(false)
  })
})
