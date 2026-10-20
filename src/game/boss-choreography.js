/**
 * Boss mechanism poses, driven by the encounter's phase.
 *
 * The gates used to idle the same way from the first warning to the last
 * commit, so the phase banner was the only thing that changed. A mechanism
 * that loads before it strikes reads as a fight: the blades open wide and the
 * jaws draw back during the warning, close in as the pressure meter fills, and
 * snap shut for a beat when the final pass begins.
 *
 * Pure, so the pose curve is testable without a renderer. Every pose is
 * clamped at the lip: a moving part can close toward the hole, but
 * `bossLipOffset` never lets it reach the passage edge. The collision envelope
 * stays exactly where the boss director put it.
 */

/** Duration of the final-pass snap, seconds. Long enough to read, short enough to feel sharp. */
export const BOSS_CLAP_SECONDS = 0.35
/** Closest a moving press may come to the passage edge, as an offset past its lip. */
export const BOSS_LIP_MIN = 0.12
/** Furthest a press draws back while the mechanism is loaded. */
export const BOSS_LIP_MAX = 0.95

const PHASES = Object.freeze(['warning', 'pressure', 'final-pass'])

function clamp01(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0
}

/** A pose value that falls back to the resting pose, not zero, when it is missing or junk. */
function poseValue(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback
}

/**
 * The pose for this frame.
 *
 * - `open` is 1 when the mechanism is fully loaded (retracted, wide) and falls
 *   toward 0.3 as it closes in on the hole for the final pass.
 * - `rate` scales how fast the mechanism ticks, so pressure sounds and looks
 *   like it is building rather than just getting louder.
 * - `clap` is a transient 1 → 0 snap right after the final pass begins.
 * - `spin` multiplies the wind fans' rotation: slow to load, fast when released.
 *
 * Reduced motion holds one still pose for every phase: no rate, no snap. The
 * banner and the phase text still announce each phase, so the mechanism does
 * not need to move to carry it.
 */
export function bossChoreography({
  phase = 'warning',
  pressure = 0,
  sincePhase = 0,
  motionAllowed = true,
} = {}) {
  const current = PHASES.includes(phase) ? phase : 'warning'
  if (!motionAllowed) {
    return Object.freeze({ open: 0.5, rate: 0, clap: 0, spin: 0 })
  }
  const press = clamp01(pressure)
  if (current === 'warning') {
    return Object.freeze({ open: 1, rate: 0.6, clap: 0, spin: 0.5 })
  }
  if (current === 'pressure') {
    return Object.freeze({
      open: 1 - 0.7 * press,
      rate: 1 + press * 0.8,
      clap: 0,
      spin: 1 + press,
    })
  }
  const since = Math.max(0, Number(sincePhase) || 0)
  const clap = clamp01(1 - since / BOSS_CLAP_SECONDS)
  return Object.freeze({ open: 0.3, rate: 2.2, clap, spin: 2.4 })
}

/**
 * How far a stapler jaw or punch head sits past the passage lip this frame.
 *
 * Open pulls it back toward `BOSS_LIP_MAX`; the snap flicks it in toward the
 * hole by a quarter of its travel. The result is always clamped to
 * [`BOSS_LIP_MIN`, `BOSS_LIP_MAX`], so no pose can put a part inside the lip.
 */
export function bossLipOffset(choreography = {}) {
  const open = poseValue(choreography.open, 1)
  const clap = poseValue(choreography.clap, 0)
  const raw = BOSS_LIP_MIN + (BOSS_LIP_MAX - BOSS_LIP_MIN) * open - clap * 0.25 * (BOSS_LIP_MAX - BOSS_LIP_MIN)
  return Math.min(BOSS_LIP_MAX, Math.max(BOSS_LIP_MIN, raw))
}

/**
 * Tilt for a scissors blade, radians, before the caller mirrors it for the
 * other blade. Opened blades lean one way and the snap leans them back. The
 * result is capped at the same ±0.18 the blades always used, so no pose can
 * tilt a blade into the hole.
 */
export function bossBladeTilt(choreography = {}) {
  const open = poseValue(choreography.open, 1)
  const clap = poseValue(choreography.clap, 0)
  const tilt = 0.06 + 0.12 * open - clap * 0.18
  return Math.min(0.18, Math.max(-0.18, tilt))
}
