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

  test('targets the actual boss opening instead of the ground-level assembly origin', () => {
    const boss = { type:'boss', mesh:{ position:{ x:2, y:0, z:22 }, userData:{ gapY:11 } } }
    expect(pickFlightFocus([boss], { planeX:0, planeY:10 })).toMatchObject({
      cue:'hazard', label:'GATE AHEAD', target:{ x:2, y:11, z:22 },
    })
  })

  test('an imminent in-lane hazard overrides the early star lesson', () => {
    const picked = pickFlightFocus([
      { type: 'scissors', x: 0, y: 10, z: 16 },
      { type: 'star', x: 1, y: 10, z: 30 },
    ], { planeX: 0, planeY: 10, teachStars: true })
    expect(picked).toMatchObject({ type:'scissors', label:'DODGE · SCISSORS' })
  })

  test('the early lesson keeps its star cue when danger is distant or off the flight line', () => {
    const star = { type:'star', x:0, y:10, z:30 }
    for (const hazard of [
      { type:'scissors', x:0, y:10, z:40 },
      { type:'bird', flyerId:'hawk', x:9, y:10, z:14 },
      { type:'bird', flyerId:'hawk', x:0, y:18, z:14 },
    ]) expect(pickFlightFocus([hazard, star], {planeX:0, planeY:10, teachStars:true}).type).toBe('star')
  })

  test('returns FLY when the corridor ahead is empty', () => {
    expect(pickFlightFocus([], { planeX: 0, planeY: 10 })).toMatchObject({
      cue: 'clear',
      label: 'FLY',
    })
  })

  test('names lift columns in reach and ignores an updraft across the corridor', () => {
    expect(pickFlightFocus([{ type: 'updraft',x: 1,y: 5.2,z: 22 }],{planeX:0,planeY:5}))
      .toMatchObject({ cue: 'lift',label: 'UPDRAFT · LIFT' })
    expect(pickFlightFocus([{ type: 'updraft',x: 1,y: 5.2,z: 22 }],{planeX:0,planeY:5,teachStars:true}))
      .toMatchObject({ cue: 'lift',label: 'UPDRAFT · LIFT' })
    expect(pickFlightFocus([{ type: 'updraft',x: 12,y: 5.2,z: 22 }],{planeX:0,planeY:5}).target).toBeNull()
  })

  test('identifies the approaching power by its actual effect', () => {
    for (const [kind,label] of [['boost','BOOST · SPEED'],['shield','SHIELD · PROTECT'],['magnet','MAGNET · STARS']]) {
      expect(pickFlightFocus([{type:'power',kind,x:0,y:10,z:24}]).label).toBe(label)
    }
  })

  test('names approaching hazards so their silhouettes are easier to identify', () => {
    expect(pickFlightFocus([{type:'bird',flyerId:'hawk',x:0,y:10,z:12}]).label).toBe('DODGE · HAWK')
    expect(pickFlightFocus([{type:'scissors',x:0,y:10,z:12}]).label).toBe('DODGE · SCISSORS')
    expect(pickFlightFocus([{type:'building',x:0,y:10,z:12}]).label).toBe('DODGE · BUILDING')
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
