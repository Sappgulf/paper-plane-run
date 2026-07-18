import { existsSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import * as THREE from 'three'

import { BOSS_ART, createBossArtOverlay } from '../src/game/boss-art.js'

const BOSS_IDS = ['scissors', 'stapler', 'wind']

describe('boss artwork registry', () => {
  test('ships compressed WebP boss art for both runtime and preview use', () => {
    expect(Object.keys(BOSS_ART).sort()).toEqual(BOSS_IDS)

    for (const id of BOSS_IDS) {
      const art = BOSS_ART[id]
      expect(art.id).toBe(id)
      expect(art.texture).toBe(`/assets/bosses/${id}.webp`)
      expect(art.preview).toBe(`/assets/bosses/${id}.webp`)
      expect(existsSync(new URL(`../public${art.texture}`, import.meta.url))).toBe(true)
      expect(existsSync(new URL(`../public${art.preview}`, import.meta.url))).toBe(true)
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

    expect(BOSS_ART.scissors.shape.cue).toMatch(/blade/i)
    expect(BOSS_ART.wind.shape.cue).toMatch(/vane|turbine/i)
    expect(BOSS_ART.stapler.shape.cue).toMatch(/jaw|slot/i)
  })

  test('keeps procedural boss geometry visible until its cosmetic badge loads or fails', () => {
    let loaded
    let failed
    const overlay = createBossArtOverlay({
      THREE,
      kind: 'scissors',
      size: 2.6,
      loadTexture: (url, onLoad, onError) => {
        expect(url).toBe(BOSS_ART.scissors.texture)
        loaded = onLoad
        failed = onError
      },
    })

    expect(overlay.name).toBe('bossArt-scissors')
    // Small badge only — never a full-face cover over the portal.
    expect(overlay.geometry.parameters.width).toBeLessThanOrEqual(3)
    expect(overlay.visible).toBe(false)
    expect(overlay.material.map).toBeNull()

    failed()
    expect(overlay.visible).toBe(false)

    const texture = new THREE.Texture()
    loaded(texture)
    expect(overlay.visible).toBe(true)
    expect(overlay.material.map).toBe(texture)
  })
})
