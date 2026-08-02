import {
  buildRunConfiguration,
  createJourney,
  getRouteChoices,
  selectJourneyRoute,
  stepsForChapter,
} from '../journey.js'
import {
  buildEncounterTimeline,
  JOURNEY_ROUTE_DISTANCE,
} from '../journey-encounters.js'
import { mulberry32 } from '../rng.js'
import { planStarSpawns } from './star-spawn.js'
import {
  choosePassageLane,
  createPacingWave,
  getObstacleDamageRadius,
  getWaveSpacing,
  PASSAGE_LANE_X,
} from './pacing.js'
import { getBossClearReward } from './boss-director.js'

export const ROUTE_PROOF_VERSION = 1
export const DEFAULT_ROUTE_PROOF_SEED = 4242
export const DEFAULT_ROUTE_PROOF_NOW = 1000
export const ROUTE_PROOF_DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard'])

const BALANCE_PROFILES = Object.freeze({
  easy: Object.freeze({ starChance: 0.7, powerChance: 0.28 }),
  normal: Object.freeze({ starChance: 0.58, powerChance: 0.18 }),
  hard: Object.freeze({ starChance: 0.48, powerChance: 0.12 }),
})

const ROUTE_EVENT_MIN_GAP = 72
const ROUTE_BOSS_MIN_GAP = getBossClearReward().recoveryMeters
const PASSAGE_HAZARD_RADIUS = 1.6

