import { UPGRADES } from '../upgrades.js'
import { SKINS } from '../skins.js'
import { JOURNEY_VERSION, PILOTS, stepsForChapter } from '../journey.js'
import { normalizeMasteryState } from '../journey-mastery.js'

export const MAX_BACKUP_BYTES = 2 * 1024 * 1024
const PREFIX = 'paper-plane-run-'
const COUNTERS = ['wallet', 'lifetime-stars', 'lifetime-distance', 'total-runs', 'lifetime-popped', 'lifetime-fever', 'lifetime-gauntlets', 'best', 'best-easy', 'best-normal', 'best-hard']
const FLAGS = ['wallet-migrated', 'muted', 'music', 'tutorial', 'hangar-onboard', 'landscape-hint-seen', 'skins-version']
const OBJECTS = ['upgrades', 'settings-v1', 'missions', 'achievements-claimed', 'journey-v1', 'journey-mastery-v1']
const ARRAYS = ['skins', 'journey-chapters', 'journey-receipts-v1', 'postcards-v1', 'lb-local']
const KEYS = new Set([...COUNTERS, ...FLAGS, ...OBJECTS, ...ARRAYS, 'name', 'diff', 'skin'].map(key => PREFIX + key))
const ghostKey = /^paper-plane-run-ghost-(easy|normal|hard)(-daily|-weekly-\d{4}-W\d{2})?$/
const scoreKey = /^paper-plane-run-lb-(daily\d{4}-\d{2}-\d{2}|weekly\d{4}-W\d{2})(easy|normal|hard)$/
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonnegative = value => Number.isSafeInteger(value) && value >= 0
const fail = message => { throw new Error(message) }
export const isProgressKey = key => KEYS.has(key) || ghostKey.test(key) || scoreKey.test(key)
const byteLength = text => new TextEncoder().encode(text).length

function validateTree(value, depth = 0) {
  if (depth > 12) fail('This backup contains data nested too deeply.')
  if (typeof value === 'number' && !Number.isFinite(value)) fail('This backup contains an invalid number.')
  if (typeof value === 'string' && value.length > 4096) fail('This backup contains an oversized text field.')
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('This backup contains an unsafe field.')
      validateTree(child, depth + 1)
    }
  }
}

function validateEntry(key, raw) {
  if (!isProgressKey(key) || typeof raw !== 'string') fail('This file contains unsupported save data.')
  const short = key.slice(PREFIX.length)
  if (COUNTERS.includes(short)) {
    if (!/^\d+$/.test(raw) || !nonnegative(Number(raw))) fail(`Invalid ${short.replaceAll('-', ' ')}.`)
    return
  }
  if (FLAGS.includes(short)) {
    if (!['0', '1'].includes(raw)) fail(`Invalid ${short} setting.`)
    return
  }
  if (short === 'name') {
    if (raw.length > 16 || /[\u0000-\u001f]/.test(raw)) fail('Invalid pilot name.')
    return
  }
  if (short === 'skin') {
    if (!SKINS.some(skin => skin.id === raw)) fail('Unknown equipped plane.')
    return
  }
  if (short === 'diff') {
    if (!['easy', 'normal', 'hard'].includes(raw)) fail('Invalid difficulty.')
    return
  }
  let value
  try { value = JSON.parse(raw) } catch { fail(`Unreadable ${short} data.`) }
  validateTree(value)
  const arrayKey = ARRAYS.includes(short) || scoreKey.test(key)
  if (arrayKey ? !Array.isArray(value) : !record(value)) fail(`Invalid ${short} data shape.`)
  if (short === 'upgrades') {
    for (const [id, rank] of Object.entries(value)) {
      const upgrade = UPGRADES.find(item => item.id === id)
      if (!upgrade || !nonnegative(rank) || rank > upgrade.max) fail('Invalid upgrade rank.')
    }
  }
  if (short === 'skins' && value.some(id => !SKINS.some(skin => skin.id === id))) fail('Unknown plane in backup.')
  if (short === 'journey-chapters' && value.some(chapter => ![1, 2].includes(chapter))) fail('Invalid Journey chapter.')
  if (short === 'journey-receipts-v1' && (value.length > 200 || value.some(id => typeof id !== 'string'))) fail('Invalid Journey receipts.')
  if (short === 'postcards-v1' && (value.length > 50 || value.some(card => !record(card) || typeof card.id !== 'string' || typeof card.journeyId !== 'string'))) fail('Invalid postcard album.')
  if (short === 'journey-v1') {
    if (value.version !== JOURNEY_VERSION || typeof value.id !== 'string' || !Number.isInteger(value.seed) || !PILOTS[value.pilotId] || ![1, 2].includes(value.chapter ?? 1) || !nonnegative(value.stepIndex) || value.stepIndex > stepsForChapter(value.chapter ?? 1).length || !Array.isArray(value.completedRouteIds) || !Array.isArray(value.earnedStampIds) || !['active', 'complete'].includes(value.status) || !nonnegative(value.attemptNumber) || value.attemptNumber < 1 || !(value.lastOutcomeReceiptId === null || typeof value.lastOutcomeReceiptId === 'string')) fail('Invalid Journey save.')
  }
  if (short === 'journey-mastery-v1' && !normalizeMasteryState(value)) fail('Unsupported mastery save.')
  if (short === 'settings-v1') {
    // arDesk was stored by older releases and survives loadSettings' merge.
    // Preserve that inert boolean so existing profiles remain portable.
    const booleans = ['reducedMotion', 'largeStick', 'autoLevel', 'colorblindPowers', 'lowPower', 'haptics', 'invertY', 'invertX', 'arDesk']
    for (const [field, setting] of Object.entries(value)) {
      if (booleans.includes(field) ? typeof setting !== 'boolean' : field === 'controlMode' ? !['mouse', 'joystick'].includes(setting) : field === 'forceSeason' ? !['auto', 'default', 'halloween', 'winter', 'valentine', 'spring', 'summer'].includes(setting) : field === 'mouseSensitivity' ? !(typeof setting === 'number' && setting >= .25 && setting <= 3) : true) fail(`Invalid flight setting: ${field}.`)
    }
  }
  if (short === 'missions' && (!Array.isArray(value.missions) || typeof value.day !== 'string' || value.missions.some(mission => !record(mission) || typeof mission.id !== 'string' || typeof mission.label !== 'string' || !nonnegative(mission.target) || !nonnegative(mission.progress)))) fail('Invalid mission progress.')
  if (short === 'achievements-claimed' && Object.values(value).some(tier => !nonnegative(tier) || tier > 10)) fail('Invalid claimed awards.')
  if ((short.startsWith('lb-')) && (value.length > 20 || value.some(row => !record(row) || typeof row.name !== 'string' || !nonnegative(row.distance) || !nonnegative(row.stars)))) fail('Invalid flight records.')
  if (ghostKey.test(key) && (!nonnegative(value.distance) || !Array.isArray(value.path) || value.path.some(point => !Array.isArray(point) || point.length < 3 || point.length > 4 || point.some(number => typeof number !== 'number' || !Number.isFinite(number))))) fail('Invalid ghost route.')
}

