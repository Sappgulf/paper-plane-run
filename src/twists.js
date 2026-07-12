/** Daily Twist — a small deterministic modifier applied only to Daily Route runs. */
import { dailySeed, mulberry32 } from './rng.js'

export const TWISTS = [
  { id: 'tailwind', name: 'Tailwind Day', icon: '🌬️', desc: '+12% cruise speed', speedMul: 1.12 },
  { id: 'starrush', name: 'Star Rush', icon: '⭐', desc: '1.6x star spawns', starMul: 1.6 },
  { id: 'gale', name: 'Gale Winds', icon: '💨', desc: 'Wind gusts twice as often', windMul: 0.5 },
  { id: 'calm', name: 'Calm Skies', icon: '☀️', desc: 'No random wind gusts', windMul: 0 },
  { id: 'fog', name: 'Foggy Morning', icon: '🌫️', desc: 'Shorter draw distance', fogMul: 0.55 },
  { id: 'feather', name: 'Featherlight Fold', icon: '🪶', desc: 'Extra-slow sink today', sinkMul: 0.7 },
]

export function todaysTwist(date = new Date()) {
  const rand = mulberry32(dailySeed('twist', date))
  return TWISTS[(rand() * TWISTS.length) | 0]
}
