import { describe, expect, test } from 'vitest'
import { emptyLayout, layoutToShareCode, parseCompact } from '../src/editor.js'

describe('route share codes', () => {
  test('round-trips a route layout', () => {
    const layout = emptyLayout('River Run')
    layout.items.push({ t: 'star', x: 1, y: 2, z: 30 })

    expect(parseCompact(layoutToShareCode(layout))).toEqual(layout)
  })

  test('rejects malformed input', () => {
    expect(parseCompact('not-a-layout')).toBeNull()
  })
})
