import { describe, expect, test } from 'vitest'
import { emptyLayout, editorPlacement, layoutToShareCode, parseCompact, getLayoutFinishDistance } from '../src/editor.js'

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

test('editor placement follows the marked grid and selected flight height', () => {
  const point = {x:180, y:100, width:360, height:200}
  expect(editorPlacement({...point,tool:'star',altitude:'14'})).toEqual({t:'star',x:0,y:14,z:100})
  expect(editorPlacement({...point,tool:'building',altitude:'14'})).toEqual({t:'building',x:0,y:0,z:100})
  expect(editorPlacement({...point,y:10,tool:'bird',altitude:'bad'})).toMatchObject({y:10,z:0})
  expect(editorPlacement({...point,y:190,tool:'bird',altitude:'6'})).toMatchObject({y:6,z:200})
  expect(editorPlacement({...point,width:0})).toBeNull()
})


test('custom courses finish at the editor marker or after the last imported item', () => {
  expect(getLayoutFinishDistance(emptyLayout())).toBe(200)
  expect(getLayoutFinishDistance({items:[{z:20},{z:199}]})).toBe(200)
  expect(getLayoutFinishDistance({items:[{z:420},{z:30}]})).toBe(420)
  expect(getLayoutFinishDistance({items:[{z:NaN},{z:Infinity},null]})).toBe(200)
})
