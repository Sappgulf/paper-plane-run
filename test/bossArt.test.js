import { describe, expect, test } from 'vitest'
import * as THREE from 'three'

import { BOSS_ART, createBossArtOverlay, getBossBadgeLayout } from '../src/game/boss-art.js'

const BOSS_IDS = ['punch', 'scissors', 'stapler', 'wind']
const CANVAS_PX = 256

// A recording stand-in for a 2D canvas context. It tracks the current
// transform and clip state so the test can check where every visible path
// lands in canvas pixels, without needing a DOM.
function createFakeCanvas(width, height) {
  const ctx = {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 0,
    lineJoin: null,
    fills: [],
    strokes: 0,
    points: [],
    _scale: 1,
    _originX: 0,
    _originY: 0,
    _tx: 0,
    _ty: 0,
    _clipped: 0,
    _stack: [],
    _record(x, y) {
      if (this._clipped) return
      this.points.push([
        this._scale * (x + this._tx) + this._originX,
        this._scale * (y + this._ty) + this._originY,
      ])
    },
    save() { this._stack.push([this._tx, this._ty, this._clipped]) },
    restore() {
      const [tx, ty, clipped] = this._stack.pop() || [0, 0, 0]
      this._tx = tx
      this._ty = ty
      this._clipped = clipped
    },
    setTransform(a, _b, _c, _d, e, f) {
      this._scale = a
      this._originX = e
      this._originY = f
    },
    translate(dx, dy) {
      this._tx += dx
      this._ty += dy
    },
    beginPath() {},
    closePath() {},
    moveTo(x, y) { this._record(x, y) },
    lineTo(x, y) { this._record(x, y) },
    arc(x, y, r) {
      this._record(x - r, y - r)
      this._record(x + r, y + r)
    },
    clip() { this._clipped += 1 },
    fill() { this.fills.push(this.fillStyle) },
    stroke() { this.strokes += 1 },
    fillRect() {},
  }
  return {
    width,
    height,
    getContext: (type) => (type === '2d' ? ctx : null),
    ctx,
  }
}

function createFactory() {
  const canvases = []
  const canvasFactory = (width, height) => {
    const canvas = createFakeCanvas(width, height)
    canvases.push(canvas)
    return canvas
  }
  return { canvasFactory, canvases }
}

describe('boss artwork registry', () => {
  test('points every boss emblem at a procedural paper draw, not a WebP file', () => {
    expect(Object.keys(BOSS_ART).sort()).toEqual(BOSS_IDS)

    for (const id of BOSS_IDS) {
      const art = BOSS_ART[id]
      expect(art.id).toBe(id)
      expect(art.texture).toBe(`paper:boss:${id}`)
      expect(art.preview).toBe(`paper:boss:${id}`)
      expect(art.texture.startsWith('paper:boss:')).toBe(true)
      expect(art.preview.startsWith('paper:boss:')).toBe(true)
    }
  })

  test('describes color and shape cues independently for accessible boss recognition', () => {
    for (const id of BOSS_IDS) {
      const { alt, palette, shape } = BOSS_ART[id]
      expect(alt).toBeTruthy()
      expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(palette.paper).toMatch(/^#[0-9a-f]{6}$/i)
      expect(shape.cue).toBeTruthy()
      expect(shape.silhouette).toBeTruthy()
    }

    expect(BOSS_ART.scissors.shape.cue).toMatch(/scissors|blade/i)
    expect(BOSS_ART.wind.shape.cue).toMatch(/vane|turbine/i)
    expect(BOSS_ART.stapler.shape.cue).toMatch(/stapler|jaw|slot/i)
  })

  test('draws each emblem on a canvas straight away, without loading a file', () => {
    for (const id of BOSS_IDS) {
      const { canvasFactory, canvases } = createFactory()
      const overlay = createBossArtOverlay({
        THREE,
        kind: id,
        size: 2.8,
        canvasFactory,
        loadTexture: () => {
          throw new Error(`loadTexture must not run for ${id}`)
        },
      })

      expect(overlay.name).toBe(`bossArt-${id}`)
      expect(canvases).toHaveLength(1)
      expect(canvases[0].width).toBe(CANVAS_PX)
      expect(canvases[0].height).toBe(CANVAS_PX)
      expect(overlay.material.map).toBeInstanceOf(THREE.CanvasTexture)
      expect(overlay.material.map.image).toBe(canvases[0])
      expect(overlay.visible).toBe(true)
    }
  })

  test('paints flat palette tones with a hard shadow and ink, and keeps artwork inside an 8% margin', () => {
    for (const id of BOSS_IDS) {
      const { canvasFactory, canvases } = createFactory()
      createBossArtOverlay({ THREE, kind: id, size: 2.8, canvasFactory, loadTexture: () => {} })
      const { ctx } = canvases[0]
      const { palette } = BOSS_ART[id]

      // Paper lit facet, the shaded facet, the shadow and the ink all show up.
      expect(ctx.fills).toContain(palette.paper)
      // Three passes (shadow, lit, shaded facet) for at least three pieces.
      expect(ctx.fills.length).toBeGreaterThanOrEqual(9)
      expect(ctx.strokes).toBeGreaterThan(0)
      expect(ctx.strokeStyle).toMatch(/^#[0-9a-f]{6}$/i)
      expect(ctx.lineWidth).toBeGreaterThan(0)

      // Every fill and outline point stays inside the 8% margin (sheet units 8..92).
      const low = CANVAS_PX * 0.08
      const high = CANVAS_PX * 0.92
      for (const [x, y] of ctx.points) {
        expect(x).toBeGreaterThanOrEqual(low)
        expect(x).toBeLessThanOrEqual(high)
        expect(y).toBeGreaterThanOrEqual(low)
        expect(y).toBeLessThanOrEqual(high)
      }
    }
  })

  test('skips drawing and leaves the badge hidden when no canvas can be made', () => {
    const overlay = createBossArtOverlay({
      THREE,
      kind: 'wind',
      size: 2.8,
      loadTexture: () => {
        throw new Error('paper emblems never load a file')
      },
    })

    expect(overlay).not.toBeNull()
    expect(overlay.material.map).toBeNull()
    expect(overlay.visible).toBe(false)
  })

  test('returns null for an unknown boss kind', () => {
    expect(createBossArtOverlay({ THREE, kind: 'missing', loadTexture: () => {} })).toBeNull()
  })
})

describe('badge layout', () => {
  test('badge layout keeps emblems outside the open portal hole', () => {
    const layout = getBossBadgeLayout({ halfWidth: 4, halfHeight: 3.7, gapY: 10 })
    expect(Math.abs(layout.left.x)).toBeGreaterThan(4)
    expect(Math.abs(layout.right.x)).toBeGreaterThan(4)
    expect(layout.top.y).toBeGreaterThan(10 + 3.7)
    expect(layout.right.scaleX).toBe(-1)
  })

  test('keeps the badge plane small so the portal centre stays flyable', () => {
    const { canvasFactory } = createFactory()
    const overlay = createBossArtOverlay({
      THREE,
      kind: 'scissors',
      size: 2.8,
      canvasFactory,
      loadTexture: () => {},
    })
    expect(overlay.geometry.parameters.width).toBeLessThanOrEqual(3.5)
  })
})
