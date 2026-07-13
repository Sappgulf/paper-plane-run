import { buildJourneyObjective } from './journey-encounters.js'

export const JOURNEY_VERSION = 2
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

export const JOURNEY_STEPS = Object.freeze([
  Object.freeze({ id: 'rooftops', label: 'Paper City Rooftops', zone: 'city' }),
  Object.freeze({ id: 'harbor', label: 'Harbor Crossing', zone: 'harbor' }),
  Object.freeze({ id: 'storm', label: 'Storm Front', zone: 'storm' }),
  Object.freeze({ id: 'aurora', label: 'Aurora Showdown', zone: 'aurora', finale: true }),
])

const MODIFIERS = Object.freeze([
  { id: 'star-trail', label: 'Star Trail', icon: '⭐', description: 'A bright ribbon of bonus stars.', rewardMultiplier: 1.15 },
  { id: 'crosswind', label: 'Crosswind', icon: '💨', description: 'Strong side gusts test your line.', rewardMultiplier: 1.4 },
  { id: 'moving-formation', label: 'Moving Formation', icon: '🎈', description: 'Obstacle formations drift across the route.', rewardMultiplier: 1.35 },
  { id: 'low-visibility', label: 'Cloud Cover', icon: '🌫️', description: 'The path reveals itself at close range.', rewardMultiplier: 1.45 },
  { id: 'shortcut-gates', label: 'Shortcut Gates', icon: '↗️', description: 'Thread narrow gates for extra distance.', rewardMultiplier: 1.5 },
])

function hash(seed, step, lane) {
  let value = (Number(seed) || 1) ^ Math.imul(step + 1, 0x9e3779b1) ^ Math.imul(lane + 1, 0x85ebca6b)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  return value >>> 0
}

function routeFor(journey, lane) {
  const step = JOURNEY_STEPS[journey.stepIndex]
  if (!step) return null
  const risky = lane === 1
  const modifier = step.finale
    ? { id: risky ? 'red-dart-finale' : 'scissors-finale', label: risky ? 'Red Dart Duel' : 'Scissors Gauntlet', icon: risky ? '🔺' : '✂️', description: risky ? 'Race the Red Dart through its signature weave.' : 'Survive a multi-stage scissors gauntlet.', rewardMultiplier: risky ? 1.75 : 1.35 }
    : MODIFIERS[hash(journey.seed, journey.stepIndex, lane) % MODIFIERS.length]
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
  }
}

export function createJourney(seed = Date.now(), now = Date.now()) {
  const normalizedSeed = Math.abs(Math.trunc(Number(seed))) || 1
  return {
    version: JOURNEY_VERSION,
    id: `journey-${normalizedSeed}-${Math.trunc(now)}`,
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
  }
}

export function getRouteChoices(journey) {
  if (!journey || journey.status !== 'active' || !JOURNEY_STEPS[journey.stepIndex]) return []
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
  const earnedStampIds = journey.earnedStampIds.includes(route.stampId)
    ? journey.earnedStampIds
    : [...journey.earnedStampIds, route.stampId]
  const nextStep = journey.stepIndex + 1
  if (nextStep < JOURNEY_STEPS.length) {
    return { ...journey, ...totals, stepIndex: nextStep, selectedRouteId: null, completedRouteIds, earnedStampIds, attemptNumber: 1, lastOutcomeReceiptId: outcome.receiptId || null }
  }
  const postcard = {
    id: `${journey.id}-postcard`,
    journeyId: journey.id,
    completedAt: Date.now(),
    pilotId: journey.pilotId,
    routePath: completedRouteIds,
    stampIds: earnedStampIds,
    totalDistance: totals.totalDistance,
    totalStars: totals.totalStars,
    rivalBeaten: !!outcome.rivalBeaten,
    perfect: earnedStampIds.length === JOURNEY_STEPS.length,
  }
  return { ...journey, ...totals, stepIndex: nextStep, selectedRouteId: null, completedRouteIds, earnedStampIds, status: 'complete', postcard, attemptNumber: 1, lastOutcomeReceiptId: outcome.receiptId || null }
}
