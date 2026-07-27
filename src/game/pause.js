/** Brief invulnerability after unpausing so mobile tab-switch doesn't unfairly kill. */
export const RESUME_GRACE_SECONDS = 1.25

/**
 * Combine OS visibility and player-requested pause into one sim freeze flag.
 * `currentPaused` is the previous combined state so callers can detect a resume edge.
 */
export function nextPauseState(currentPaused, { hidden = false, manual = false } = {}) {
  const paused = Boolean(hidden || manual)
  const resumed = Boolean(currentPaused && !paused)
  return {
    paused,
    resumed,
    graceSeconds: resumed ? RESUME_GRACE_SECONDS : 0,
  }
}
