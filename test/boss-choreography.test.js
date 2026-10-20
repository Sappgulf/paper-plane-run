import { describe, expect, it } from 'vitest'
import {
  BOSS_CLAP_SECONDS,
  BOSS_LIP_MAX,
  BOSS_LIP_MIN,
  bossBladeTilt,
  bossChoreography,
  bossLipOffset,
} from '../src/game/boss-choreography.js'

const PHASES = ['warning', 'pressure', 'final-pass']

describe('boss choreography poses', () => {
  it('loads the mechanism fully open during the warning, and slowly', () => {
    const pose = bossChoreography({ phase: 'warning', pressure: 0 })
    expect(pose.open).toBe(1)
    expect(pose.clap).toBe(0)
    expect(pose.rate).toBeLessThan(1)
  })

  it('closes in as the pressure meter fills, and ticks faster the whole time', () => {
    const early = bossChoreography({ phase: 'pressure', pressure: 0.1 })
    const late = bossChoreography({ phase: 'pressure', pressure: 0.9 })
    expect(late.open).toBeLessThan(early.open)
    expect(late.rate).toBeGreaterThan(early.rate)
    expect(late.spin).toBeGreaterThan(early.spin)
  })

  it('snaps at the start of the final pass and then holds the closed pose', () => {
    const start = bossChoreography({ phase: 'final-pass', pressure: 1, sincePhase: 0 })
    const settled = bossChoreography({ phase: 'final-pass', pressure: 1, sincePhase: BOSS_CLAP_SECONDS + 1 })
    expect(start.clap).toBeCloseTo(1, 5)
    expect(settled.clap).toBe(0)
    expect(settled.open).toBe(0.3)
  })

  it('decays the snap smoothly across its duration rather than cutting it off', () => {
    const half = bossChoreography({ phase: 'final-pass', sincePhase: BOSS_CLAP_SECONDS / 2 })
    expect(half.clap).toBeGreaterThan(0.4)
    expect(half.clap).toBeLessThan(0.6)
  })

  it('holds a still pose under reduced motion, with no snap and no tick', () => {
    for (const phase of PHASES) {
      const pose = bossChoreography({ phase, pressure: 1, sincePhase: 0, motionAllowed: false })
      expect(pose).toEqual({ open: 0.5, rate: 0, clap: 0, spin: 0 })
    }
  })

  it('treats an unknown phase or junk pressure as the warning, never throwing', () => {
    expect(bossChoreography({ phase: 'mystery' }).open).toBe(1)
    expect(bossChoreography({ phase: 'pressure', pressure: Number.NaN }).open).toBe(1)
    expect(bossChoreography({ phase: 'pressure', pressure: 'lots' }).open).toBe(1)
    expect(bossChoreography({ phase: 'pressure', pressure: 7 }).open).toBeCloseTo(0.3, 5)
  })

  it('returns frozen poses so a shared result cannot be mutated', () => {
    expect(Object.isFrozen(bossChoreography({ phase: 'warning' }))).toBe(true)
  })
})

describe('boss lip clearance', () => {
  it('never lets a press reach inside the passage edge, for any phase or pressure', () => {
    for (const phase of PHASES) {
      for (let pressure = 0; pressure <= 1; pressure += 0.05) {
        for (let since = 0; since <= BOSS_CLAP_SECONDS; since += 0.05) {
          const offset = bossLipOffset(bossChoreography({ phase, pressure, sincePhase: since }))
          expect(offset).toBeGreaterThanOrEqual(BOSS_LIP_MIN)
          expect(offset).toBeLessThanOrEqual(BOSS_LIP_MAX)
        }
      }
    }
  })

  it('draws back when open and comes in when snapping', () => {
    const open = bossLipOffset({ open: 1, clap: 0 })
    const snapped = bossLipOffset({ open: 0.3, clap: 1 })
    expect(open).toBeGreaterThan(snapped)
  })

  it('falls back to the fully open lip for a missing or junk pose', () => {
    expect(bossLipOffset()).toBe(BOSS_LIP_MAX)
    expect(bossLipOffset({ open: Number.NaN, clap: 'x' })).toBe(BOSS_LIP_MAX)
  })
})

describe('boss blade tilt', () => {
  it('never exceeds the ±0.18 radian cap that keeps blades out of the hole', () => {
    for (const phase of PHASES) {
      for (let pressure = 0; pressure <= 1; pressure += 0.1) {
        for (let since = 0; since <= BOSS_CLAP_SECONDS; since += 0.05) {
          const tilt = bossBladeTilt(bossChoreography({ phase, pressure, sincePhase: since }))
          expect(Math.abs(tilt)).toBeLessThanOrEqual(0.18 + 1e-9)
        }
      }
    }
  })

  it('a reduced-motion pose still produces a finite, capped tilt', () => {
    const tilt = bossBladeTilt(bossChoreography({ motionAllowed: false }))
    expect(Number.isFinite(tilt)).toBe(true)
    expect(Math.abs(tilt)).toBeLessThanOrEqual(0.18)
  })
})
