const TIMING = Object.freeze({
  easy: Object.freeze({ warning: 1.35, pressure: 1.5 }),
  normal: Object.freeze({ warning: 1.05, pressure: 1.25 }),
  hard: Object.freeze({ warning: 0.8, pressure: 1.0 }),
})

const LANE_Y = Object.freeze({ '-1': 6, 0: 10, 1: 14 })
const LANE_LABEL = Object.freeze({ '-1': 'LOW', 0: 'CENTER', 1: 'HIGH' })
const PASSAGES = Object.freeze({
  easy: Object.freeze({ halfWidth: 3.6, halfHeight: 3.5 }),
  normal: Object.freeze({ halfWidth: 3.3, halfHeight: 3.2 }),
  hard: Object.freeze({ halfWidth: 2.9, halfHeight: 2.8 }),
})

export function getBossPassage({ difficulty = 'normal' } = {}) {
  return PASSAGES[difficulty] || PASSAGES.normal
}

export function isInsideBossPassage({
  playerX = 0,
  playerY = 0,
  bossX = 0,
  gapY = 10,
  passage = PASSAGES.normal,
} = {}) {
  const halfWidth = Math.max(0, Number(passage?.halfWidth) || 0)
  const halfHeight = Math.max(0, Number(passage?.halfHeight) || 0)
  return Math.abs((Number(playerX) || 0) - (Number(bossX) || 0)) < halfWidth &&
    Math.abs((Number(playerY) || 0) - (Number(gapY) || 0)) < halfHeight
}

export function getBossApproachSpeedScale({ bossZ } = {}) {
  const z = Number(bossZ)
  return Number.isFinite(z) && z > 0 && z <= 80 ? 0.84 : 1
}

export function shouldClearForBossApproach({ type, z } = {}) {
  return ['bird', 'scissors', 'building'].includes(type) && Number(z) >= 0 && Number(z) <= 140
}

export function describeBossPhase({ kind, phase, safeLane } = {}) {
  const laneLabel = LANE_LABEL[safeLane] || 'CENTER'
  if (phase === 'final-pass') {
    return Object.freeze({
      laneLabel,
      headline: kind === 'wind' ? `Final gust · commit ${laneLabel}` : `Final cut · commit ${laneLabel}`,
      intensity: 1,
      hitStopSeconds: 0.035,
    })
  }
  if (phase === 'pressure') {
    return Object.freeze({
      laneLabel,
      headline: kind === 'wind' ? `Wind rising · hold ${laneLabel}` : `Blades closing · hold ${laneLabel}`,
      intensity: 0.72,
      hitStopSeconds: 0.02,
    })
  }
  return Object.freeze({
    laneLabel,
    headline: kind === 'wind' ? `Wind opening · ${laneLabel} lane` : `Scissors opening · ${laneLabel} lane`,
    intensity: 0.35,
    hitStopSeconds: 0,
  })
}

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
  const passage = getBossPassage({ difficulty })
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
      passage,
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
