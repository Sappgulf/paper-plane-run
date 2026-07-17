/** Hangar tabs that improve the plane and progression. */
export const HANGAR_PROGRESS_TABS = Object.freeze([
  'upgrades',
  'skins',
  'missions',
  'achievements',
])

/** Hangar tabs for scores, setup, keepsakes, and tools. */
export const HANGAR_META_TABS = Object.freeze([
  'board',
  'settings',
  'stats',
  'postcards',
  'editor',
])

export function hangarGroupForTab(tab) {
  if (HANGAR_PROGRESS_TABS.includes(tab)) return 'progress'
  if (HANGAR_META_TABS.includes(tab)) return 'meta'
  return 'progress'
}

/**
 * When the player switches Progress/Meta filter, keep their current tab if it
 * belongs to the group; otherwise land on a sensible default.
 */
export function resolveHangarTabForGroup(group, currentTab = 'upgrades') {
  const tabs = group === 'meta' ? HANGAR_META_TABS : HANGAR_PROGRESS_TABS
  if (tabs.includes(currentTab)) return currentTab
  return tabs[0]
}

export function isHangarTabInGroup(tab, group) {
  return hangarGroupForTab(tab) === group
}
