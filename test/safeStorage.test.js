import { describe, expect, test, vi } from 'vitest'
import { safeGetItem, safeRemoveItem, safeSetItem } from '../src/game/safe-storage.js'

describe('safeSetItem', () => {
  test('writes through to localStorage and reports success', () => {
    expect(safeSetItem('k', 'v')).toBe(true)
    expect(localStorage.getItem('k')).toBe('v')
  })

  test('reads safely and falls back when the storage object throws', () => {
    expect(safeGetItem('missing', 'fallback')).toBe('fallback')
    const throwing = {
      getItem() { throw new DOMException('SecurityError') },
      setItem() {},
      removeItem() {},
    }
    expect(safeGetItem('k', 'fallback', throwing)).toBe('fallback')
    expect(safeRemoveItem('k', throwing)).toBe(true)
  })

  test('swallows a throwing localStorage.setItem and reports failure', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => safeSetItem('k', 'v')).not.toThrow()
    expect(safeSetItem('k', 'v')).toBe(false)
    spy.mockRestore()
  })
})
