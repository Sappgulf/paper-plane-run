const RIVAL_SPEED = Object.freeze({ easy: 20, normal: 28, hard: 36 })

export function createRivalState(config = {}) {
  const targetDistance = Math.max(1, Number(config.targetDistance) || 500)
  const speed = Math.max(1, Number(config.speed) || RIVAL_SPEED[config.difficulty] || RIVAL_SPEED.normal)
  return {
    seed: Number(config.seed) || 1,
    targetDistance,
    speed,
    elapsed: 0,
    playerDistance: 0,
    playerFinishedAt: null,
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

export function advanceRivalRace(state, playerDistance, dt) {
  if (!state) return
  const step = Math.max(0, Number(dt) || 0)
  const current = Math.max(0, Number(playerDistance) || 0)
  if (state.playerFinishedAt === null && current >= state.targetDistance) {
    const gained = current - state.playerDistance
    const fraction = gained > 0 ? Math.min(1, Math.max(0, (state.targetDistance - state.playerDistance) / gained)) : 1
    state.playerFinishedAt = state.elapsed + step * fraction
  }
  state.playerDistance = current
  state.elapsed += step
}

export function getRivalRaceResult(state) {
  if (!state) return { playerFinished: false, rivalFinished: false, won: false, rivalDistance: 0 }
  const rivalFinishAt = state.targetDistance / state.speed
  return {
    playerFinished: state.playerFinishedAt !== null,
    rivalFinished: state.elapsed >= rivalFinishAt,
    won: state.playerFinishedAt !== null && state.playerFinishedAt < rivalFinishAt,
    rivalDistance: Math.min(state.targetDistance, state.elapsed * state.speed),
  }
}

// Positive means the player is ahead; both positions stop at the finish line.
export function getRivalDelta(state, playerDistance) {
  return Math.round(Math.min(state.targetDistance, Math.max(0, Number(playerDistance) || 0)) - getRivalRaceResult(state).rivalDistance)
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
