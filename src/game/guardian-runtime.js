import { getGuardianState } from './upgrade-runtime.js'

/** Whether a Guardian charge should intercept this crash. */
export function shouldGuardianSave({ remaining = 0, isCleanEnd = false } = {}) {
  return !isCleanEnd && Math.floor(Number(remaining) || 0) > 0
}

/**
 * Consume one Guardian charge and return the next HUD-ready state plus banner.
 */
export function consumeGuardianCharge({ charges = 0, remaining = 0 } = {}) {
  const nextRemaining = Math.max(0, Math.floor(Number(remaining) || 0) - 1)
  const state = getGuardianState({ charges, remaining: nextRemaining })
  return Object.freeze({
    ...state,
    banner: '🛟 Guardian Crease saved you!',
    invulnSeconds: 1.4,
    shake: 0.65,
    bannerSeconds: 2.4,
  })
}
