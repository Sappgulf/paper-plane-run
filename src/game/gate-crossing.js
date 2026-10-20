/**
 * Boss gates are resolved by a swept crossing rather than a fixed z-slice.
 *
 * A frame at the dt cap can move the world several units. The old test only
 * sampled `|dz| < 1.05`, so a fast/tucked plane could jump from just ahead of
 * the gate to behind it without ever entering the slice: no pass reward, no
 * crash. This is the pure crossing predicate the collision loop uses.
 */
export const BOSS_PASS_LINE = -0.55

export function crossedPassLine(previousDz, dz, passLine = BOSS_PASS_LINE) {
  const previous = Number(previousDz)
  const current = Number(dz)
  const line = Number(passLine)
  if (!Number.isFinite(previous) || !Number.isFinite(current) || !Number.isFinite(line)) return false
  return previous > line && current <= line
}
