import { describe, expect, test } from 'vitest'
import {
  HANGAR_META_TABS,
  HANGAR_PROGRESS_TABS,
  hangarGroupForTab,
  isHangarTabInGroup,
  resolveHangarTabForGroup,
} from '../src/game/hangar-nav.js'

describe('hangar navigation groups', () => {
  test('splits the nine hangar surfaces into Progress and Meta without overlap', () => {
    const all = [...HANGAR_PROGRESS_TABS, ...HANGAR_META_TABS]
    expect(all).toHaveLength(9)
    expect(new Set(all).size).toBe(9)
    expect(HANGAR_PROGRESS_TABS).toEqual(['upgrades', 'skins', 'missions', 'achievements'])
    expect(HANGAR_META_TABS).toEqual(['board', 'settings', 'stats', 'postcards', 'editor'])
  })

  test('resolves group filter to a tab that belongs in that group', () => {
    expect(hangarGroupForTab('upgrades')).toBe('progress')
    expect(hangarGroupForTab('editor')).toBe('meta')
    expect(resolveHangarTabForGroup('meta', 'upgrades')).toBe('board')
    expect(resolveHangarTabForGroup('progress', 'settings')).toBe('upgrades')
    expect(resolveHangarTabForGroup('meta', 'postcards')).toBe('postcards')
    expect(isHangarTabInGroup('missions', 'progress')).toBe(true)
    expect(isHangarTabInGroup('board', 'progress')).toBe(false)
  })
})
