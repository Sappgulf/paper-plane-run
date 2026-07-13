const TIMING = Object.freeze({
  easy: Object.freeze({ warning: 1.35, pressure: 1.5 }),
  normal: Object.freeze({ warning: 1.05, pressure: 1.25 }),
  hard: Object.freeze({ warning: 0.8, pressure: 1.0 }),
})

const LANE_Y = Object.freeze({ '-1': 6, 0: 10, 1: 14 })

function seededLane(kind, seed) {
  const salt = kind === 'wind' ? 17 : 5
  return [-1, 0, 1][Math.abs((Number(seed) || 0) + salt) % 3]
}

export function createBossEncounter({
  kind,
  difficulty = 'normal',
  encounterSeed = 0,
  reducedMotion = false,
  colorblind = false,
} = {}) {
  if (!['scissors', 'wind'].includes(kind)) throw new TypeError(`Unknown boss kind: ${kind}`)
  const timing = TIMING[difficulty] || TIMING.normal
  const safeLane = seededLane(kind, encounterSeed)
  let elapsed = 0
  let terminal = null

  const snapshot = () => {
    const phase = terminal || (elapsed < timing.warning
      ? 'warning'
      : elapsed < timing.warning + timing.pressure ? 'pressure' : 'final-pass')
    const pressure = phase === 'warning'
      ? 0
      : phase === 'pressure'
        ? Math.min(1, (elapsed - timing.warning) / timing.pressure)
        : 1
    return Object.freeze({
      kind,
      phase,
      safeLane,
      safeY: LANE_Y[safeLane],
      warningSeconds: Math.max(0, timing.warning - elapsed),
      pressure,
      completed: phase === 'complete',
      failed: phase === 'failed',
      motionAllowed: !reducedMotion,
      shapeCue: colorblind
        ? (kind === 'wind' ? 'radial-vane-ring' : 'crossed-blade-chevron')
        : kind,
    })
  }

  return Object.freeze({
    snapshot,
    step(dt) {
      if (!terminal) elapsed += Math.max(0, Number(dt) || 0)
      return snapshot()
    },
    pass() {
      if (!terminal) terminal = 'complete'
      return snapshot()
    },
    collide() {
      if (!terminal) terminal = 'failed'
      return snapshot()
    },
  })
}

