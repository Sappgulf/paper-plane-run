/**
 * Ground skim — a risk/reward reason to fly the bottom of the screen.
 *
 * Since `glide.js` made ground contact the run's fail state, the bottom of the
 * corridor is no longer merely where the buildings are — it is where the run
 * ends. That makes this the sharpest risk in the game rather than a bonus
 * system bolted onto a safe floor: skim time accrues into tiers that bank
 * stars and lift the score multiplier, and climbing out under your own control
 * banks whatever the chain earned rather than voiding it.
 *
 * Pure so the tier curve can be tested without a flight; `flight-engine.js`
 * owns the HUD and the star wallet.
 */

/** Below this height the plane counts as skimming — well inside the danger band. */
export const SKIM_CEILING = 4.6
/** A short grace so a single bump over the ceiling does not drop the chain. */
export const SKIM_GRACE_SECONDS = 0.45
/**
 * Seconds of skimming per tier. Tuned against real runs: at minimum altitude
 * the city clips the plane every few seconds, so a slower gate meant the upper
 * tiers were effectively unreachable and the risk went unpaid.
 */
export const SKIM_TIER_SECONDS = 1.1
export const SKIM_MAX_TIER = 5

export function createGroundSkimState() {
  return Object.freeze({
    active: false,
    seconds: 0,
    tier: 0,
    grace: 0,
    bankedStars: 0,
    tierUp: 0,
    releaseTier: 0,
    releaseDistance: 0,
    banner: null,
  })
}

export function skimTierFor(seconds) {
  const held = Math.max(0, Number(seconds) || 0)
  return Math.min(SKIM_MAX_TIER, Math.floor(held / SKIM_TIER_SECONDS))
}

/** Stars paid when a tier is first reached — 1, 2, 3, … so holding longer pays more. */
export function skimTierReward(tier) {
  const level = Math.max(0, Math.floor(Number(tier) || 0))
  return level <= 0 ? 0 : level
}

export function skimScoreMultiplier(tier) {
  const level = Math.min(SKIM_MAX_TIER, Math.max(0, Math.floor(Number(tier) || 0)))
  return 1 + level * 0.08
}

export function describeSkimTier(tier) {
  const level = Math.max(0, Math.floor(Number(tier) || 0))
  if (level >= 5) return 'GROUND EFFECT!'
  if (level >= 4) return 'ON THE DECK!'
  if (level >= 3) return 'LOW PASS!'
  if (level >= 2) return 'SKIMMING!'
  if (level >= 1) return 'Skim'
  return ''
}

export function skimHudTier(tier) {
  const level = Math.max(0, Math.floor(Number(tier) || 0))
  if (level >= 5) return 'skim-tier-legend'
  if (level >= 3) return 'skim-tier-hot'
  if (level >= 1) return 'skim-tier-warm'
  return ''
}

/**
 * Advance one frame of skimming.
 *
 * `low` is whether the plane is under SKIM_CEILING this frame. Grounded state
 * is returned fresh each call rather than mutated so a replayed frame gives an
 * identical result.
 */
export function advanceGroundSkim(state, { low = false, dt = 0, enabled = true } = {}) {
  const previous = state || createGroundSkimState()
  const step = Math.max(0, Number(dt) || 0)

  if (!enabled) return createGroundSkimState()

  if (low) {
    const seconds = previous.seconds + step
    const tier = skimTierFor(seconds)
    const tierUp = Math.max(0, tier - previous.tier)
    return Object.freeze({
      active: true,
      seconds,
      tier,
      grace: SKIM_GRACE_SECONDS,
      bankedStars: tierUp > 0 ? skimTierReward(tier) : 0,
      tierUp,
      banner: tierUp > 0 ? `${describeSkimTier(tier)} +${skimTierReward(tier)}★` : null,
    })
  }

  // Climbed out. Spend the grace window before the chain actually breaks so
  // clipping a building's roofline does not punish an otherwise clean pass.
  const grace = previous.grace - step
  if (previous.active && grace > 0) {
    return Object.freeze({
      active: true,
      seconds: previous.seconds,
      tier: previous.tier,
      grace,
      bankedStars: 0,
      tierUp: 0,
      banner: null,
    })
  }

  // Pulling up on purpose pays out. Without this the only way a chain ever
  // ended was by crashing, which made the whole mechanic feel like a dare with
  // no way to collect — now the exit is the reward.
  if (previous.active && previous.tier > 0) {
    const released = createGroundSkimState()
    return Object.freeze({
      ...released,
      releaseTier: previous.tier,
      releaseDistance: skimReleaseDistance(previous.tier),
      banner: `PULL UP! +${skimReleaseDistance(previous.tier)}m`,
    })
  }
  return createGroundSkimState()
}

/** Distance banked for climbing out of a chain under your own control. */
export function skimReleaseDistance(tier) {
  const level = Math.min(SKIM_MAX_TIER, Math.max(0, Math.floor(Number(tier) || 0)))
  return level * 12
}

/** HUD copy: the tier plus how close the next one is. */
export function describeSkimHudValue(state) {
  const current = state || createGroundSkimState()
  if (!current.active || current.tier <= 0) return ''
  if (current.tier >= SKIM_MAX_TIER) return `${describeSkimTier(current.tier)} MAX`
  const into = current.seconds % SKIM_TIER_SECONDS
  const remaining = Math.max(0, SKIM_TIER_SECONDS - into)
  return `${describeSkimTier(current.tier)} · ${remaining.toFixed(1)}s`
}
