import { mulberry32 } from '../rng.js'
import {
  BOSS_KINDS,
  createBossEncounter,
  isInsideBossPassage,
} from './boss-director.js'
import {
  PASSAGE_LANE_X,
  SAFE_SPAWN_MARGIN,
  choosePassageLane,
  chooseSafeBuildingX,
  createPacingWave,
  getBuildingDensityScale,
  getCenterBuildingSafeRange,
  getObstacleDamageRadius,
  getSafeSpawnX,
  getWaveSpacing,
} from './pacing.js'
import { getCollisionRadius } from './upgrade-runtime.js'

export const DEFAULT_DEATH_STRESS_SEED_START = 1
export const DEFAULT_DEATH_STRESS_SEED_COUNT = 100
export const DEATH_STRESS_DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard'])
export const DEATH_STRESS_WAVE_TRIALS = 48

const PLANE_RADIUS = 0.7
const MAX_X = 13
const WAVE_TRIALS = DEATH_STRESS_WAVE_TRIALS

function positiveInteger(value, fallback) {
  const number = Math.trunc(Number(value))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function pushFailure(failures, code, details = {}) {
  failures.push(Object.freeze({ code, ...details }))
}

function buildingRadius(random, center = false) {
  const w = center ? 2 + random() * 3 : 2.5 + random() * 3.5
  const d = center ? 2 + random() * 2.5 : 2.5 + random() * 3
  return Math.max(w, d) * 0.5
}

function buildingHitInterval(x, radius) {
  const hitRadius = getCollisionRadius({
    entityRadius: radius,
    planeRadius: PLANE_RADIUS,
    planeWeight: 0.5,
  }).effectiveRadius
  return [x - hitRadius, x + hitRadius]
}

function laneIsBlocked(intervals, laneX) {
  return intervals.some(([minX, maxX]) => laneX > minX && laneX < maxX)
}

function runDeathStressSeed({ seed, difficultyId }) {
  const random = mulberry32(seed)
  const failures = []
  let buildingWaves = 0
  let airHazards = 0
  let bossPassages = 0
  let recoveryWaves = 0

  for (let waveIndex = 0; waveIndex < WAVE_TRIALS; waveIndex += 1) {
    const distance = waveIndex * getWaveSpacing({ difficultyId })
    const recovery = waveIndex % 9 === 8
    const wave = createPacingWave({
      index: waveIndex,
      difficultyId,
      afterBoss: recovery,
    })

    if (recovery) {
      recoveryWaves += 1
      if (wave.hazardLanes.length !== 0) {
        pushFailure(failures, 'recovery-has-hazards', { waveIndex })
      }
      if (wave.spacing <= getWaveSpacing({ difficultyId, distance })) {
        pushFailure(failures, 'recovery-not-wider', { waveIndex })
      }
      continue
    }

    const safeLaneX = PASSAGE_LANE_X[wave.starLane + 1]
    const density = getBuildingDensityScale({ distance, recovery })
    const laneSpread = 11 * ({ easy: 1.15, normal: 1, hard: 0.85 }[difficultyId] || 1) +
      random() * 10 * ({ easy: 1.15, normal: 1, hard: 0.85 }[difficultyId] || 1)
    let leftInnerEdge = null
    let rightInnerEdge = null
    const blocked = []

    for (const side of [-1, 1]) {
      if (random() >= 0.82 * density) continue
      const radius = buildingRadius(random)
      const x = side * laneSpread
      blocked.push(buildingHitInterval(x, radius))
      if (side === -1) leftInnerEdge = -laneSpread + radius
      else rightInnerEdge = laneSpread - radius
      buildingWaves += 1
    }

    // Exercise the same center-building promise as spawnChunk. The center
    // roll is intentionally independent from the side-building rolls so a
    // seed can reproduce a dense but still fair three-building chunk.
    if (random() < 0.78) {
      const radius = buildingRadius(random, true)
      const safeRange = getCenterBuildingSafeRange({
        leftInnerEdge,
        rightInnerEdge,
        radius,
        gap: ({ easy: 1.15, normal: 1, hard: 0.85 }[difficultyId] || 1),
      })
      if (safeRange) {
        const x = chooseSafeBuildingX({
          random,
          minX: safeRange.minX,
          maxX: safeRange.maxX,
          safeLane: wave.starLane,
          entityRadius: radius,
          planeRadius: PLANE_RADIUS,
          margin: 1,
        })
        if (x !== null) {
          blocked.push(buildingHitInterval(x, radius))
          buildingWaves += 1
        }
      }
    }

    if (laneIsBlocked(blocked, safeLaneX)) {
      pushFailure(failures, 'building-blocks-promised-lane', {
        difficultyId,
        waveIndex,
        safeLane: wave.starLane,
      })
    }

    const airCount = Math.min(5, Math.max(1, Math.round(1 + random() * 4)))
    const airHazardSnapshots = []
    for (let airIndex = 0; airIndex < airCount; airIndex += 1) {
      const radius = 0.7 + random() * 0.9
      const damageRadius = getObstacleDamageRadius({
        entityRadius: radius,
        planeRadius: PLANE_RADIUS,
      })
      const x = getSafeSpawnX({
        random,
        safeLane: wave.starLane,
        maxAbs: 6 * ({ easy: 1.15, normal: 1, hard: 0.85 }[difficultyId] || 1),
        margin: SAFE_SPAWN_MARGIN,
        damageRadius,
      })
      airHazards += 1
      airHazardSnapshots.push({ x, radius })
      if (Math.abs(x - safeLaneX) <= damageRadius + SAFE_SPAWN_MARGIN) {
        pushFailure(failures, 'air-hazard-enters-promised-lane', {
          difficultyId,
          waveIndex,
          airIndex,
          safeLane: wave.starLane,
        })
      }
    }

    const passage = choosePassageLane({
      hazards: airHazardSnapshots,
      preferredLane: wave.starLane,
      planeRadius: PLANE_RADIUS,
    })
    if (!passage.guaranteed || passage.lane !== wave.starLane) {
      pushFailure(failures, 'air-wave-rewrites-promised-lane', {
        difficultyId,
        waveIndex,
        promisedLane: wave.starLane,
        chosenLane: passage.lane,
      })
    }

    for (const kind of BOSS_KINDS) {
      const boss = createBossEncounter({
        kind,
        difficulty: difficultyId,
        encounterSeed: seed + waveIndex,
      }).snapshot()
      if (!isInsideBossPassage({
        playerX: 0,
        playerY: boss.safeY,
        bossX: 0,
        gapY: boss.safeY,
        passage: boss.passage,
      })) {
        pushFailure(failures, 'boss-safe-passage-not-flyable', {
          difficultyId,
          waveIndex,
          kind,
        })
      }
      bossPassages += 1
    }
  }

  return Object.freeze({
    seed,
    difficultyId,
    failures: Object.freeze(failures),
    metrics: Object.freeze({
      buildingWaves,
      airHazards,
      bossPassages,
      recoveryWaves,
    }),
  })
}

export function buildDeathStressReport({
  seedStart = DEFAULT_DEATH_STRESS_SEED_START,
  seedCount = DEFAULT_DEATH_STRESS_SEED_COUNT,
  difficulties = DEATH_STRESS_DIFFICULTIES,
} = {}) {
  const firstSeed = Math.max(1, positiveInteger(seedStart, DEFAULT_DEATH_STRESS_SEED_START))
  const count = Math.min(10_000, positiveInteger(seedCount, DEFAULT_DEATH_STRESS_SEED_COUNT))
  const selectedDifficulties = difficulties.filter((difficultyId) => DEATH_STRESS_DIFFICULTIES.includes(difficultyId))
  const reports = []

  for (let offset = 0; offset < count; offset += 1) {
    for (const difficultyId of selectedDifficulties) {
      reports.push(runDeathStressSeed({
        seed: firstSeed + offset,
        difficultyId,
      }))
    }
  }

  const failures = reports.flatMap((report) => report.failures.map((failure) => ({
    seed: report.seed,
    difficultyId: report.difficultyId,
    ...failure,
  })))
  const metrics = reports.reduce((summary, report) => {
    for (const [key, value] of Object.entries(report.metrics)) summary[key] += value
    return summary
  }, { buildingWaves: 0, airHazards: 0, bossPassages: 0, recoveryWaves: 0 })

  return Object.freeze({
    seedStart: firstSeed,
    seedCount: count,
    difficulties: Object.freeze([...selectedDifficulties]),
    checks: Object.freeze({
      seedsCovered: count,
      difficultyProfilesCovered: selectedDifficulties.length,
      failureCount: failures.length,
    }),
    metrics: Object.freeze(metrics),
    failures: Object.freeze(failures),
    allChecksPass: failures.length === 0,
  })
}
