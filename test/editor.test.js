import { describe, expect, test } from 'vitest'
import { emptyLayout, layoutToShareCode, parseCompact, getLayoutFinishDistance } from '../src/editor.js'

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


test('custom courses finish at the editor marker or after the last imported item', () => {
  expect(getLayoutFinishDistance(emptyLayout())).toBe(200)
  expect(getLayoutFinishDistance({items:[{z:20},{z:199}]})).toBe(200)
  expect(getLayoutFinishDistance({items:[{z:420},{z:30}]})).toBe(420)
  expect(getLayoutFinishDistance({items:[{z:NaN},{z:Infinity},null]})).toBe(200)
})
