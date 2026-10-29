/** Bounded debris motion. No state or random allocations in the render loop. */
export function paperFragmentPose({ index = 0, age = 0, x = 0, y = 8, scale = 1 } = {}) {
  const t = Math.max(0, Number.isFinite(age) ? age : 0)
  const angle = index * 2.399963
  const vx = Math.cos(angle) * (2 + index % 4)
  const vz = Math.sin(angle) * (1.5 + index % 3)
  const vy = 2 + index % 5
  const height = Math.max(.12, y + vy * t - 18 * t * t)
  const landed = height <= .12
  return {
    x: x + vx * Math.min(t, .8), y: height, z: vz * Math.min(t, .8),
    turn: landed ? angle : angle + t * (index % 2 ? 5 : -4),
    fold: landed ? -Math.PI / 2 : t * 3 + angle,
    opacity: Math.max(0, Math.min(1, (1.5 - t) * 2)),
    scale: Math.max(.1, scale) * (.35 + (index % 3) * .12),
  }
}
