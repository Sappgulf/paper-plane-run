import { describe, expect, test, vi } from 'vitest'
import { safeSetItem } from '../src/game/safe-storage.js'

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
})
