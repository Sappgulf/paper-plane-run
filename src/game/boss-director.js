const TIMING = Object.freeze({
  // Long enough that the glowing portal is readable before the commit slice.
  easy: Object.freeze({ warning: 1.8, pressure: 1.7 }),
  normal: Object.freeze({ warning: 1.5, pressure: 1.5 }),
  hard: Object.freeze({ warning: 1.2, pressure: 1.25 }),
})

// Keep lanes in the middle flight band — avoid extreme low that hugs the ground.
const LANE_Y = Object.freeze({ '-1': 8, 0: 10, 1: 12 })
const LANE_LABEL = Object.freeze({ '-1': 'LOW', 0: 'CENTER', 1: 'HIGH' })

// Generous, flyable openings. Values are half-extents of the safe rectangle.
const PASSAGES = Object.freeze({
  easy: Object.freeze({ halfWidth: 4.4, halfHeight: 4.0 }),
  normal: Object.freeze({ halfWidth: 4.0, halfHeight: 3.7 }),
  hard: Object.freeze({ halfWidth: 3.6, halfHeight: 3.4 }),
})

/** Extra forgiveness so a grazing edge still counts as a pass. */
export const PASSAGE_EDGE_GRACE = 0.35

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
  grace = PASSAGE_EDGE_GRACE,
} = {}) {
  const halfWidth = Math.max(0, Number(passage?.halfWidth) || 0) + Math.max(0, Number(grace) || 0)
  const halfHeight = Math.max(0, Number(passage?.halfHeight) || 0) + Math.max(0, Number(grace) || 0)
  return Math.abs((Number(playerX) || 0) - (Number(bossX) || 0)) < halfWidth &&
    Math.abs((Number(playerY) || 0) - (Number(gapY) || 0)) < halfHeight
}

/** Slow the world only while the boss is in the readable approach band. */
export function getBossApproachSpeedScale({ bossZ } = {}) {
  const z = Number(bossZ)
  if (!Number.isFinite(z) || z <= 0) return 1
  if (z <= 55) return 0.62
  if (z <= 95) return 0.72
  return 1
}

/** Clear lethal clutter farther out so the approach lane stays empty. */
export function shouldClearForBossApproach({ type, z } = {}) {
  return ['bird', 'scissors', 'building'].includes(type) && Number(z) >= 0 && Number(z) <= 180
}

/** Stars and recovery granted when a boss is successfully threaded. */
export function getBossClearReward() {
  return Object.freeze({
    stars: 5,
    recoveryMeters: 110,
    invulnSeconds: 0.85,
    hitStopSeconds: 0.05,
  })
}

export function describeBossPhase({ kind, phase, safeLane } = {}) {
  const laneLabel = LANE_LABEL[safeLane] || 'CENTER'
  if (phase === 'final-pass') {
    const headline = kind === 'wind'
      ? `Final gust · fly the glowing ring · ${laneLabel}`
      : kind === 'stapler'
        ? `Jaws closing · fly the glowing ring · ${laneLabel}`
        : `Final cut · fly the glowing ring · ${laneLabel}`
    return Object.freeze({
      laneLabel,
      headline,
      intensity: 1,
      hitStopSeconds: 0.025,
    })
  }
  if (phase === 'pressure') {
    const headline = kind === 'wind'
      ? `Wind rising · hold the ring · ${laneLabel}`
      : kind === 'stapler'
        ? `Stapler press · hold the ring · ${laneLabel}`
        : `Blades closing · hold the ring · ${laneLabel}`
    return Object.freeze({
      laneLabel,
      headline,
      intensity: 0.72,
      hitStopSeconds: 0.012,
    })
  }
  const headline = kind === 'wind'
    ? `Wind gate · safe ring is ${laneLabel}`
    : kind === 'stapler'
      ? `Stapler gate · safe ring is ${laneLabel}`
      : `Scissors gate · safe ring is ${laneLabel}`
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
  if (kind === 'wind') return 'Missed the wind ring!'
  if (kind === 'stapler') return 'Missed the stapler ring!'
  return 'Missed the scissors ring!'
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
