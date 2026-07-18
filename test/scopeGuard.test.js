import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { UPGRADES } from '../src/upgrades.js'
import { BOSS_ART } from '../src/game/boss-art.js'

/**
 * Scope guard: stars-only economy, no brand-new game modes.
 * Boss roster and Journey chapters may expand when product-approved.
 */
describe('product scope guard', () => {
  test('keeps the upgrade catalog closed and the approved boss set exclusive', () => {
    expect(UPGRADES.map(({ id }) => id)).toEqual([
      'handling', 'lift', 'glide', 'magnet', 'shield', 'luck', 'wingspan',
      'trail', 'turbo', 'guardian', 'weapon', 'fever', 'streak', 'wealth',
    ])
    expect(Object.keys(BOSS_ART).sort()).toEqual(['scissors', 'stapler', 'wind'])
  })

  test('does not introduce a second wallet currency or new mode entry points in the shell', () => {
    const shell = readFileSync('src/main.js', 'utf8')
    const markup = readFileSync('index.html', 'utf8')
    expect(shell).not.toMatch(/gems?Wallet|secondCurrency|premiumCurrency/)
    expect(markup).not.toMatch(/id="mode-boss-rush"|id="mode-battle"|New Mode/)
  })
})
