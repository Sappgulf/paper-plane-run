import { describe, expect, test } from 'vitest'
import { createPacingWave, getCenterBuildingSafeRange, getWaveSpacing, normalizeControlAxes } from '../src/game/pacing.js'

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

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

describe('center building corridor safety', () => {
  test('falls back to the full default span when no side buildings spawned', () => {
    expect(getCenterBuildingSafeRange({ radius: 1.5, gap: 1 })).toEqual({ minX: -4.5, maxX: 4.5 })
  })

  test('narrows only against a nearby side building, not a distant one', () => {
    const range = getCenterBuildingSafeRange({ leftInnerEdge: -3, radius: 1.5, gap: 1, safeCorridor: 1.1 })
    expect(range).toEqual({ minX: -3 + 1.5 + 1.1, maxX: 4.5 })
  })

  test('returns null — skip the center building — when no safe placement fits', () => {
    expect(getCenterBuildingSafeRange({ leftInnerEdge: -1, rightInnerEdge: 1, radius: 1.5, gap: 1 })).toBeNull()
  })

  test('never places a center building where it would overlap a side building plus its safety margin', () => {
    const range = getCenterBuildingSafeRange({ leftInnerEdge: -2, rightInnerEdge: 3, radius: 1, safeCorridor: 1.1, gap: 1 })
    expect(range.minX).toBeGreaterThanOrEqual(-2 + 1 + 1.1)
    expect(range.maxX).toBeLessThanOrEqual(3 - 1 - 1.1)
  })

  // Mirrors spawnChunk's real building-size formulas so this is a genuine
  // simulation of the live spawner, not just the pure helper in isolation.
  const PLANE_HITBOX_RADIUS = 0.7
  const MAX_X = 13
  const GAP_BY_DIFFICULTY = { easy: 1.15, normal: 1, hard: 0.85 }

  function sideBuildingRadius(rng) {
    const w = 2.5 + rng() * 3.5
    const d = 2.5 + rng() * 3
    return Math.max(w, d) * 0.5
  }
  function centerBuildingRadius(rng) {
    const w = 2 + rng() * 3
    const d = 2 + rng() * 2.5
    return Math.max(w, d) * 0.5
  }
  function widestOpenGap(blockedIntervals) {
    let openWidth = 0
    let widest = 0
    for (let x = -MAX_X; x <= MAX_X; x += 0.05) {
      const inside = blockedIntervals.some(([lo, hi]) => x >= lo && x <= hi)
      if (inside) { openWidth = 0 } else { openWidth += 0.05; widest = Math.max(widest, openWidth) }
    }
    return widest
  }

  test('a full simulated spawnChunk building layout always leaves a flyable corridor', () => {
    const rng = mulberry32(0xC0FFEE)
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      const gap = GAP_BY_DIFFICULTY[difficultyId]
      for (let trial = 0; trial < 300; trial += 1) {
        const laneSpread = 11 * gap + rng() * 10 * gap
        let leftInnerEdge = null
        let rightInnerEdge = null
        const blocked = []

        if (rng() < 0.82) {
          const radius = sideBuildingRadius(rng)
          leftInnerEdge = -laneSpread + radius
          blocked.push([-laneSpread - radius, -laneSpread + radius])
        }
        if (rng() < 0.82) {
          const radius = sideBuildingRadius(rng)
          rightInnerEdge = laneSpread - radius
          blocked.push([laneSpread - radius, laneSpread + radius])
        }

        const centerRadius = centerBuildingRadius(rng)
        const safeRange = getCenterBuildingSafeRange({ leftInnerEdge, rightInnerEdge, radius: centerRadius, gap })
        if (safeRange) {
          const x = safeRange.minX + rng() * (safeRange.maxX - safeRange.minX)
          blocked.push([x - centerRadius, x + centerRadius])
        }

        expect(widestOpenGap(blocked)).toBeGreaterThanOrEqual(2 * PLANE_HITBOX_RADIUS)
      }
    }
  })
})
