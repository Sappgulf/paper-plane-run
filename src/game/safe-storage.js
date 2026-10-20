/**
 * localStorage access throws in more states than most code expects — Safari
 * private browsing, quota exceeded, storage blocked by policy/extension. The
 * storage getter itself can throw, which would abort module evaluation if read
 * directly. Writes were already guarded; these helpers cover reads and provide
 * a process-local fallback so the game still boots when storage is unavailable.
 *
 * The fallback is intentionally memory-only: progress will not survive a reload
 * in that state, but the menu, flight and all UI stay playable.
 */
const memory = new Map()

function createMemoryStorage() {
  return {
    get length() {
      return memory.size
    },
    clear() {
      memory.clear()
    },
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null
    },
    key(index) {
      return Array.from(memory.keys())[index] ?? null
    },
    removeItem(key) {
      memory.delete(key)
    },
    setItem(key, value) {
      memory.set(String(key), String(value))
    },
  }
}

function resolveStorage(globalName) {
  try {
    // Do not probe with a write: quota-full storage still reads fine, and
    // switching to the memory fallback would hide existing save data.
    return globalThis?.[globalName] || createMemoryStorage()
  } catch {
    return createMemoryStorage()
  }
}

export const safeStorage = resolveStorage('localStorage')
export const safeSessionStorage = resolveStorage('sessionStorage')

/** Read without ever throwing; returns `fallback` when unavailable. */
export function safeGetItem(key, fallback = null, storage = safeStorage) {
  try {
    const value = storage.getItem(key)
    return value === null || value === undefined ? fallback : value
  } catch {
    return fallback
  }
}

export function safeSetItem(key, value, storage = safeStorage) {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key, storage = safeStorage) {
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