function positiveInteger(value, fallback) {
  const number = Math.trunc(Number(value))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function normalizeChapter(chapter) {
  return Number(chapter) === 2 ? 2 : 1
}

function normalizeRisk(risk) {
  return String(risk).toLowerCase() === 'risky' ? 'risky' : 'safe'
}

function normalizeStepIndex(chapter, stepIndex) {
  const lastIndex = Math.max(0, stepsForChapter(chapter).length - 1)
  return Math.min(lastIndex, Math.max(0, Math.trunc(Number(stepIndex) || 0)))
}

function routeIndexForRisk(risk) {
  return normalizeRisk(risk) === 'risky' ? 1 : 0
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round((Number(value) || 0) * factor) / factor
}

function eventDistanceGaps(events) {
  return events.slice(1).map((event, index) => event.distance - events[index].distance)
}

function countShortcutGateBudget(events, targetDistance) {
  return events
    .filter((event) => event.distance <= targetDistance && event.type === 'shortcut-gate')
    .reduce((total, event) => total + Math.max(1, Math.min(3, Number(event.params?.count) || 1)), 0)
}

function countNearMissWindows(events, targetDistance) {
  return events
    .filter((event) => event.distance <= targetDistance)
    .reduce((total, event) => {
      if (event.type === 'formation' || event.type === 'rooftop-gap') return total + 3
      if (event.type === 'shortcut-gate') return total + Math.max(1, Number(event.params?.count) || 1)
      if (event.type === 'gust') return total + 1
      return total
    }, 0)
}

function buildSeededBalanceBudget(config, difficultyId) {
  const profile = BALANCE_PROFILES[difficultyId] || BALANCE_PROFILES.normal
  const targetDistance = config.targetDistance || (config.finale ? JOURNEY_ROUTE_DISTANCE.finale : JOURNEY_ROUTE_DISTANCE.standard)
  const spacing = getWaveSpacing({ difficultyId })
  const waveCount = Math.max(1, Math.ceil(targetDistance / spacing))
  const random = mulberry32(config.encounterSeed || config.seed || DEFAULT_ROUTE_PROOF_SEED)
  const starMultiplier = config.modifier === 'star-trail'
    ? 1.6
    : config.modifier === 'shortcut-gates' ? 1.35 : 1
  let seededStars = 0
  let seededPowerUps = 0
  let minimumPassageClearance = Infinity
  let safeLaneWaves = 0
  let nearMissWindows = 0

  for (let index = 0; index < waveCount; index += 1) {
    const distance = Math.min(targetDistance, index * spacing)
    const ramp = Math.min(1, distance / 700)
    const plan = planStarSpawns({
      random,
      starChance: profile.starChance,
      powerChance: profile.powerChance,
      ramp,
      twistStarMul: starMultiplier,
    })
    seededStars += plan.starCount
    seededPowerUps += plan.powerSpawn ? 1 : 0

    const wave = createPacingWave({
      index,
      difficultyId,
      afterBoss: false,
    })
    if (wave.hazardLanes.length > 0) nearMissWindows += 1
    const hazards = wave.hazardLanes.map((lane) => ({
      x: PASSAGE_LANE_X[lane + 1],
      radius: PASSAGE_HAZARD_RADIUS,
    }))
    const passage = choosePassageLane({
      hazards,
      preferredLane: wave.starLane,
      planeRadius: 0.7,
    })
    if (passage.guaranteed) safeLaneWaves += 1
    minimumPassageClearance = Math.min(minimumPassageClearance, passage.clearance)
  }

  return Object.freeze({
    difficultyId,
    waveCount,
    seededStars,
    seededPowerUps,
    safeLaneWaves,
    nearMissWindows,
    minimumPassageClearance: round(minimumPassageClearance),
    recoveryMeters: ROUTE_BOSS_MIN_GAP,
    airDamageRadius: round(getObstacleDamageRadius({
      entityRadius: PASSAGE_HAZARD_RADIUS,
      planeRadius: 0.7,
    }), 3),
  })
}

export function createDeterministicJourneyRoute({
  seed = DEFAULT_ROUTE_PROOF_SEED,
  chapter = 1,
  stepIndex = 0,
  risk = 'safe',
  now = DEFAULT_ROUTE_PROOF_NOW,
} = {}) {
  const normalizedSeed = positiveInteger(seed, DEFAULT_ROUTE_PROOF_SEED)
  const normalizedChapter = normalizeChapter(chapter)
  const normalizedStepIndex = normalizeStepIndex(normalizedChapter, stepIndex)
  const journey = {
    ...createJourney(normalizedSeed, now, normalizedChapter),
    stepIndex: normalizedStepIndex,
  }
  const choices = getRouteChoices(journey)
  const route = choices[routeIndexForRisk(risk)] || choices[0]
  const selectedJourney = selectJourneyRoute(journey, route.id)
  return Object.freeze({
    journey: selectedJourney,
    route,
    config: buildRunConfiguration(selectedJourney),
  })
}

export function buildJourneyRouteProof(options = {}) {
  const selection = createDeterministicJourneyRoute(options)
  const { config, route } = selection
  const timeline = buildEncounterTimeline(config)
  const targetDistance = timeline.targetDistance || config.targetDistance || JOURNEY_ROUTE_DISTANCE.standard
  const gaps = eventDistanceGaps(timeline.events)
  const authoredBossDistances = timeline.events
    .filter((event) => event.type === 'boss-gate' && event.distance <= targetDistance)
    .map((event) => event.distance)
  const bossGaps = eventDistanceGaps(authoredBossDistances.map((distance) => ({ distance })))
  const objective = config.objective
  const shortcutGateBudget = countShortcutGateBudget(timeline.events, targetDistance)
  const encounterNearMissWindows = countNearMissWindows(timeline.events, targetDistance)
  const balance = Object.fromEntries(
    ROUTE_PROOF_DIFFICULTIES.map((difficultyId) => [difficultyId, buildSeededBalanceBudget(config, difficultyId)]),
  )
  const normalBalance = balance.normal
  const objectiveBudget = objective.kind === 'shortcut-gates'
    ? shortcutGateBudget
    : objective.kind === 'star-trail'
      ? normalBalance.seededStars
      : objective.kind === 'near-miss'
        ? Math.max(encounterNearMissWindows, normalBalance.nearMissWindows)
        : objective.kind === 'shieldless' || objective.kind === 'rival' || objective.kind === 'completion'
          ? 1
          : 0
  const fingerprintPayload = {
    version: ROUTE_PROOF_VERSION,
    routeSeed: config.routeSeed,
    encounterSeed: config.encounterSeed,
    chapter: config.chapter,
    stepIndex: config.stepIndex,
    routeId: config.routeId,
    targetDistance,
    objective,
    events: timeline.events.map((event) => ({
      id: event.id,
      stage: event.stage,
      distance: event.distance,
      type: event.type,
      lanes: event.lanes,
      params: event.params,
    })),
  }
  const fingerprint = JSON.stringify(fingerprintPayload)
  const checks = Object.freeze({
    stagesReachable: timeline.events.every((event) => event.distance < targetDistance),
    encounterSpacing: gaps.every((gap) => gap >= ROUTE_EVENT_MIN_GAP),
    objectiveBudget: objectiveBudget >= Math.max(1, Number(objective.target) || 1),
    safePassage: normalBalance.safeLaneWaves === normalBalance.waveCount,
    bossRecoverySpacing: bossGaps.every((gap) => gap >= ROUTE_BOSS_MIN_GAP),
  })

  return Object.freeze({
    version: ROUTE_PROOF_VERSION,
    seed: config.routeSeed,
    encounterSeed: config.encounterSeed,
    chapter: config.chapter,
    stepIndex: config.stepIndex,
    routeId: config.routeId,
    routeLabel: route.label,
    zone: config.zone,
    risk: config.risk,
    modifier: config.modifier,
    targetDistance,
    objective,
    shortcutGateBudget,
    nearMissWindows: Math.max(encounterNearMissWindows, normalBalance.nearMissWindows),
    authoredBossDistances,
    timeline,
    balance,
    checks,
    allChecksPass: Object.values(checks).every(Boolean),
    fingerprint,
  })
}

export function buildJourneyRouteMatrix({
  seeds = [DEFAULT_ROUTE_PROOF_SEED],
  chapters = [1, 2],
  difficultyId = 'normal',
} = {}) {
  const proofs = []
  for (const seed of seeds) {
    for (const chapter of chapters) {
      const stepCount = stepsForChapter(normalizeChapter(chapter)).length
      for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        for (const risk of ['safe', 'risky']) {
          const proof = buildJourneyRouteProof({ seed, chapter, stepIndex, risk })
          proofs.push({
            ...proof,
            balance: proof.balance[difficultyId] || proof.balance.normal,
          })
        }
      }
    }
  }
  return Object.freeze(proofs)
}
