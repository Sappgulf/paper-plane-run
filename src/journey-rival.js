export function createRivalState(config = {}) {
  return {
    seed: Number(config.seed) || 1,
    targetDistance: Number(config.targetDistance) || 850,
    seenCallouts: new Set(),
  }
}

export function sampleRivalPosition(state, distance) {
  const d = Math.max(0, Number(distance) || 0)
  const phase = (state.seed % 17) * 0.11
  return {
    x: Math.sin(d * 0.027 + phase) * 7.5,
    y: 9 + Math.cos(d * 0.019 + phase) * 3.2,
    distance: d,
  }
}

export function getRivalDelta(state, playerDistance) {
  return Math.round(state.targetDistance - (Number(playerDistance) || 0))
}

export function getRivalCallout(state, milestone) {
  if (state.seenCallouts.has(milestone)) return null
  const copy = {
    start: '🔺 Red Dart: Catch me if your folds can hold!',
    halfway: '🔺 Red Dart: The storm is only beginning.',
    final: '🔺 Red Dart: One last gate. Make it count.',
  }[milestone]
  if (!copy) return null
  state.seenCallouts.add(milestone)
  return copy
}
