/**
 * Storage APIs can throw in Safari private browsing, quota-exhausted
 * profiles, and environments where persistence is blocked by policy or an
 * extension. Keep the low-level guard here so progression stores can fail
 * softly without leaving the game half-finished.
 */
export function getSafeStorage(kind = 'localStorage') {
  try {
    return globalThis?.[kind] || null
  } catch {
    return null
  }
}

export function safeGetItem(storage, key) {
  if (!storage) return { value: null, ok: false }
  try {
    return { value: storage.getItem(key) ?? null, ok: true }
  } catch {
    return { value: null, ok: false }
  }
}

export function safeValue(key, storage = getSafeStorage()) {
  return safeGetItem(storage, key).value
}

export function safeSetStorageItem(storage, key, value) {
  try {
    storage?.setItem(key, value)
    return Boolean(storage)
  } catch {
    return false
  }
}

export function safeRemoveItem(storage, key) {
  try {
    storage?.removeItem(key)
    return Boolean(storage)
  } catch {
    return false
  }
}

/** Backwards-compatible localStorage write helper used by older stores. */
export function safeSetItem(key, value) {
  return safeSetStorageItem(getSafeStorage(), key, value)
}
