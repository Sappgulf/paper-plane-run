export const FIRST_FLIGHT_GRACE_SECONDS = 4

export function shouldGrantLaunchGrace({ runKind, tutorialDone, completedRuns }) {
  if (runKind === 'tutorial') return true
  return runKind === 'classic' && !tutorialDone && completedRuns === 0
}

export function isLaunchGraceActive(elapsedSeconds, graceSeconds) {
  return graceSeconds > 0 && elapsedSeconds < graceSeconds
}
