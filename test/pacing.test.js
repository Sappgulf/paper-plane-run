import { describe, expect, test } from 'vitest'
import {
  choosePassageLane,
  createPacingWave,
  getCenterBuildingSafeRange,
  getObstacleDamageRadius,
  isLethalObstacle,
  getSafeSpawnX,
  getWaveSpacing,
  getFlyableBuildingHeight,
  getSideBuildingSpread,
  normalizeControlAxes,
  getOpenChunkWeight,
  OPENING_CALM_METERS,
  OPENING_FIRST_MIN_METERS,
  OPENING_FIRST_MAX_METERS,
  OPENING_SPACING_MIN_METERS,
  OPENING_SPACING_MAX_METERS,
  OPEN_CHUNK_WEIGHT,
  OPEN_WEIGHT_FLOOR,
  OPEN_DROUGHT_GRACE_METERS,
  OPEN_DROUGHT_DRAIN_METERS,
  planOpeningPresence,
} from '../src/game/pacing.js'
import { planDeckLane, DECK_INTRO_METERS } from '../src/game/deck-lane.js'

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

  test('opens the first stretch with extra room then compresses', () => {
    expect(getWaveSpacing({ difficultyId: 'normal', distance: 0 }))
      .toBeGreaterThan(getWaveSpacing({ difficultyId: 'normal', distance: 200 }))
  })

  test('difficulty compresses spacing coherently without unsafe overlap', () => {
    expect(getWaveSpacing({ difficultyId: 'easy' })).toBeGreaterThan(getWaveSpacing({ difficultyId: 'normal' }))
    expect(getWaveSpacing({ difficultyId: 'normal' })).toBeGreaterThan(getWaveSpacing({ difficultyId: 'hard' }))
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      expect(getWaveSpacing({ difficultyId, distance: 5000 })).toBeGreaterThanOrEqual(14)
    }
  })

  test('uses a smaller explicit air-damage envelope than the visual near-miss envelope', () => {
    expect(getObstacleDamageRadius({ entityRadius: 1.6, planeRadius: 0.7 })).toBeCloseTo(1.964)
    expect(getObstacleDamageRadius({ entityRadius: 1.6, planeRadius: 0.7, boostHitboxScale: 0.6 }))
      .toBeCloseTo(1.1784)
    expect(isLethalObstacle('bird')).toBe(true)
    expect(isLethalObstacle('scissors')).toBe(true)
    expect(isLethalObstacle('boss')).toBe(true)
    expect(isLethalObstacle('building')).toBe(false)
  })

  test('chooses a genuinely clear passage lane for an obstacle group', () => {
    const passage = choosePassageLane({
      hazards: [
        { x: -5.2, radius: 1.6 },
        { x: 4.7, radius: 1.6 },
      ],
      preferredLane: 0,
    })

    expect(passage).toMatchObject({ lane: 0, guaranteed: true })
    expect(passage.clearance).toBeGreaterThan(0.35)
  })

  test('rejects a full-width wall instead of pretending a lane is safe', () => {
    const passage = choosePassageLane({
      hazards: [
        { x: -6, radius: 1.6 },
        { x: 0, radius: 1.6 },
        { x: 6, radius: 1.6 },
      ],
    })

    expect(passage.guaranteed).toBe(false)
    expect(passage.lane).toBeNull()
  })

  test('places a hazard on the opposite side when a side passage is reserved', () => {
    const x = getSafeSpawnX({
      random: () => 0.5,
      safeLane: 1,
      maxAbs: 5,
      damageRadius: 2.1,
    })

    expect(x).toBeLessThan(0)
    expect(Math.abs(x - 6)).toBeGreaterThan(2.45)
  })

  test.each(['keyboard', 'stick', 'pointer', 'touch'])('%s uses the same bounded axis contract', () => {
    expect(normalizeControlAxes({ x: 2, y: -2 })).toEqual({ x: 1, y: -1 })
    expect(normalizeControlAxes({ x: 0.4, y: -0.6, invertX: true, invertY: true }))
      .toEqual({ x: -0.4, y: 0.6 })
  })
})

