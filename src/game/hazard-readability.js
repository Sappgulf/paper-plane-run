/**
 * Hazard warning rings are the collision boundary, not decoration.
 *
 * The old ring used a decorative lethalRadius and then shrank to 0.85x at close
 * range — smaller than the 1.06–1.96 unit hit envelope — so a clean-looking
 * pass could kill in "open air". This keeps the close ring at or above the
 * real damage radius and only enlarges it with distance for haze readability.
 */

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback))
}

export function hazardWarningScale({
  z = 0,
  hitRadius = 0.85,
  diving = false,
  clock = 0,
  minScale = 1,
  maxScale = 2.6,
} = {}) {
  const approach = Math.min(maxScale, Math.max(minScale, nonNegative(z) / 60))
  const threat = diving ? 1.12 + Math.sin(finite(clock) * 12) * 0.06 : 1
  return nonNegative(hitRadius, 0.85) * approach * threat
}
