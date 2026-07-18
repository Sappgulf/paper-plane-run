const TIMING = Object.freeze({
  // Longer warning/pressure windows so the safe lane is readable before commit.
  easy: Object.freeze({ warning: 1.55, pressure: 1.65 }),
  normal: Object.freeze({ warning: 1.25, pressure: 1.4 }),
  hard: Object.freeze({ warning: 1.0, pressure: 1.15 }),
})

const LANE_Y = Object.freeze({ '-1': 6, 0: 10, 1: 14 })
const LANE_LABEL = Object.freeze({ '-1': 'LOW', 0: 'CENTER', 1: 'HIGH' })

// Generous passages — hard stays tighter than normal but still flyable.
const PASSAGES = Object.freeze({
  easy: Object.freeze({ halfWidth: 4.0, halfHeight: 3.9 }),
  normal: Object.freeze({ halfWidth: 3.65, halfHeight: 3.55 }),
  hard: Object.freeze({ halfWidth: 3.25, halfHeight: 3.15 }),
})

export const BOSS_KINDS = Object.freeze(['scissors', 'wind', 'stapler'])

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

/** Slow the world only while the boss is in the readable approach band. */
export function getBossApproachSpeedScale({ bossZ } = {}) {
  const z = Number(bossZ)
  if (!Number.isFinite(z) || z <= 0) return 1
  if (z <= 50) return 0.72
  if (z <= 90) return 0.78
  return 1
}

/** Clear lethal clutter farther out so the approach lane stays empty. */
export function shouldClearForBossApproach({ type, z } = {}) {
  return ['bird', 'scissors', 'building'].includes(type) && Number(z) >= 0 && Number(z) <= 160
}

/** Stars and recovery granted when a boss is successfully threaded. */
export function getBossClearReward() {
  return Object.freeze({
    stars: 5,
    recoveryMeters: 95,
    invulnSeconds: 0.65,
    hitStopSeconds: 0.06,
  })
}

export function describeBossPhase({ kind, phase, safeLane } = {}) {
  const laneLabel = LANE_LABEL[safeLane] || 'CENTER'
  if (phase === 'final-pass') {
    const headline = kind === 'wind'
      ? `Final gust · commit ${laneLabel}`
      : kind === 'stapler'
        ? `Jaws closing · commit ${laneLabel}`
        : `Final cut · commit ${laneLabel}`
    return Object.freeze({
      laneLabel,
      headline,
      intensity: 1,
      hitStopSeconds: 0.03,
    })
  }
  if (phase === 'pressure') {
    const headline = kind === 'wind'
      ? `Wind rising · hold ${laneLabel}`
      : kind === 'stapler'
        ? `Stapler press · hold ${laneLabel}`
        : `Blades closing · hold ${laneLabel}`
    return Object.freeze({
      laneLabel,
      headline,
      intensity: 0.72,
      hitStopSeconds: 0.015,
    })
  }
  const headline = kind === 'wind'
    ? `Wind opening · ${laneLabel} lane`
    : kind === 'stapler'
      ? `Stapler gate · ${laneLabel} lane`
      : `Scissors opening · ${laneLabel} lane`
  return Object.freeze({
    laneLabel,
    headline,
    intensity: 0.35,
    hitStopSeconds: 0,
  })
}

export function bossKindForIndex(index = 0) {
  return BOSS_KINDS[Math.abs(Math.floor(Number(index) || 0)) % BOSS_KINDS.length]
}

export function bossCrashReason(kind) {
  if (kind === 'wind') return 'Blown into the wind turbines!'
  if (kind === 'stapler') return 'Pinned by the stapler jaws!'
  return 'Snipped by the boss scissors!'
}

export function bossBannerEmoji(kind) {
  if (kind === 'wind') return '🌬️'
  if (kind === 'stapler') return '📎'
  return '✂️'
}

function seededLane(kind, seed) {
  const salt = kind === 'wind' ? 17 : kind === 'stapler' ? 29 : 5
  return [-1, 0, 1][Math.abs((Number(seed) || 0) + salt) % 3]
}

function shapeCueFor(kind, colorblind) {
  if (!colorblind) return kind
  if (kind === 'wind') return 'radial-vane-ring'
  if (kind === 'stapler') return 'horizontal-jaw-slot'
  return 'crossed-blade-chevron'
}

export function createBossEncounter({
  kind,
  difficulty = 'normal',
  encounterSeed = 0,
  reducedMotion = false,
  colorblind = false,
} = {}) {
  if (!BOSS_KINDS.includes(kind)) throw new TypeError(`Unknown boss kind: ${kind}`)
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
      shapeCue: shapeCueFor(kind, colorblind),
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
