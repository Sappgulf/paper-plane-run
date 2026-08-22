/**
 * Weekly Fold — a seeded endless variant that rotates the opening sky
 * and a light mechanical lean once a week, UTC.
 *
 * Same fairness contract as Daily: everyone who flies this week gets the
 * same map, the same fold, and a local board keyed to the ISO week.
 */
import { hashString, mulberry32 } from '../rng.js'

export const WEEKLY_FOLDS = Object.freeze([
  Object.freeze({
    id: 'harbor-week',
    name: 'Harbor Week',
    icon: '⚓',
    desc: 'Open over Cloud Harbor · extra stars on the breeze',
    zoneOffset: 220,
    starMul: 1.2,
  }),
  Object.freeze({
    id: 'storm-front',
    name: 'Storm Front',
    icon: '⛈️',
    desc: 'Start in the scrapyard · gusts run hot',
    zoneOffset: 480,
    windMul: 0.55,
  }),
  Object.freeze({
    id: 'golden-hour',
    name: 'Golden Hour',
    icon: '🌅',
    desc: 'Sunset skies and a lighter fold',
    zoneOffset: 800,
    sinkMul: 0.75,
  }),
  Object.freeze({
    id: 'aurora-veil',
    name: 'Aurora Veil',
    icon: '🌌',
    desc: 'Washi lights and shorter sightlines',
    zoneOffset: 1200,
    fogMul: 0.65,
  }),
  Object.freeze({
    id: 'midnight-desk',
    name: 'Midnight Desk',
    icon: '🌙',
    desc: 'Begin already inside Midnight Origami',
    zoneOffset: 1700,
  }),
  Object.freeze({
    id: 'bird-parade',
    name: 'Bird Parade',
    icon: '🕊️',
    desc: 'Flocks fill every lane',
    zoneOffset: 0,
    hazardBias: Object.freeze({ bird: 1.55, building: 0.85, scissors: 0.9 }),
  }),
  Object.freeze({
    id: 'blade-week',
    name: 'Blade Week',
    icon: '✂️',
    desc: 'Open scissors ride the updraft',
    zoneOffset: 0,
    hazardBias: Object.freeze({ scissors: 1.55, bird: 0.9, building: 0.9 }),
  }),
  Object.freeze({
    id: 'tailwind-fold',
    name: 'Tailwind Fold',
    icon: '🌬️',
    desc: 'The whole week leans forward',
    zoneOffset: 0,
    speedMul: 1.1,
    starMul: 1.1,
  }),
])

/** ISO week key, UTC, e.g. 2026-W34. */
export function weeklyKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const year = utc.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function weeklySeed(mode = 'normal', date = new Date()) {
  return hashString(`paper-plane-weekly|${weeklyKey(date)}|${mode}`)
}

export function foldById(id) {
  return WEEKLY_FOLDS.find((fold) => fold.id === id) || null
}

export function thisWeeksFold(date = new Date()) {
  const rand = mulberry32(weeklySeed('fold', date))
  return WEEKLY_FOLDS[(rand() * WEEKLY_FOLDS.length) | 0]
}
