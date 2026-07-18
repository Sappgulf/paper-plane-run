/**
 * Pure near-miss juice: float copy, shake, confetti bursts, and HUD tier classes.
 * Reduced-motion callers still use the same labels but skip camera excess.
 */

export function describeNearMissFloat(combo = 0) {
  const count = Math.max(0, Math.floor(Number(combo) || 0))
  if (count >= 10) return `${count}x LEGENDARY!`
  if (count >= 6) return `${count}x INSANE!`
  if (count >= 3) return `${count}x NEAR MISS!`
  return 'Near miss!'
}

export function nearMissShakeAmount(combo = 0) {
  const count = Math.max(0, Math.floor(Number(combo) || 0))
  return 0.1 + Math.min(count, 12) * 0.025
}

/** How many confetti bursts to spawn (each burst is one spawnConfetti call). */
export function nearMissConfettiBursts(combo = 0) {
  const count = Math.max(0, Math.floor(Number(combo) || 0))
  if (count >= 10) return 3
  if (count >= 6) return 2
  return 1
}

/** CSS tier class for the combo HUD card. */
export function nearMissHudTier(combo = 0) {
  const count = Math.max(0, Math.floor(Number(combo) || 0))
  if (count >= 10) return 'combo-tier-legend'
  if (count >= 6) return 'combo-tier-hot'
  if (count >= 3) return 'combo-tier-warm'
  return ''
}

export function feverEnterShake() {
  return 0.55
}

export function feverConfettiOffsets() {
  return Object.freeze([
    Object.freeze({ y: 0, z: 0 }),
    Object.freeze({ y: 0.7, z: 1 }),
    Object.freeze({ y: -0.7, z: -1 }),
    Object.freeze({ y: 0.3, z: 0.5 }),
  ])
}
