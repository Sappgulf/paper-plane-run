import { describe, expect, test } from 'vitest'
import { SKINS } from '../src/skins.js'
import { drawPlanePortrait, PLANE_PORTRAIT_PREFIX } from '../src/game/plane-portrait.js'

const DRAW_CALLS = ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'save', 'restore', 'translate']

function recordingContext() {
  const calls = []
  const ctx = {}
  for (const name of DRAW_CALLS) ctx[name] = (...args) => calls.push([name, ...args])
  return { ctx, calls }
}

describe('plane portraits', () => {
  test('every skin draws a cut-paper portrait with finite coordinates', () => {
    for (const skin of SKINS) {
      const { ctx, calls } = recordingContext()
      drawPlanePortrait(ctx, 256, skin)
      expect(calls.some(([name]) => name === 'fill'), skin.id).toBe(true)
      expect(calls.some(([name]) => name === 'stroke'), skin.id).toBe(true)
      for (const [name, ...args] of calls) {
        for (const value of args) {
          if (typeof value === 'number') expect(Number.isFinite(value), `${skin.id} ${name}`).toBe(true)
        }
      }
    }
  })

  test('every skin points its portrait at the prefix the Hangar draws', () => {
    for (const skin of SKINS) {
      expect(skin.portrait.startsWith(PLANE_PORTRAIT_PREFIX), skin.id).toBe(true)
    }
  })

  test('each silhouette family draws a different portrait', () => {
    const families = ['classic', 'dart', 'glider', 'stunt']
    const signatures = families.map((silhouette) => {
      const { ctx, calls } = recordingContext()
      drawPlanePortrait(ctx, 256, { body: 0xffffff, accent: 0x000000, silhouette })
      return JSON.stringify(calls)
    })
    expect(new Set(signatures).size).toBe(families.length)
  })
})
