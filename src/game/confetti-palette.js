/**
 * Confetti palettes per event family. Burst colors used to be hardcoded
 * classic-warm everywhere; tying palette to meaning makes feedback legible at
 * a glance — gold reads as currency, rainbow as fever, blue/violet as route
 * progress.
 */

const CLASSIC = Object.freeze([0xfbbf24, 0xf0956a, 0x60a5fa, 0xa78bfa, 0x34d399])
const GOLD = Object.freeze([0xfbbf24, 0xf59e0b, 0xfde68a, 0xfffbeb])
const FEVER = Object.freeze([0xf87171, 0xfbbf24, 0x34d399, 0x60a5fa, 0xe879f9])
const ROUTE = Object.freeze([0x60a5fa, 0xa78bfa, 0x38bdf8, 0xc4b5fd])

export const CONFETTI_PALETTES = Object.freeze({
  classic: CLASSIC,
  gold: GOLD,
  fever: FEVER,
  route: ROUTE,
})

/** Resolve a palette id to its color list; unknown ids fall back to classic. */
export function confettiColors(palette = 'classic') {
  return CONFETTI_PALETTES[palette] || CLASSIC
}
