import { buildJourneyObjective } from './journey-encounters.js'

export const JOURNEY_VERSION = 3
export const DAREDEVIL_STAMP_REQUIREMENT = 4

export const PILOTS = Object.freeze({
  navigator: Object.freeze({
    id: 'navigator',
    name: 'Milo',
    icon: '🧭',
    ability: 'Shortcut Scout',
    description: 'Reveals extra shortcut details before risky flights.',
    unlockedAt: 0,
  }),
  daredevil: Object.freeze({
    id: 'daredevil',
    name: 'Pip',
    icon: '🔥',
    ability: 'Near-miss Rush',
    description: 'Near-miss chains add a small, capped momentum bonus.',
    unlockedAt: DAREDEVIL_STAMP_REQUIREMENT,
  }),
})

/** Chapter 1 — the original four-flight living journey. */
export const CHAPTER_1_STEPS = Object.freeze([
  Object.freeze({ id: 'rooftops', label: 'Paper City Rooftops', zone: 'city', icon: '🏙️' }),
  Object.freeze({ id: 'harbor', label: 'Harbor Crossing', zone: 'harbor', icon: '⚓' }),
  Object.freeze({ id: 'storm', label: 'Storm Front', zone: 'storm', icon: '⛈️' }),
  Object.freeze({ id: 'aurora', label: 'Aurora Showdown', zone: 'aurora', icon: '🌌', finale: true }),
])

/** Chapter 2 — Desk After Dark, unlocked after any Chapter 1 completion. */
export const CHAPTER_2_STEPS = Object.freeze([
  Object.freeze({ id: 'golden', label: 'Golden Fold Approach', zone: 'sunset', icon: '🌅' }),
  Object.freeze({ id: 'midnight', label: 'Midnight Desk', zone: 'midnight', icon: '🌙' }),
  Object.freeze({ id: 'scrapyard', label: 'Stapler Alley', zone: 'storm', icon: '📎' }),
  Object.freeze({ id: 'desk-finale', label: 'Desk Showdown', zone: 'midnight', icon: '📎', finale: true }),
])

export const JOURNEY_CHAPTERS = Object.freeze({
  1: Object.freeze({
    id: 1,
    title: 'Living Journey',
    subtitle: 'City to Aurora',
    steps: CHAPTER_1_STEPS,
  }),
  2: Object.freeze({
    id: 2,
    title: 'Chapter 2 · Desk After Dark',
    subtitle: 'Sunset to the stapler gauntlet',
    steps: CHAPTER_2_STEPS,
    unlockAfterChapter: 1,
  }),
})

/** @deprecated Prefer stepsForChapter — kept for callers that expect a flat list. */
export const JOURNEY_STEPS = CHAPTER_1_STEPS

const MODIFIERS = Object.freeze([
  { id: 'star-trail', label: 'Star Trail', icon: '⭐', description: 'A bright ribbon of bonus stars.', rewardMultiplier: 1.15 },
  { id: 'crosswind', label: 'Crosswind', icon: '💨', description: 'Strong side gusts test your line.', rewardMultiplier: 1.4 },
  { id: 'moving-formation', label: 'Moving Formation', icon: '🎈', description: 'Obstacle formations drift across the route.', rewardMultiplier: 1.35 },
  { id: 'low-visibility', label: 'Cloud Cover', icon: '🌫️', description: 'The path reveals itself at close range.', rewardMultiplier: 1.45 },
  { id: 'shortcut-gates', label: 'Shortcut Gates', icon: '↗️', description: 'Thread narrow gates for extra distance.', rewardMultiplier: 1.5 },
])

export function stepsForChapter(chapter = 1) {
  return JOURNEY_CHAPTERS[chapter]?.steps || CHAPTER_1_STEPS
}

export function chapterMeta(chapter = 1) {
  return JOURNEY_CHAPTERS[chapter] || JOURNEY_CHAPTERS[1]
}

function hash(seed, step, lane) {
  let value = (Number(seed) || 1) ^ Math.imul(step + 1, 0x9e3779b1) ^ Math.imul(lane + 1, 0x85ebca6b)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  return value >>> 0
}

function routeFor(journey, lane) {
  const steps = stepsForChapter(journey.chapter || 1)
  const step = steps[journey.stepIndex]
  if (!step) return null
  const risky = lane === 1
  const chapter = journey.chapter || 1
  let modifier
  if (step.finale) {
    if (chapter === 2) {
      modifier = {
        id: risky ? 'red-dart-stapler' : 'stapler-finale',
        label: risky ? 'Red Dart Staple Run' : 'Stapler Gauntlet',
        icon: risky ? '🔺' : '📎',
        description: risky
          ? 'Race Red Dart through a multi-stage stapler corridor.'
          : 'Survive the desk stapler jaws — commit to the glowing lane.',
        rewardMultiplier: risky ? 1.8 : 1.4,
      }
    } else {
      modifier = {
        id: risky ? 'red-dart-finale' : 'scissors-finale',
        label: risky ? 'Red Dart Duel' : 'Scissors Gauntlet',
        icon: risky ? '🔺' : '✂️',
        description: risky
          ? 'Race the Red Dart through its signature weave.'
          : 'Survive a multi-stage scissors gauntlet.',
        rewardMultiplier: risky ? 1.75 : 1.35,
      }
    }
  } else {
    modifier = MODIFIERS[hash(journey.seed, journey.stepIndex, lane) % MODIFIERS.length]
  }
  return {
    id: `${step.id}-${risky ? 'risky' : 'safe'}-${modifier.id}`,
    stepId: step.id,
    label: risky ? `${step.label} Shortcut` : `${step.label} Scenic Route`,
    zone: step.zone,
    modifier: modifier.id,
    modifierLabel: modifier.label,
    icon: modifier.icon,
    description: modifier.description,
    risk: risky ? 'risky' : 'safe',
    rewardMultiplier: risky ? Math.max(1.35, modifier.rewardMultiplier) : Math.min(1.2, modifier.rewardMultiplier),
    stampId: `${step.id}-${risky ? 'bold' : 'steady'}`,
    rival: step.finale && risky,
    finale: !!step.finale,
    chapter,
  }
}

