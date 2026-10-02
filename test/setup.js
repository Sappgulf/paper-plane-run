import { beforeEach } from 'vitest'

class MemoryStorage {
  #values = new Map()

  get length() { return this.#values.size }

  key(index) { return [...this.#values.keys()][index] ?? null }

  getItem(key) {
    return this.#values.has(String(key)) ? this.#values.get(String(key)) : null
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value))
  }

  removeItem(key) {
    this.#values.delete(String(key))
  }

  clear() {
    this.#values.clear()
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
})

beforeEach(() => localStorage.clear())
