import { describe, expect, test } from 'vitest'
import {
  buildDeathStressReport,
  DEFAULT_DEATH_STRESS_SEED_COUNT,
  DEATH_STRESS_WAVE_TRIALS,
} from '../src/game/death-stress.js'

describe('deterministic death stress harness', () => {
  test('replays 100 seeds across every difficulty without sealing the flight path', () => {
    const report = buildDeathStressReport()

    expect(report.seedCount).toBe(DEFAULT_DEATH_STRESS_SEED_COUNT)
    expect(report.difficulties).toEqual(['easy', 'normal', 'hard'])
    expect(report.checks).toMatchObject({
      seedsCovered: 100,
      difficultyProfilesCovered: 3,
      failureCount: 0,
    })
    expect(report.metrics.buildingWaves).toBeGreaterThan(100)
    expect(report.metrics.airHazards).toBeGreaterThan(100)
    const recoveryWaves = Math.floor((DEATH_STRESS_WAVE_TRIALS - 1) / 9)
    const nonRecoveryWaves = DEATH_STRESS_WAVE_TRIALS - recoveryWaves
    expect(report.metrics.bossPassages).toBe(100 * 3 * nonRecoveryWaves * 3)
    expect(report.allChecksPass).toBe(true)
  })

  test('is stable for a narrowed replay window', () => {
    const options = { seedStart: 42, seedCount: 4 }
    expect(buildDeathStressReport(options)).toEqual(buildDeathStressReport(options))
  })
})
