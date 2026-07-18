import { getFeverTuning } from './upgrade-runtime.js'

export const FEVER_SCORE_MUL = 1.5

/**
 * Combo HUD text that teases the remaining near-misses until Fever Focus fires.
 */
export function describeComboHudValue({
  combo = 0,
  feverActive = false,
  feverThresholdBonus = 0,
} = {}) {
  const count = Math.max(0, Math.floor(Number(combo) || 0))
  if (feverActive) return `${count}x`
  const threshold = getFeverTuning({ feverThresholdBonus }).threshold
  const toFever = Math.max(0, threshold - count)
  return toFever > 0 && toFever <= 3 ? `${count}x · 🔥${toFever}` : `${count}x`
}

export function shouldTriggerFever({
  combo = 0,
  feverActive = false,
  feverThresholdBonus = 0,
} = {}) {
  if (feverActive) return false
  const threshold = getFeverTuning({ feverThresholdBonus }).threshold
  return Math.max(0, Math.floor(Number(combo) || 0)) >= threshold
}

export function createFeverState({
  feverThresholdBonus = 0,
  feverDurationBonus = 0,
} = {}) {
  const tuning = getFeverTuning({ feverThresholdBonus, feverDurationBonus })
  return Object.freeze({
    active: true,
    timer: tuning.duration,
    threshold: tuning.threshold,
    duration: tuning.duration,
    scoreMul: FEVER_SCORE_MUL,
  })
}

/** Tick an active fever window; returns the next frozen state. */
export function advanceFeverState(state, dt = 0) {
  if (!state?.active) {
    return Object.freeze({ active: false, timer: 0, threshold: state?.threshold ?? 8, duration: state?.duration ?? 4, scoreMul: FEVER_SCORE_MUL })
  }
  const remaining = Math.max(0, Number(state.timer) - Math.max(0, Number(dt) || 0))
  if (remaining <= 0) {
    return Object.freeze({
      active: false,
      timer: 0,
      threshold: state.threshold,
      duration: state.duration,
      scoreMul: FEVER_SCORE_MUL,
    })
  }
  return Object.freeze({
    active: true,
    timer: remaining,
    threshold: state.threshold,
    duration: state.duration,
    scoreMul: FEVER_SCORE_MUL,
  })
}

export function describeFeverHudValue({ active = false, timer = 0, scoreMul = FEVER_SCORE_MUL } = {}) {
  if (!active) return `${scoreMul}x`
  return `${scoreMul}x · ${Math.max(0, timer).toFixed(1)}s`
}
