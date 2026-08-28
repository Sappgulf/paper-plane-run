/**
 * Thread-the-gap — flying between two towers used to pay nothing beyond a
 * generic graze, even though spawnChunk deliberately leaves sub-corridors.
 * When both side buildings rise close enough that the flyable slot between
 * their inner faces is tight, threading that slot cleanly now pays a small
 * route bonus. Pure so the geometry rule stays testable without a scene.
 */

/** Inner-face gaps wider than this are just "the open sky", not a thread. */
export const THREAD_GAP_MAX_WIDTH = 5

/** Reward paid once when the run passes cleanly through a marked gap. */
export const THREAD_REWARD_METERS = 20

/** Clearance kept from each inner face so scraping the wall doesn't pay. */
export const THREAD_WALL_MARGIN = 0.55

export function isThreadGapWidth(gapWidth = 0) {
  const width = Number(gapWidth) || 0
  return width > 0 && width <= THREAD_GAP_MAX_WIDTH
}

/**
 * @param {{playerX: number, playerY: number, minX: number, maxX: number, maxY?: number}} bounds
 *   min/maxX are the towers' inner faces; maxY caps the corridor at the
 *   shorter rooftop — over the top is not a thread.
 */
export function isInsideThreadGap({
  playerX = 0,
  playerY = 0,
  minX = 0,
  maxX = 0,
  maxY = Number.POSITIVE_INFINITY,
} = {}) {
  const m = THREAD_WALL_MARGIN
  const lo = Math.min(Number(minX), Number(maxX))
  const hi = Math.max(Number(minX), Number(maxX))
  const insideX = (Number(playerX) || 0) >= lo + m && (Number(playerX) || 0) <= hi - m
  // Below rooftop level only matters when the caller knows a roof height;
  // Infinity maxY means the corridor is open-topped this chunk.
  const insideY = (Number(playerY) || 0) <= (Number(maxY) || 0)
  return insideX && insideY
}
