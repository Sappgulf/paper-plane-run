/**
 * The Tuck — one move, deep, that the whole altitude economy asks about.
 *
 * Hold the action to *tuck*: the nose drops, drag falls away, and the plane
 * trades height for speed far faster than an ordinary dive. Release to
 * *flare*: everything the tuck banked comes back at once as a climb, a speed
 * burst, and a distance payout that scales with how long you held.
 *
 * The skill is entirely in the release. Charge grows superlinearly, so the
 * last quarter-second of a deep tuck is worth more than its first second —
 * and the whole time you are falling toward the ground that now ends the run
 * (`glide.js`). Holding one beat longer is always the better play right up
 * until it is the last play, which is the shape every good risk mechanic has.
 *
 * A flare below `FLARE_FLOOR` is a *save*, not a payout: you get the climb but
 * none of the distance, so scraping a blown tuck out is survivable and never
 * profitable. Pure state machine — no renderer, no audio, no DOM.
 */

/** Seconds of tuck for a full charge. */
export const TUCK_FULL_SECONDS = 1.35
/** Extra sink while tucked, units/second — this is what makes it dangerous. */
export const TUCK_SINK = 12.5
/** Forward speed added at full tuck. */
export const TUCK_SPEED = 20
/** Climb impulse at a full-charge flare, units/second. */
export const FLARE_CLIMB = 26
/** Speed burst kept after a full-charge flare. */
export const FLARE_SPEED = 16
/** Seconds the flare's climb impulse and invulnerability last. */
export const FLARE_SECONDS = 0.55
/** Below this height a flare still saves you but pays nothing. */
export const FLARE_FLOOR = 3.0
/**
 * Distance banked by a clean flare, in metres at full charge.
 *
 * Distance, not an abstract score: metres are what the run is actually
 * measured in, and paying in the run's own currency is what makes the move
 * worth taking a risk for. Sized against the ground-skim release (up to 60m
 * for a maxed chain) so the two risk mechanics are worth comparable amounts
 * and neither trivialises the other.
 */
export const FLARE_DISTANCE = 55
/** Cooldown before another tuck can start, so it cannot be spammed flat. */
export const TUCK_COOLDOWN = 0.7

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function createTuckState() {
  return Object.freeze({
    phase: 'idle',
    charge: 0,
    hold: 0,
    flareTimer: 0,
    cooldown: 0,
    payout: null,
  })
}

/**
 * Charge from held seconds. Exponent > 1 so committing deeper is worth
 * disproportionately more than bailing early.
 */
export function tuckCharge(heldSeconds = 0) {
  const held = clamp(finite(heldSeconds) / TUCK_FULL_SECONDS, 0, 1)
  return Math.pow(held, 1.45)
}

export function describeTuck(charge = 0) {
  const value = clamp(finite(charge), 0, 1)
  if (value >= 0.98) return 'PERFECT FLARE!'
  if (value >= 0.75) return 'DEEP FLARE!'
  if (value >= 0.4) return 'FLARE!'
  if (value > 0) return 'Flare'
  return ''
}

/**
 * Advance one frame.
 *
 * `held` is whether the action button is down this frame; `height` is the
 * plane's current altitude, used only to decide whether a release pays.
 */
export function advanceTuck(state, {
  held = false,
  dt = 0,
  height = 99,
  enabled = true,
  chargeRate = 1,
  payoutMul = 1,
} = {}) {
  const previous = state || createTuckState()
  const step = Math.max(0, finite(dt))
  const cooldown = Math.max(0, finite(previous.cooldown) - step)

  if (!enabled) return createTuckState()

  if (previous.phase === 'flaring') {
    const flareTimer = finite(previous.flareTimer) - step
    if (flareTimer > 0) {
      return Object.freeze({ ...previous, flareTimer, cooldown, payout: null })
    }
    return Object.freeze({ ...createTuckState(), cooldown })
  }

  if (previous.phase === 'tucking') {
    if (held) {
      const hold = finite(previous.hold) + step * Math.max(0.1, finite(chargeRate, 1))
      return Object.freeze({
        phase: 'tucking',
        hold,
        charge: tuckCharge(hold),
        flareTimer: 0,
        cooldown,
        payout: null,
      })
    }
    // Released — resolve the flare.
    const charge = tuckCharge(previous.hold)
    const clean = finite(height, 99) > FLARE_FLOOR
    // Deep Flare scales the payout, never the save: a blown tuck stays worth
    // nothing no matter how much the player has spent on the tree.
    const payout = Math.max(1, finite(payoutMul, 1))
    const distance = clean ? Math.round(FLARE_DISTANCE * charge * payout) : 0
    return Object.freeze({
      phase: 'flaring',
      hold: 0,
      charge,
      flareTimer: FLARE_SECONDS,
      cooldown: TUCK_COOLDOWN,
      payout: Object.freeze({
        charge,
        clean,
        climb: FLARE_CLIMB * charge * payout,
        speed: FLARE_SPEED * charge * payout,
        distance,
        banner: clean ? `${describeTuck(charge)} +${distance}m` : 'SAVED',
      }),
    })
  }

  // Idle. A press only starts a tuck once the cooldown has run out, and the
  // button must have been released since the last flare — otherwise holding
  // the key down would immediately re-arm.
  if (held && cooldown <= 0 && previous.phase === 'idle') {
    return Object.freeze({
      phase: 'tucking',
      hold: step,
      charge: tuckCharge(step),
      flareTimer: 0,
      cooldown: 0,
      payout: null,
    })
  }
  return Object.freeze({ ...createTuckState(), cooldown })
}

/** Per-frame flight modifiers the engine applies while a tuck is running. */
export function tuckFlightModifiers(state) {
  const current = state || createTuckState()
  if (current.phase === 'tucking') {
    const ramp = clamp(finite(current.hold) / TUCK_FULL_SECONDS, 0, 1)
    return Object.freeze({
      extraSink: TUCK_SINK * (0.45 + 0.55 * ramp),
      speedBonus: TUCK_SPEED * ramp,
      // Tucked, the sheet is a dart: it barely steers.
      rollMul: 0.45,
      fov: 8 * ramp,
    })
  }
  if (current.phase === 'flaring') {
    const ease = clamp(finite(current.flareTimer) / FLARE_SECONDS, 0, 1)
    return Object.freeze({
      extraSink: -FLARE_CLIMB * finite(current.charge) * ease,
      speedBonus: FLARE_SPEED * finite(current.charge) * ease,
      rollMul: 1.35,
      fov: 5 * ease,
    })
  }
  return Object.freeze({ extraSink: 0, speedBonus: 0, rollMul: 1, fov: 0 })
}