export function createJourney(seed = Date.now(), now = Date.now(), chapter = 1) {
  const normalizedSeed = Math.abs(Math.trunc(Number(seed))) || 1
  const chapterId = chapter === 2 ? 2 : 1
  return {
    version: JOURNEY_VERSION,
    chapter: chapterId,
    id: `journey-c${chapterId}-${normalizedSeed}-${Math.trunc(now)}`,
    seed: normalizedSeed,
    createdAt: Math.trunc(now),
    stepIndex: 0,
    pilotId: 'navigator',
    selectedRouteId: null,
    completedRouteIds: [],
    earnedStampIds: [],
    runStars: 0,
    totalDistance: 0,
    totalStars: 0,
    status: 'active',
    postcard: null,
    attemptNumber: 1,
    lastOutcomeReceiptId: null,
    objectiveResults: [],
  }
}

export function getRouteChoices(journey) {
  const steps = stepsForChapter(journey?.chapter || 1)
  if (!journey || journey.status !== 'active' || !steps[journey.stepIndex]) return []
  return [routeFor(journey, 0), routeFor(journey, 1)]
}

export function selectJourneyRoute(journey, routeId) {
  const route = getRouteChoices(journey).find((choice) => choice.id === routeId)
  if (!route) return journey
  return { ...journey, selectedRouteId: route.id }
}

export function selectJourneyPilot(journey, pilotId, lifetimeStamps = 0) {
  const pilot = PILOTS[pilotId]
  if (!pilot || lifetimeStamps < pilot.unlockedAt) return journey
  return { ...journey, pilotId }
}

export function buildRunConfiguration(journey) {
  const route = getRouteChoices(journey).find((choice) => choice.id === journey?.selectedRouteId)
  if (!route) return null
  const encounterSeed = hash(journey.seed, journey.stepIndex, route.risk === 'risky' ? 1 : 0)
  const base = {
    journeyId: journey.id,
    chapter: journey.chapter || 1,
    stepIndex: journey.stepIndex,
    routeId: route.id,
    zone: route.zone,
    modifier: route.modifier,
    modifierLabel: route.modifierLabel,
    risk: route.risk,
    rewardMultiplier: route.rewardMultiplier,
    pilotId: journey.pilotId,
    rival: route.rival,
    finale: route.finale,
    seed: encounterSeed,
    encounterSeed,
    attemptId: `${journey.id}:${route.id}:${journey.attemptNumber || 1}`,
  }
  return { ...base, objective: buildJourneyObjective(base) }
}

export function resolveJourneyFlight(journey, outcome = {}) {
  if (!journey?.selectedRouteId || journey.status !== 'active') return journey
  const steps = stepsForChapter(journey.chapter || 1)
  const route = getRouteChoices(journey).find((choice) => choice.id === journey.selectedRouteId)
  if (!route) return journey
  const stars = Math.max(0, Math.trunc(Number(outcome.stars) || 0))
  const distance = Math.max(0, Math.trunc(Number(outcome.distance) || 0))
  const totals = {
    runStars: stars,
    totalStars: journey.totalStars + stars,
    totalDistance: journey.totalDistance + distance,
  }
  if (!outcome.completed) return {
    ...journey,
    ...totals,
    attemptNumber: (journey.attemptNumber || 1) + 1,
    lastOutcomeReceiptId: outcome.receiptId || null,
  }

  const completedRouteIds = [...journey.completedRouteIds, route.id]
  const objectiveResults = outcome.objectiveResult
    ? [...(journey.objectiveResults || []), outcome.objectiveResult]
    : [...(journey.objectiveResults || [])]
  const earnedStampIds = journey.earnedStampIds.includes(route.stampId)
    ? journey.earnedStampIds
    : [...journey.earnedStampIds, route.stampId]
  const nextStep = journey.stepIndex + 1
  if (nextStep < steps.length) {
    return {
      ...journey,
      ...totals,
      stepIndex: nextStep,
      selectedRouteId: null,
      completedRouteIds,
      earnedStampIds,
      objectiveResults,
      attemptNumber: 1,
      lastOutcomeReceiptId: outcome.receiptId || null,
    }
  }
  const postcard = {
    id: `${journey.id}-postcard`,
    journeyId: journey.id,
    chapter: journey.chapter || 1,
    completedAt: Date.now(),
    pilotId: journey.pilotId,
    routePath: completedRouteIds,
    stampIds: earnedStampIds,
    totalDistance: totals.totalDistance,
    totalStars: totals.totalStars,
    rivalBeaten: !!outcome.rivalBeaten,
    perfect: earnedStampIds.length === steps.length,
    artworkId: outcome.destinationId || route.zone,
    objectiveResults,
    masteryLevel: Math.min(3, Math.max(0, Number(outcome.masteryLevel) || 0)),
    decorationIds: Array.isArray(outcome.decorationIds) ? [...outcome.decorationIds] : [],
  }
  return {
    ...journey,
    ...totals,
    stepIndex: nextStep,
    selectedRouteId: null,
    completedRouteIds,
    earnedStampIds,
    objectiveResults,
    status: 'complete',
    postcard,
    attemptNumber: 1,
    lastOutcomeReceiptId: outcome.receiptId || null,
  }
}