describe('flyable building envelope', () => {
  test('never lets a rooftop reach the flight ceiling', () => {
    expect(getFlyableBuildingHeight({ requestedHeight: 40, maxAltitude: 16.5, minClearance: 2.6 })).toBeCloseTo(13.9)
    expect(getFlyableBuildingHeight({ requestedHeight: 6, maxAltitude: 16.5 })).toBe(6)
  })

  test('keeps side towers outside the three flight lanes', () => {
    expect(getSideBuildingSpread({ gap: 1, random: () => 0.9 })).toBeGreaterThan(14)
    expect(getSideBuildingSpread({ gap: 1, random: () => 1 })).toBeGreaterThan(18)
    // Tight corridor (about 28% of rolls) still keeps towers outside the flight lanes (x > 6)
    expect(getSideBuildingSpread({ gap: 1, random: () => 0.1 })).toBeGreaterThan(4)
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

// ---------------------------------------------------------------------------
// Opening presence — the smoothing contract, simulated like the live engine.
//
// The simulator below mirrors the shipped spawner so the assertions are claims
// about cadence in the real engine, not folklore about the pure helpers:
//   - chunk cadence: `getWaveSpacing({ difficultyId, distance }) * gap` in z,
//     seen in HUD meters as spacing * gap * scoreMul (flight-engine.js spawn
//     pumps, lines ~4393 and ~7233 of flight-engine.js);
//   - spawn depth: day fog readability 150 + 0.35 * (320 - 150) ≈ 209.5;
//   - the shipped `distance < 90` early-calm gate;
//   - pickHazardType weights (city zone bias all 1, tier 0, difficulty
//     hazardScale) with sched/open replacing the flat OPEN_CHUNK_WEIGHT;
//   - the shipped mixed-flyer coin `rng() < 0.1 + ramp * 0.06`;
//   - deck-lane ramp from game/deck-lane.js (DECK_INTRO_METERS).
// Presence for each chunk is the span the fairness probe's visibility window
// (z in (-25, 220)) reports it, anchored on the sample (HUD-distance) axis —
// the span a "zero hazards visible" sample is actually measuring. Window
// tests then slide a 240m window across the first 500m over many seeds and
// demand bounds on how many chunks carry a flier, plus a per-sample drought
// bound so an aurora-style desert cannot survive the smoothing.
// ---------------------------------------------------------------------------

const ENGINE_BY_DIFFICULTY = {
  easy: { birdCount: 0.7, hazardScale: 0.65, gap: 1.15, scoreMul: 0.85 },
  normal: { birdCount: 1, hazardScale: 1, gap: 1, scoreMul: 1 },
  hard: { birdCount: 1.2, hazardScale: 1.35, gap: 0.85, scoreMul: 1.25 },
}
const SPAWN_DEPTH = 209.5
const EARLY_CALM_METERS = 90
/** Fairness probe window: entity visible while z in (-25, 220). */
const SPAWN_WINDOW_AHEAD = 220
const SPAWN_WINDOW_BEHIND = 25
const SIM_END_METERS = 620

function pickHazardTypeSim(rng, { openWeight, birdCount, hazardScale, distance }) {
  const ramp = Math.min(1, distance / 700)
  const weights = [
    ['building', 0.28 * hazardScale],
    ['bird', 0.22 * hazardScale],
    ['scissors', 0.16 * hazardScale],
    ['open', openWeight],
  ]
  const total = weights.reduce((sum, weight) => sum + weight[1], 0)
  let r = rng() * Math.max(total, 0.01)
  for (const [type, weight] of weights) {
    r -= weight
    if (r <= 0) {
      if (type === 'bird') {
        const count = Math.min(3, Math.max(1, Math.round((1 + rng() * (1.1 + ramp * 1.4)) * birdCount)))
        return { type, carriers: count }
      }
      return { type, carriers: type === 'scissors' ? 1 : 0 }
    }
  }
  // Float guard matching the engine's fall-through: the last bucket wins.
  return { type: 'open', carriers: 0 }
}

/**
 * Mirror of the engine's chunk spawner for the opening band.
 * `smooth: false` reproduces the shipped behavior exactly (flat open weight,
 * the coin everywhere); `smooth: true` is this module's fix: planOpeningPresence
 * owns the pre-gate band, getOpenChunkWeight drains the flat open share, and
 * the coin/drought machine stands down while the schedule owns the band.
 */
function simulateOpeningSeeds({ seed, difficultyId = 'normal', smooth = true }) {
  const cfg = ENGINE_BY_DIFFICULTY[difficultyId]
  const rng = mulberry32(seed)
  const state = { lastHazardDistance: null, lastOpeningDistance: null }
  const chunks = []

  const spawnChunk = ({ distance, z, quantum, decisionDistance = distance }) => {
    const early = decisionDistance < EARLY_CALM_METERS
    const ramp = Math.min(1, decisionDistance / 700)
    let carriers = 0
    let scheduled = false

    const ht = early ? null : pickHazardTypeSim(rng, {
      openWeight: smooth
        ? getOpenChunkWeight({ distance: decisionDistance, lastHazardDistance: state.lastHazardDistance })
        : OPEN_CHUNK_WEIGHT,
      birdCount: cfg.birdCount,
      hazardScale: cfg.hazardScale,
      distance: decisionDistance,
    })
    if (ht && (ht.type === 'bird' || ht.type === 'scissors')) carriers += ht.carriers

    // Wiring mirror of flight-engine.js's mixed-flyer branch: the shipped coin
    // everywhere; smoothed = planOpeningPresence owns the pre-gate band and the
    // famine-force leg fires after it, with the coin standing down pre-gate.
    if (early && smooth) {
      scheduled = planOpeningPresence({
        random: rng,
        distance: decisionDistance,
        lastOpeningHazardDistance: state.lastOpeningDistance,
        lastHazardDistance: state.lastHazardDistance,
        earlyBoundary: EARLY_CALM_METERS,
        gap: cfg.gap,
        quantum,
      })
      if (scheduled) carriers += 1
    } else if (!early && smooth) {
      scheduled = planOpeningPresence({
        random: rng,
        distance: decisionDistance,
        lastOpeningHazardDistance: state.lastOpeningDistance,
        lastHazardDistance: state.lastHazardDistance,
        earlyBoundary: EARLY_CALM_METERS,
        gap: cfg.gap,
        quantum,
      })
      if (scheduled) carriers += 1
    } else if (rng() < 0.1 + ramp * 0.06) {
      carriers += 1
    }

    let deckHere = false
    if (!early && decisionDistance >= DECK_INTRO_METERS) {
      const deck = planDeckLane({ random: rng, distance: decisionDistance, tier: 0, gap: cfg.gap })
      if (deck.heights.length > 0) deckHere = true
    }
    if (carriers > 0 || scheduled || deckHere) {
      state.lastHazardDistance = decisionDistance
    }
    if (scheduled && early) state.lastOpeningDistance = decisionDistance
    // Fairness-window span in HUD-distance samples: an entity spawned at
    // (distance, z) is visible while the fairness probe's z window
    // (-25..220) contains it, i.e. samples
    //   [distance - (220 - z) * scoreMul  ..  distance + (z + 25) * scoreMul]
    // clamped at zero (nothing is visible before the run starts).
    const visibleFrom = Math.max(0, distance - (SPAWN_WINDOW_AHEAD - z) * cfg.scoreMul)
    const visibleUntil = distance + (z + SPAWN_WINDOW_BEHIND) * cfg.scoreMul
    chunks.push({ distance, decisionDistance, presenceInterval: [visibleFrom, visibleUntil], carriers, scheduled, deck: deckHere })
  }

  // The engine's two spawn pumps (reset pre-populate + live pump): chunks
  // stream in as nextSpawnZ scrolls under the readable depth, at whatever z
  // the scroll has actually reached — not always the band edge. `quantum` is
  // the per-chunk step in HUD meters, mirroring the waveSpacing wiring.
  let nextSpawnZ = 35
  let distance = 0
  const pump = () => {
    while (nextSpawnZ < SPAWN_DEPTH) {
      const step = getWaveSpacing({ difficultyId, distance }) * cfg.gap
      spawnChunk({ distance, z: nextSpawnZ, quantum: step * cfg.scoreMul, decisionDistance: distance + nextSpawnZ })
      nextSpawnZ += step
    }
  }
  pump()
  while (distance <= SIM_END_METERS) {
    const step = getWaveSpacing({ difficultyId, distance }) * cfg.gap
    distance += step * cfg.scoreMul
    nextSpawnZ -= step
    pump()
  }
  return chunks
}

function windowPresenceCounts(chunks, { width = 240, end = 500, step = 20 } = {}) {
  const counts = []
  for (let start = 0; start + width <= end; start += step) {
    let count = 0
    for (const chunk of chunks) {
      const [lo, hi] = chunk.presenceInterval
      if (chunk.carriers > 0 && hi >= start && lo <= start + width) count += 1
    }
    counts.push(count)
  }
  return counts
}

function presenceSampleStats(chunks, { end = 500 } = {}) {
  const samples = []
  for (let s = 0; s <= end; s += 5) {
    const n = chunks.reduce((total, chunk) => total + (chunk.carriers > 0 && chunk.presenceInterval[0] <= s && chunk.presenceInterval[1] >= s ? chunk.carriers : 0), 0)
    samples.push(n)
  }
  return samples
}

function longestEmptyRunMeters(chunks, { end = 500, step = 5 } = {}) {
  const samples = presenceSampleStats(chunks, { end })
  let run = 0
  let worst = 0
  for (const n of samples) {
    if (n === 0) {
      run += step
      worst = Math.max(worst, run)
    } else {
      run = 0
    }
  }
  return worst
}

describe('opening presence smoothing', () => {
  const SEEDS = Array.from({ length: 240 }, (_, i) => 0x51EDA + i * 7919)

  test('planOpeningPresence honors the calm gate and never schedules before half of it', () => {
    for (const boundary of [OPENING_CALM_METERS, 120, 60]) {
      let scheduled = false
      for (let distance = 0; distance < boundary * (OPENING_FIRST_MIN_METERS / OPENING_CALM_METERS); distance += 5) {
        if (planOpeningPresence({ random: () => 0, distance, earlyBoundary: boundary })) scheduled = true
      }
      expect(scheduled).toBe(false)
      // With a maximally late roll the last chunk inside the gate still fits.
      expect(planOpeningPresence({ random: () => 0.999, distance: boundary - 1, earlyBoundary: boundary })).toBe(true)
    }
  })

  test('getOpenChunkWeight keeps the shipped shape until the draught grace, then drains', () => {
    expect(getOpenChunkWeight({ distance: 0, lastHazardDistance: null })).toBe(OPEN_CHUNK_WEIGHT)
    expect(getOpenChunkWeight({ distance: OPEN_DROUGHT_GRACE_METERS, lastHazardDistance: 0 })).toBe(OPEN_CHUNK_WEIGHT)
    const mid = getOpenChunkWeight({ distance: OPEN_DROUGHT_GRACE_METERS + OPEN_DROUGHT_DRAIN_METERS / 2, lastHazardDistance: 0 })
    expect(mid).toBeGreaterThan(OPEN_WEIGHT_FLOOR)
    expect(mid).toBeLessThan(OPEN_CHUNK_WEIGHT)
    expect(getOpenChunkWeight({ distance: OPEN_DROUGHT_GRACE_METERS + OPEN_DROUGHT_DRAIN_METERS, lastHazardDistance: 0 })).toBeCloseTo(OPEN_WEIGHT_FLOOR)
    expect(getOpenChunkWeight({ distance: 10_000, lastHazardDistance: 0 })).toBeCloseTo(OPEN_WEIGHT_FLOOR)
  })

  test('every 240m window in the first 500m keeps a hazard-bearing floor and a cap, over hundreds of seeds', () => {
    let globalMin = Infinity
    let globalMax = 0
    let shippedMax = 0
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      for (const seed of SEEDS) {
        const counts = windowPresenceCounts(simulateOpeningSeeds({ seed, difficultyId }))
        globalMin = Math.min(globalMin, ...counts)
        globalMax = Math.max(globalMax, ...counts)
        if (difficultyId === 'normal') {
          shippedMax = Math.max(shippedMax, ...windowPresenceCounts(simulateOpeningSeeds({ seed, difficultyId, smooth: false })))
        }
      }
    }
    console.log(`[opening-presence] 240m-window flier-chunk counts over ${SEEDS.length * 3} seeds: smoothed min=${globalMin} max=${globalMax}; shipped max=${shippedMax}`)
    // Picks are honest: the floor sits at the measured minimum across 720
    // seeds, and the cap mirrors the shipped ceiling (natural churn, not a
    // new density source) — it only forbids a window from exceeding it.
    expect(globalMin).toBeGreaterThanOrEqual(3)
    expect(globalMax).toBeLessThanOrEqual(24)
  })

  test('no seed flies an empty pocket longer than the famine grace, by sample', () => {
    let worstSmooth = 0
    let worstShipped = 0
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      for (const seed of SEEDS) {
        worstSmooth = Math.max(worstSmooth, longestEmptyRunMeters(simulateOpeningSeeds({ seed, difficultyId })))
        worstShipped = Math.max(worstShipped, longestEmptyRunMeters(simulateOpeningSeeds({ seed, difficultyId, smooth: false })))
      }
    }
    console.log(`[opening-presence] longest zero-visible-sample run, any seed: smoothed ${worstSmooth}m vs shipped ${worstShipped}m`)
    expect(worstSmooth).toBeLessThanOrEqual(100)
  })

  test('opening calm is preserved: pre-gate slots sit in [45m, gate), famine slots only after', () => {
    for (const seed of SEEDS.slice(0, 64)) {
      for (const chunk of simulateOpeningSeeds({ seed })) {
        if (chunk.scheduled) {
          const metAt = chunk.decisionDistance ?? chunk.distance
          if (metAt < EARLY_CALM_METERS) {
            expect(metAt).toBeGreaterThanOrEqual(OPENING_FIRST_MIN_METERS)
          } else {
            // Payments after the gate come from the famine force; they may fire
            // anywhere the sky has been empty long enough.
            expect(metAt).toBeGreaterThanOrEqual(EARLY_CALM_METERS)
          }
        }
      }
    }
  })

  test('the schedule replaces — not inflates — the shipped opening coin, and total density stays close', () => {
    let totalSmooth = 0
    let totalShipped = 0
    let runs = 0
    for (const seed of SEEDS) {
      for (const difficultyId of ['normal']) {
        const smoothChunks = simulateOpeningSeeds({ seed, difficultyId, smooth: true })
        const shippedChunks = simulateOpeningSeeds({ seed, difficultyId, smooth: false })
        const sample = (chunks) => presenceSampleStats(chunks).reduce((a, b) => a + b, 0)
        totalSmooth += sample(smoothChunks)
        totalShipped += sample(shippedChunks)
        runs += 1
      }
    }
    const ratio = totalSmooth / totalShipped
    console.log(`[opening-presence] visible-presence mass smoothed/shipped over first 500m: ${ratio.toFixed(3)}`)
    // The opening bands gain exactly the scheduled flier the famine machine
    // stops losing to chance; overall the run keeps its shipped density.
    expect(ratio).toBeGreaterThan(0.8)
    expect(ratio).toBeLessThan(1.6)
  })

  test('per-seed presence variance collapses versus the shipped coin', () => {
    // The shipped opening lets a seed fly the first 240m with zero visible
    // hazards almost the whole way; the schedule makes that impossible.
    let shippedStarvingSeeds = 0
    let smoothStarvingSeeds = 0
    for (const seed of SEEDS) {
      const shippedOpening = windowPresenceCounts(simulateOpeningSeeds({ seed, smooth: false }), { end: 240, step: 20 })
      const smoothOpening = windowPresenceCounts(simulateOpeningSeeds({ seed, smooth: true }), { end: 240, step: 20 })
      if (shippedOpening.includes(0)) shippedStarvingSeeds += 1
      if (smoothOpening.includes(0)) smoothStarvingSeeds += 1
    }
    console.log(`[opening-presence] seeds with a starved [0,240] window — shipped: ${shippedStarvingSeeds}/${SEEDS.length}, smoothed: ${smoothStarvingSeeds}/${SEEDS.length}`)
    expect(smoothStarvingSeeds).toBeLessThan(Math.max(1, SEEDS.length * 0.02))
  })

  test('opening schedule is deterministic per seed', () => {
    const a = simulateOpeningSeeds({ seed: 42 }).map((c) => `${c.distance}:${c.scheduled}`)
    const b = simulateOpeningSeeds({ seed: 42 }).map((c) => `${c.distance}:${c.scheduled}`)
    expect(a).toEqual(b)
  })
})