function progressEntries(storage) {
  const entries = Object.create(null)
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (isProgressKey(key)) entries[key] = storage.getItem(key)
  }
  return entries
}

export function createProgressBackup(storage, date = new Date()) {
  const text = JSON.stringify({ format: 'paper-plane-run-save', version: 1, createdAt: date.toISOString(), entries: progressEntries(storage) }, null, 2)
  parseProgressBackup(text)
  return text
}

export function parseProgressBackup(text) {
  if (typeof text !== 'string' || byteLength(text) > MAX_BACKUP_BYTES) fail('Choose a Paper Plane Run backup smaller than 2 MB.')
  let backup
  try { backup = JSON.parse(text) } catch { fail('This file is not a readable JSON backup.') }
  if (!record(backup) || backup.format !== 'paper-plane-run-save' || backup.version !== 1 || !record(backup.entries) || typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt))) fail('This is not a supported Paper Plane Run backup.')
  const entries = Object.entries(backup.entries)
  if (!entries.length || entries.length > 300) fail('This backup has no progress or too many save records.')
  for (const [key, value] of entries) validateEntry(key, value)
  // Return a fresh value so preview callers cannot smuggle changes into a later restore.
  return { createdAt: backup.createdAt, entries: Object.fromEntries(entries), summary: {
    pilot: backup.entries[PREFIX + 'name'] || 'Pilot',
    wallet: Number(backup.entries[PREFIX + 'wallet'] || 0),
    runs: Number(backup.entries[PREFIX + 'total-runs'] || 0),
    postcards: JSON.parse(backup.entries[PREFIX + 'postcards-v1'] || '[]').length,
  } }
}

export function restoreProgressBackup(storage, text) {
  const backup = parseProgressBackup(text)
  const before = progressEntries(storage)
  const keys = new Set([...Object.keys(before), ...Object.keys(backup.entries)])
  try {
    // Remove obsolete keys first to release quota for the incoming save.
    for (const key of keys) storage.removeItem(key)
    for (const [key, value] of Object.entries(backup.entries)) storage.setItem(key, value)
  } catch (error) {
    try {
      for (const key of keys) storage.removeItem(key)
      for (const [key, value] of Object.entries(before)) storage.setItem(key, value)
    } catch {
      throw new Error('Restore failed and storage could not recover. Use the recovery copy to restore your previous progress.', { cause: error })
    }
    throw new Error('Restore failed. Your previous progress was recovered; free device storage and try again.', { cause: error })
  }
  return backup.summary
}
