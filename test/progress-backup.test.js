import { beforeEach, describe, expect, it } from 'vitest'
import { createProgressBackup, isProgressKey, MAX_BACKUP_BYTES, parseProgressBackup, restoreProgressBackup } from '../src/game/progress-backup.js'
import { createJourney } from '../src/journey.js'
import { createMasteryState } from '../src/journey-mastery.js'

const key = short => `paper-plane-run-${short}`
const packed = entries => JSON.stringify({ format: 'paper-plane-run-save', version: 1, createdAt: '2026-10-02T12:00:00Z', entries })

describe('portable progress', () => {
  beforeEach(() => localStorage.clear())
  it('round trips real progression shapes, settings, equipped plane and seeded route records', () => {
    const entries = {
      [key('name')]: 'Milo', [key('wallet')]: '42', [key('total-runs')]: '8',
      [key('upgrades')]: '{"handling":2,"lift":1}', [key('skins')]: '["classic"]', [key('skin')]: 'classic',
      [key('achievements-claimed')]: '{"distance":0}', [key('journey-chapters')]: '[1,2]',
      [key('journey-v1')]: JSON.stringify(createJourney({ seed: 17 })),
      [key('journey-mastery-v1')]: JSON.stringify(createMasteryState()),
      [key('settings-v1')]: '{"controlMode":"joystick","reducedMotion":true,"mouseSensitivity":1.4}',
      [key('lb-daily2026-10-02normal')]: '[{"name":"Milo","distance":150,"stars":5}]',
      [key('ghost-normal-weekly-2026-W40')]: '{"distance":150,"path":[[0,0,8,0],[2,1,7,1]]}',
    }
    for (const [id, value] of Object.entries(entries)) localStorage.setItem(id, value)
    localStorage.setItem('unrelated-token', 'private')
    localStorage.setItem(key('disable-sw'), '1')
    const backup = createProgressBackup(localStorage)
    expect(parseProgressBackup(backup).entries).toEqual(entries)
    localStorage.setItem(key('wallet'), '99')
    localStorage.setItem(key('best-hard'), '100')
    restoreProgressBackup(localStorage, backup)
    expect(localStorage.getItem(key('wallet'))).toBe('42')
    expect(localStorage.getItem(key('best-hard'))).toBeNull()
    expect(localStorage.getItem('unrelated-token')).toBe('private')
    expect(localStorage.getItem(key('disable-sw'))).toBe('1')
  })
  it.each([
    { [key('wallet')]: '-10' }, { [key('wallet')]: 'Infinity' },
    { [key('upgrades')]: '{"handling":99}' }, { [key('upgrades')]: '[]' },
    { [key('settings-v1')]: '{"reducedMotion":"false"}' },
    { [key('settings-v1')]: '{"arDesk":"false"}' },
    { [key('skins')]: '["imaginary"]' }, { [key('skin')]: 'imaginary' },
    { [key('postcards-v1')]: '[{}]' }, { [key('missions')]: '{}' },
    { [key('achievements-claimed')]: '{"distance":-1}' },
    { [key('ghost-normal')]: '{"distance":5,"path":[["x",0,8]]}' },
    { [key('disable-sw')]: '1' }, { 'another-app-key': 'value' },
    { [key('settings-v1')]: '{"__proto__":{"controlMode":"mouse"}}' },
  ])('rejects invalid data before touching existing progress: %o', entries => {
    localStorage.setItem(key('wallet'), '23')
    expect(() => restoreProgressBackup(localStorage, packed(entries))).toThrow()
    expect(localStorage.getItem(key('wallet'))).toBe('23')
    expect(localStorage.length).toBe(1)
  })
  it('exports and restores profiles containing the retired Desk AR boolean', () => {
    const settings = '{"controlMode":"mouse","arDesk":false,"mouseSensitivity":1}'
    localStorage.setItem(key('settings-v1'), settings)
    localStorage.setItem(key('wallet'), '75')
    const backup = createProgressBackup(localStorage)
    localStorage.setItem(key('wallet'), '90')
    restoreProgressBackup(localStorage, backup)
    expect(localStorage.getItem(key('settings-v1'))).toBe(settings)
    expect(localStorage.getItem(key('wallet'))).toBe('75')
  })
  it('rejects unreadable, unsupported, empty and oversized files', () => {
    for (const text of ['not json', '{}', packed({}), ' '.repeat(MAX_BACKUP_BYTES + 1), packed({ [key('wallet')]: '1' }).replace('"version":1', '"version":2')]) expect(() => parseProgressBackup(text)).toThrow()
  })
  it('restores the entire previous save when a later write fails', () => {
    const data = new Map([[key('wallet'), '23'], [key('skin'), 'classic'], ['unrelated', 'keep']])
    let rejected = false
    const storage = {
      get length() { return data.size }, key: index => [...data.keys()][index],
      getItem: id => data.get(id) ?? null, removeItem: id => data.delete(id),
      setItem: (id, value) => {
        if (id === key('upgrades') && !rejected) { rejected = true; throw new Error('Quota exceeded') }
        data.set(id, value)
      },
    }
    expect(() => restoreProgressBackup(storage, packed({ [key('wallet')]: '42', [key('upgrades')]: '{}' }))).toThrow('previous progress was recovered')
    expect([...data]).toEqual([['unrelated', 'keep'], [key('wallet'), '23'], [key('skin'), 'classic']])
  })
  it('only accepts established keys and dated competitive records', () => {
    expect(isProgressKey(key('ghost-hard-daily'))).toBe(true)
    expect(isProgressKey(key('lb-weekly2026-W40easy'))).toBe(true)
    for (const id of [key('analytics'), key('recovery-v1'), key('disable-sw'), key('ghost-secret')]) expect(isProgressKey(id)).toBe(false)
  })
})
