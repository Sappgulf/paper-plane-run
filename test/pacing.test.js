import { describe, expect, test } from 'vitest'
import { createPacingWave, getWaveSpacing, normalizeControlAxes } from '../src/game/pacing.js'

describe('existing flight pacing', () => {
  test('always leaves a valid collectible lane outside hazard lanes', () => {
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      for (let index = 0; index < 40; index += 1) {
        const wave = createPacingWave({ index, difficultyId })
        expect([-1, 0, 1]).toContain(wave.starLane)
        expect(wave.hazardLanes).not.toContain(wave.starLane)
        expect(new Set(wave.hazardLanes).size).toBe(wave.hazardLanes.length)
      }
    }
  })

  test('post-boss recovery is hazard-free and more spacious', () => {
    const normal = createPacingWave({ index: 8, difficultyId: 'normal' })
    const recovery = createPacingWave({ index: 8, difficultyId: 'normal', afterBoss: true })
    expect(recovery).toMatchObject({ kind: 'recovery', hazardLanes: [] })
    expect(recovery.spacing).toBeGreaterThan(normal.spacing)
  })

  test('difficulty compresses spacing coherently without unsafe overlap', () => {
    expect(getWaveSpacing({ difficultyId: 'easy' })).toBeGreaterThan(getWaveSpacing({ difficultyId: 'normal' }))
    expect(getWaveSpacing({ difficultyId: 'normal' })).toBeGreaterThan(getWaveSpacing({ difficultyId: 'hard' }))
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      expect(getWaveSpacing({ difficultyId, distance: 5000 })).toBeGreaterThanOrEqual(14)
    }
  })

  test.each(['keyboard', 'stick', 'pointer', 'touch'])('%s uses the same bounded axis contract', () => {
    expect(normalizeControlAxes({ x: 2, y: -2 })).toEqual({ x: 1, y: -1 })
    expect(normalizeControlAxes({ x: 0.4, y: -0.6, invertX: true, invertY: true }))
      .toEqual({ x: -0.4, y: 0.6 })
  })
})
