/**
 * Power orbs used to wipe whatever was active the moment a new orb was
 * caught — grabbing a Shield while your Magnet had 7s left destroyed that
 * time with zero compensation. Now:
 *  - same-kind pickup refreshes the timer to full instead of restarting it,
 *    plus a small distance tip for the lucky catch;
 *  - a different kind still replaces (one power at a time keeps the HUD and
 *    physics toys sane) but pays a partial refund for the time thrown away.
 */

export const POWER_REFRESH_METERS = 25
export const POWER_REPLACE_METERS = 12

/**
 * @param {{currentKind?: string|null, nextKind?: string}} params
 * @returns {{mode: 'new'|'refresh'|'replace', refundMeters: number}}
 */
export function resolvePowerPickup({ currentKind = null, nextKind } = {}) {
  if (!nextKind) return Object.freeze({ mode: 'new', refundMeters: 0 })
  if (!currentKind) return Object.freeze({ mode: 'new', refundMeters: 0 })
  if (currentKind === nextKind) {
    return Object.freeze({ mode: 'refresh', refundMeters: POWER_REFRESH_METERS })
  }
  return Object.freeze({ mode: 'replace', refundMeters: POWER_REPLACE_METERS })
}
