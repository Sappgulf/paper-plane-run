import { describe, expect, test } from 'vitest'
import {
  BOSS_KINDS,
  bossKindForIndex,
  createBossEncounter,
  describeBossPhase,
  getBossPassage,
  getBossApproachSpeedScale,
  getBossClearReward,
  isInsideBossPassage,
  shouldClearForBossApproach,
} from '../src/game/boss-director.js'

describe('boss encounter director', () => {
  test.each(BOSS_KINDS)('runs warning, pressure, and final pass for %s', (kind) => {
    const boss = createBossEncounter({ kind, encounterSeed: 3 })
    expect(boss.snapshot()).toMatchObject({ phase: 'warning', pressure: 0, completed: false })
    expect(boss.step(1.3).phase).toBe('pressure')
    expect(boss.step(1.5)).toMatchObject({ phase: 'final-pass', pressure: 1 })
  })

  test('difficulty changes timing without changing the safe lane', () => {
    const easy = createBossEncounter({ kind: 'scissors', difficulty: 'easy', encounterSeed: 8 })
    const hard = createBossEncounter({ kind: 'scissors', difficulty: 'hard', encounterSeed: 8 })
    expect(easy.snapshot().safeLane).toBe(hard.snapshot().safeLane)
    expect(easy.snapshot().warningSeconds).toBeGreaterThan(hard.snapshot().warningSeconds)
    expect(easy.step(1.0).phase).toBe('warning')
    expect(hard.step(1.05).phase).toBe('pressure')
  })

  test('gives every difficulty a generous but progressively tighter passage', () => {
    const easy = getBossPassage({ difficulty: 'easy' })
    const normal = getBossPassage({ difficulty: 'normal' })
    const hard = getBossPassage({ difficulty: 'hard' })

    expect(easy.halfWidth).toBeGreaterThan(normal.halfWidth)
    expect(normal.halfWidth).toBeGreaterThan(hard.halfWidth)
    expect(easy.halfHeight).toBeGreaterThan(normal.halfHeight)
    expect(normal.halfHeight).toBeGreaterThan(hard.halfHeight)
    // Hard must stay flyable — never a knife-edge slot.
    expect(hard.halfWidth).toBeGreaterThanOrEqual(3.2)
    expect(hard.halfHeight).toBeGreaterThanOrEqual(3.1)
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

  test('slows the readable boss approach and clears lethal corridor hazards farther out', () => {
    expect(getBossApproachSpeedScale({ bossZ: 40 })).toBe(0.72)
    expect(getBossApproachSpeedScale({ bossZ: 70 })).toBe(0.78)
    expect(getBossApproachSpeedScale({ bossZ: 95 })).toBe(1)
    expect(getBossApproachSpeedScale({ bossZ: -4 })).toBe(1)

    expect(shouldClearForBossApproach({ type: 'bird', z: 150 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'scissors', z: 20 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'building', z: 120 })).toBe(true)
    expect(shouldClearForBossApproach({ type: 'star', z: 80 })).toBe(false)
    expect(shouldClearForBossApproach({ type: 'bird', z: -10 })).toBe(false)
  })

  test('cycles scissors, wind, and stapler deterministically', () => {
    expect(bossKindForIndex(0)).toBe('scissors')
    expect(bossKindForIndex(1)).toBe('wind')
    expect(bossKindForIndex(2)).toBe('stapler')
    expect(bossKindForIndex(3)).toBe('scissors')
  })

  test('is deterministic and keeps lanes in the supported range', () => {
    for (const kind of BOSS_KINDS) {
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

    const failed = createBossEncounter({ kind: 'stapler' })
    expect(failed.collide()).toMatchObject({ phase: 'failed', failed: true })
    expect(failed.pass()).toMatchObject({ phase: 'failed', completed: false })
  })

  test('clear rewards and phase copy cover all three bosses', () => {
    const reward = getBossClearReward()
    expect(reward.stars).toBe(5)
    expect(reward.recoveryMeters).toBeGreaterThanOrEqual(90)
    expect(reward.invulnSeconds).toBeGreaterThanOrEqual(0.5)
    expect(describeBossPhase({ kind: 'stapler', phase: 'warning', safeLane: 0 }).headline).toMatch(/Stapler/)
    expect(describeBossPhase({ kind: 'scissors', phase: 'final-pass', safeLane: 1 }).headline).toMatch(/Final cut/)
  })

  test('reduced motion changes only visual motion and colorblind mode adds shape cues', () => {
    const normal = createBossEncounter({ kind: 'wind', encounterSeed: 2 })
    const accessible = createBossEncounter({
      kind: 'stapler', encounterSeed: 2, reducedMotion: true, colorblind: true,
    })
    expect(normal.snapshot().motionAllowed).toBe(true)
    expect(accessible.snapshot().motionAllowed).toBe(false)
    expect(accessible.snapshot().shapeCue).toBe('horizontal-jaw-slot')
  })
})
