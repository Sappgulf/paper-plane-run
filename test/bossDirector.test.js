import { describe, expect, test } from 'vitest'
import {
  createBossEncounter,
  describeBossPhase,
  getBossPassage,
  getBossApproachSpeedScale,
  isInsideBossPassage,
  shouldClearForBossApproach,
} from '../src/game/boss-director.js'

describe('boss encounter director', () => {
  test.each(['scissors', 'wind'])('runs warning, pressure, and final pass for %s', (kind) => {
    const boss = createBossEncounter({ kind, encounterSeed: 3 })
    expect(boss.snapshot()).toMatchObject({ phase: 'warning', pressure: 0, completed: false })
    expect(boss.step(1.1).phase).toBe('pressure')
    expect(boss.step(1.3)).toMatchObject({ phase: 'final-pass', pressure: 1 })
  })

  test('difficulty changes timing without changing the safe lane', () => {
    const easy = createBossEncounter({ kind: 'scissors', difficulty: 'easy', encounterSeed: 8 })
    const hard = createBossEncounter({ kind: 'scissors', difficulty: 'hard', encounterSeed: 8 })
    expect(easy.snapshot().safeLane).toBe(hard.snapshot().safeLane)
    expect(easy.snapshot().warningSeconds).toBeGreaterThan(hard.snapshot().warningSeconds)
    expect(easy.step(0.9).phase).toBe('warning')
    expect(hard.step(0.9).phase).toBe('pressure')
  })

  test('gives every difficulty a generous but progressively tighter passage', () => {
    const easy = getBossPassage({ difficulty: 'easy' })
    const normal = getBossPassage({ difficulty: 'normal' })
    const hard = getBossPassage({ difficulty: 'hard' })

    expect(easy.halfWidth).toBeGreaterThan(normal.halfWidth)
    expect(normal.halfWidth).toBeGreaterThan(hard.halfWidth)
    expect(easy.halfHeight).toBeGreaterThan(normal.halfHeight)
    expect(normal.halfHeight).toBeGreaterThan(hard.halfHeight)
    expect(hard).toMatchObject({ halfWidth: expect.any(Number), halfHeight: expect.any(Number) })
    expect(hard.halfWidth).toBeGreaterThan(2.6)
    expect(hard.halfHeight).toBeGreaterThan(2.5)
  })

  test('uses the same passage contract for a centered clear, forgiving edge, and miss', () => {
    const passage = getBossPassage({ difficulty: 'normal' })

    expect(isInsideBossPassage({ playerX: 0, playerY: 14, bossX: 0, gapY: 14, passage })).toBe(true)
    expect(isInsideBossPassage({
      playerX: passage.halfWidth - 0.05,
      playerY: 14 + passage.halfHeight - 0.05,
      bossX: 0,
      gapY: 14,
      passage,
    })).toBe(true)
    expect(isInsideBossPassage({
      playerX: passage.halfWidth + 0.05,
      playerY: 14,
      bossX: 0,
      gapY: 14,
      passage,
    })).toBe(false)
  })

  test('slows only the readable boss approach and clears lethal corridor hazards', () => {
    expect(getBossApproachSpeedScale({ bossZ: 70 })).toBe(0.84)
    expect(getBossApproachSpeedScale({ bossZ: 95 })).toBe(1)
    expect(getBossApproachSpeedScale({ bossZ: -4 })).toBe(1)

    expect(shouldClearForBossApproach({ type: 'bird', z: 80 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'scissors', z: 20 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'building', z: 120 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'star', z: 80 })).toBe(false)
    expect(shouldClearForBossApproach({ type: 'bird', z: -10 })).toBe(false)
  })

  test('is deterministic and keeps lanes in the supported range', () => {
    for (const kind of ['scissors', 'wind']) {
      for (let seed = 0; seed < 8; seed += 1) {
        const a = createBossEncounter({ kind, encounterSeed: seed }).snapshot()
        const b = createBossEncounter({ kind, encounterSeed: seed }).snapshot()
        expect(a).toEqual(b)
        expect([-1, 0, 1]).toContain(a.safeLane)
        expect([6, 10, 14]).toContain(a.safeY)
      }
    }
  })

  test('safe passage and collision are terminal and idempotent', () => {
    const passed = createBossEncounter({ kind: 'wind' })
    expect(passed.pass()).toMatchObject({ phase: 'complete', completed: true })
    expect(passed.collide()).toMatchObject({ phase: 'complete', completed: true, failed: false })

    const failed = createBossEncounter({ kind: 'scissors' })
    expect(failed.collide()).toMatchObject({ phase: 'failed', failed: true })
    expect(failed.pass()).toMatchObject({ phase: 'failed', completed: false })
  })

  test('reduced motion changes only visual motion and colorblind mode adds shape cues', () => {
    const normal = createBossEncounter({ kind: 'wind', encounterSeed: 2 })
    const accessible = createBossEncounter({
      kind: 'wind', encounterSeed: 2, reducedMotion: true, colorblind: true,
    })
    expect(accessible.snapshot()).toMatchObject({
      safeLane: normal.snapshot().safeLane,
      warningSeconds: normal.snapshot().warningSeconds,
      motionAllowed: false,
      shapeCue: 'radial-vane-ring',
      passage: getBossPassage({ difficulty: 'normal' }),
    })
    expect(accessible.step(2)).toMatchObject({ phase: normal.step(2).phase, safeLane: normal.snapshot().safeLane })
  })

  test('turns boss phases into readable lane and impact choreography', () => {
    expect(describeBossPhase({ kind: 'scissors', phase: 'warning', safeLane: -1 })).toMatchObject({
      laneLabel: 'LOW',
      headline: 'Scissors opening · LOW lane',
      intensity: 0.35,
      hitStopSeconds: 0,
    })
    expect(describeBossPhase({ kind: 'wind', phase: 'final-pass', safeLane: 1 })).toMatchObject({
      laneLabel: 'HIGH',
      headline: 'Final gust · commit HIGH',
      intensity: 1,
      hitStopSeconds: 0.035,
    })
  })
})
