import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { UPGRADES } from '../src/upgrades.js'
import { BOSS_ART } from '../src/game/boss-art.js'

/**
 * Scope guard for the current polish campaign: improve existing systems only.
 * No new game mode, boss type, currency, or combat system.
 */
describe('product scope guard', () => {
  test('keeps the upgrade catalog closed and the existing boss set exclusive', () => {
    expect(UPGRADES.map(({ id }) => id)).toEqual([
      'handling', 'lift', 'glide', 'magnet', 'shield', 'luck', 'wingspan',
      'trail', 'turbo', 'guardian', 'weapon', 'fever', 'streak', 'wealth',
    ])
    expect(Object.keys(BOSS_ART).sort()).toEqual(['scissors', 'wind'])
  })

  test('does not introduce a second wallet currency or new mode entry points in the shell', () => {
    const shell = readFileSync('src/main.js', 'utf8')
    const markup = readFileSync('index.html', 'utf8')
    expect(shell).not.toMatch(/gems?Wallet|secondCurrency|premiumCurrency/)
    expect(markup).not.toMatch(/id="mode-boss-rush"|id="mode-battle"|New Mode/)
  })
})
