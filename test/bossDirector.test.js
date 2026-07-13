import { describe, expect, test } from 'vitest'
import { createBossEncounter } from '../src/game/boss-director.js'

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
    })
    expect(accessible.step(2)).toMatchObject({ phase: normal.step(2).phase, safeLane: normal.snapshot().safeLane })
  })
})
