export function nextPauseState(current, visibilityState) {
  const paused = visibilityState === 'hidden'
  return {
    paused,
    resumed: current && !paused,
  }
}
