import { describe, expect, test } from 'vitest'
import { CONFETTI_PALETTES, confettiColors } from '../src/game/confetti-palette.js'

describe('confetti palettes', () => {
  test('exposes a distinct color list per event family', () => {
    for (const colors of Object.values(CONFETTI_PALETTES)) {
      expect(colors.length).toBeGreaterThanOrEqual(3)
      for (const color of colors) expect(Number.isInteger(color)).toBe(true)
    }
    expect(CONFETTI_PALETTES.gold).not.toEqual(CONFETTI_PALETTES.classic)
    expect(CONFETTI_PALETTES.fever).not.toEqual(CONFETTI_PALETTES.route)
  })

  test('falls back to classic for unknown palette ids', () => {
    expect(confettiColors('nope')).toEqual(CONFETTI_PALETTES.classic)
    expect(confettiColors()).toEqual(CONFETTI_PALETTES.classic)
    expect(confettiColors('gold')).toEqual(CONFETTI_PALETTES.gold)
  })
})
