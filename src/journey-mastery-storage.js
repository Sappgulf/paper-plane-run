import { createMasteryState, normalizeMasteryState } from './journey-mastery.js'

export const JOURNEY_MASTERY_STORAGE_KEY = 'paper-plane-run-journey-mastery-v1'

export function loadMastery(storage = localStorage) {
  const raw = storage.getItem(JOURNEY_MASTERY_STORAGE_KEY)
  if (!raw) return { mastery: createMasteryState(), recovered: false }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    storage.removeItem(JOURNEY_MASTERY_STORAGE_KEY)
    return { mastery: createMasteryState(), recovered: true }
  }
  const mastery = normalizeMasteryState(parsed)
  if (mastery) return { mastery, recovered: false }
  if (parsed && typeof parsed === 'object' && Number.isFinite(parsed.version)) {
    return { mastery: createMasteryState(), recovered: false }
  }
  storage.removeItem(JOURNEY_MASTERY_STORAGE_KEY)
  return { mastery: createMasteryState(), recovered: true }
}

export function saveMastery(storage = localStorage, mastery) {
  const normalized = normalizeMasteryState(mastery)
  if (!normalized) return false
  storage.setItem(JOURNEY_MASTERY_STORAGE_KEY, JSON.stringify(normalized))
  return true
}
