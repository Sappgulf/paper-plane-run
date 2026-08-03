import { createMasteryState, normalizeMasteryState } from './journey-mastery.js'
import { getSafeStorage, safeGetItem, safeRemoveItem, safeSetStorageItem } from './game/safe-storage.js'

export const JOURNEY_MASTERY_STORAGE_KEY = 'paper-plane-run-journey-mastery-v1'

export function loadMastery(storage = getSafeStorage()) {
  const read = safeGetItem(storage, JOURNEY_MASTERY_STORAGE_KEY)
  if (!read.ok) return { mastery: createMasteryState(), recovered: false, storageError: true }
  const raw = read.value
  if (!raw) return { mastery: createMasteryState(), recovered: false }
  try {
    const mastery = normalizeMasteryState(JSON.parse(raw))
    if (!mastery) throw new Error('Invalid Journey mastery save')
    return { mastery, recovered: false }
  } catch {
    const removed = safeRemoveItem(storage, JOURNEY_MASTERY_STORAGE_KEY)
    return removed
      ? { mastery: createMasteryState(), recovered: true }
      : { mastery: createMasteryState(), recovered: true, storageError: true }
  }
}

export function saveMastery(storage = getSafeStorage(), mastery) {
  const normalized = normalizeMasteryState(mastery)
  if (!normalized) return false
  return safeSetStorageItem(storage, JOURNEY_MASTERY_STORAGE_KEY, JSON.stringify(normalized))
}
