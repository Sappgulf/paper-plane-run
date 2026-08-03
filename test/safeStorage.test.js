import { describe, expect, test, vi } from 'vitest'
import { safeGetItem, safeRemoveItem, safeSetItem, safeSetStorageItem } from '../src/game/safe-storage.js'

describe('safeSetItem', () => {
  test('writes through to localStorage and reports success', () => {
    expect(safeSetItem('k', 'v')).toBe(true)
    expect(localStorage.getItem('k')).toBe('v')
  })

  test('swallows a throwing localStorage.setItem and reports failure', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => safeSetItem('k', 'v')).not.toThrow()
    expect(safeSetItem('k', 'v')).toBe(false)
    spy.mockRestore()
  })

  test('guards reads, writes, and removals on an unavailable storage object', () => {
    const blocked = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }
    expect(safeGetItem(blocked, 'k')).toEqual({ value: null, ok: false })
    expect(safeSetStorageItem(blocked, 'k', 'v')).toBe(false)
    expect(safeRemoveItem(blocked, 'k')).toBe(false)
  })
})
