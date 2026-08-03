import { JOURNEY_VERSION, PILOTS, stepsForChapter } from './journey.js'
import { getSafeStorage, safeGetItem, safeRemoveItem, safeSetStorageItem } from './game/safe-storage.js'

export const JOURNEY_STORAGE_KEY = 'paper-plane-run-journey-v1'
export const JOURNEY_RECEIPTS_KEY = 'paper-plane-run-journey-receipts-v1'
export const JOURNEY_CHAPTER_UNLOCK_KEY = 'paper-plane-run-journey-chapters'

function validJourney(value) {
  const chapter = value?.chapter === 2 ? 2 : 1
  const steps = stepsForChapter(chapter)
  return !!value && value.version === JOURNEY_VERSION && typeof value.id === 'string' &&
    Number.isInteger(value.seed) && Number.isInteger(value.stepIndex) && value.stepIndex >= 0 &&
    value.stepIndex <= steps.length && !!PILOTS[value.pilotId] &&
    Array.isArray(value.completedRouteIds) && Array.isArray(value.earnedStampIds) &&
    ['active', 'complete'].includes(value.status) && Number.isInteger(value.attemptNumber) && value.attemptNumber >= 1 &&
    (value.lastOutcomeReceiptId === null || typeof value.lastOutcomeReceiptId === 'string') &&
    (value.chapter === 1 || value.chapter === 2 || value.chapter == null)
}

function migrateJourney(value) {
  if (!value) return value
  if (value.version === 1) {
    return {
      ...value,
      version: JOURNEY_VERSION,
      chapter: 1,
      attemptNumber: 1,
      lastOutcomeReceiptId: null,
      objectiveResults: Array.isArray(value.objectiveResults) ? value.objectiveResults : [],
    }
  }
  if (value.version === 2) {
    return {
      ...value,
      version: JOURNEY_VERSION,
      chapter: value.chapter === 2 ? 2 : 1,
      attemptNumber: Number.isInteger(value.attemptNumber) ? value.attemptNumber : 1,
      lastOutcomeReceiptId: value.lastOutcomeReceiptId ?? null,
      objectiveResults: Array.isArray(value.objectiveResults) ? value.objectiveResults : [],
    }
  }
  if (value.version === JOURNEY_VERSION && (value.chapter == null)) {
    return { ...value, chapter: 1 }
  }
  return value
}

export function loadUnlockedChapters(storage = getSafeStorage()) {
  try {
    const raw = JSON.parse(safeGetItem(storage, JOURNEY_CHAPTER_UNLOCK_KEY).value || '[1]')
    const set = new Set(Array.isArray(raw) ? raw.map(Number).filter((n) => n === 1 || n === 2) : [1])
    set.add(1)
    return [...set].sort()
  } catch {
    return [1]
  }
}

export function unlockJourneyChapter(storage = getSafeStorage(), chapter = 2) {
  const unlocked = new Set(loadUnlockedChapters(storage))
  unlocked.add(Number(chapter) === 2 ? 2 : 1)
  const list = [...unlocked].sort()
  safeSetStorageItem(storage, JOURNEY_CHAPTER_UNLOCK_KEY, JSON.stringify(list))
  return list
}

export function isChapterUnlocked(storage = getSafeStorage(), chapter = 1) {
  if (chapter === 1) return true
  return loadUnlockedChapters(storage).includes(Number(chapter))
}

export function loadJourney(storage = getSafeStorage()) {
  const read = safeGetItem(storage, JOURNEY_STORAGE_KEY)
  if (!read.ok) return { journey: null, recovered: false, storageError: true }
  const raw = read.value
  if (!raw) return { journey: null, recovered: false }
  try {
    const journey = migrateJourney(JSON.parse(raw))
    if (!validJourney(journey)) throw new Error('Invalid Journey save')
    const normalized = safeSetStorageItem(storage, JOURNEY_STORAGE_KEY, JSON.stringify(journey))
    return normalized
      ? { journey, recovered: false }
      : { journey, recovered: false, storageError: true }
  } catch {
    const removed = safeRemoveItem(storage, JOURNEY_STORAGE_KEY)
    return removed
      ? { journey: null, recovered: true }
      : { journey: null, recovered: true, storageError: true }
  }
}

export function saveJourney(storage = getSafeStorage(), journey) {
  if (!validJourney(journey)) return false
  if (!safeSetStorageItem(storage, JOURNEY_STORAGE_KEY, JSON.stringify(journey))) return false
  // Completing Chapter 1 permanently unlocks Chapter 2.
  if (journey.status === 'complete' && (journey.chapter || 1) === 1) {
    unlockJourneyChapter(storage, 2)
    if (!isChapterUnlocked(storage, 2)) return false
  }
  return true
}

export function clearJourney(storage = getSafeStorage()) {
  return safeRemoveItem(storage, JOURNEY_STORAGE_KEY)
}

export function applyJourneyRewardOnce(storage = getSafeStorage(), reward) {
  if (!reward?.id) return false
  let receipts = []
  const read = safeGetItem(storage, JOURNEY_RECEIPTS_KEY)
  if (!read.ok) return false
  try { receipts = JSON.parse(read.value || '[]') } catch { receipts = [] }
  if (!Array.isArray(receipts)) receipts = []
  if (receipts.includes(reward.id)) return false
  receipts.push(reward.id)
  return safeSetStorageItem(storage, JOURNEY_RECEIPTS_KEY, JSON.stringify(receipts.slice(-200)))
}
