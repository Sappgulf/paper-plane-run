import { JOURNEY_STEPS, JOURNEY_VERSION, PILOTS } from './journey.js'

export const JOURNEY_STORAGE_KEY = 'paper-plane-run-journey-v1'
export const JOURNEY_RECEIPTS_KEY = 'paper-plane-run-journey-receipts-v1'

function validJourney(value) {
  return !!value && value.version === JOURNEY_VERSION && typeof value.id === 'string' &&
    Number.isInteger(value.seed) && Number.isInteger(value.stepIndex) && value.stepIndex >= 0 &&
    value.stepIndex <= JOURNEY_STEPS.length && !!PILOTS[value.pilotId] &&
    Array.isArray(value.completedRouteIds) && Array.isArray(value.earnedStampIds) &&
    ['active', 'complete'].includes(value.status) && Number.isInteger(value.attemptNumber) && value.attemptNumber >= 1 &&
    (value.lastOutcomeReceiptId === null || typeof value.lastOutcomeReceiptId === 'string')
}

function migrateJourney(value) {
  if (!value || value.version !== 1) return value
  return {
    ...value,
    version: JOURNEY_VERSION,
    attemptNumber: 1,
    lastOutcomeReceiptId: null,
    objectiveResults: Array.isArray(value.objectiveResults) ? value.objectiveResults : [],
  }
}

export function loadJourney(storage = localStorage) {
  const raw = storage.getItem(JOURNEY_STORAGE_KEY)
  if (!raw) return { journey: null, recovered: false }
  try {
    const journey = migrateJourney(JSON.parse(raw))
    if (!validJourney(journey)) throw new Error('Invalid Journey save')
    storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(journey))
    return { journey, recovered: false }
  } catch {
    storage.removeItem(JOURNEY_STORAGE_KEY)
    return { journey: null, recovered: true }
  }
}

export function saveJourney(storage = localStorage, journey) {
  if (!validJourney(journey)) return false
  storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(journey))
  return true
}

export function clearJourney(storage = localStorage) {
  storage.removeItem(JOURNEY_STORAGE_KEY)
}

export function applyJourneyRewardOnce(storage = localStorage, reward) {
  if (!reward?.id) return false
  let receipts = []
  try { receipts = JSON.parse(storage.getItem(JOURNEY_RECEIPTS_KEY) || '[]') } catch { receipts = [] }
  if (!Array.isArray(receipts)) receipts = []
  if (receipts.includes(reward.id)) return false
  receipts.push(reward.id)
  storage.setItem(JOURNEY_RECEIPTS_KEY, JSON.stringify(receipts.slice(-200)))
  return true
}
