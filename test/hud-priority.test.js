import { describe, expect, test } from 'vitest'
import {
  HUD_ANCHORS,
  HUD_STATE_BUDGET,
  hudChipRank,
  isFlightContextChip,
  isHudAnchor,
  selectHudChips,
} from '../src/game/hud-priority.js'

describe('hud chip budget', () => {
  test('the three anchors are always shown, whatever else is competing', () => {
    const shown = selectHudChips([...HUD_ANCHORS, 'combo', 'skim', 'streak', 'fever', 'power', 'tuck'])
    for (const anchor of HUD_ANCHORS) expect(shown).toContain(anchor)
  })

  // The failure this exists to stop: every system showing its chip at once.
  test('never shows more than the budget allows beyond the anchors', () => {
    const everything = [
      ...HUD_ANCHORS, 'tuck', 'guardian', 'power', 'skim', 'fever',
      'combo', 'streak', 'journey-objective', 'ghost-delta', 'zone', 'next-zone',
    ]
    const shown = selectHudChips(everything)
    expect(shown.length).toBe(HUD_ANCHORS.length + HUD_STATE_BUDGET)
  })

  test('keeps the chips that change what you do next, drops the context', () => {
    const shown = selectHudChips([...HUD_ANCHORS, 'zone', 'next-zone', 'tuck', 'guardian'])
    expect(shown).toContain('tuck')
    expect(shown).toContain('guardian')
    expect(shown).not.toContain('zone')
    expect(shown).not.toContain('next-zone')
  })

  test('rank orders an active move above a running total above context', () => {
    expect(hudChipRank('tuck')).toBeGreaterThan(hudChipRank('power'))
    expect(hudChipRank('power')).toBeGreaterThan(hudChipRank('combo'))
    expect(hudChipRank('combo')).toBeGreaterThan(hudChipRank('zone'))
    expect(hudChipRank('unknown')).toBe(0)
  })

  test('shows everything when there is little competing', () => {
    expect(selectHudChips([...HUD_ANCHORS, 'power'])).toHaveLength(HUD_ANCHORS.length + 1)
    expect(selectHudChips(HUD_ANCHORS)).toHaveLength(HUD_ANCHORS.length)
  })

  test('is robust to junk, duplicates and an empty request', () => {
    expect(selectHudChips([])).toEqual([])
    expect(selectHudChips(null)).toEqual([])
    expect(selectHudChips(['power', 'power', null, undefined, 'power'])).toEqual(['power'])
    expect(isHudAnchor('altitude')).toBe(true)
    expect(isHudAnchor('combo')).toBe(false)
    expect(isFlightContextChip('mode')).toBe(true)
    expect(isFlightContextChip('tuck')).toBe(false)
  })

  test('a budget of zero still keeps the anchors', () => {
    expect(selectHudChips([...HUD_ANCHORS, 'tuck'], { budget: 0 })).toEqual([...HUD_ANCHORS])
  })
})

describe('flight context chips', () => {
  // A quiet moment must not fill the budget with things you cannot act on.
  test('context chips never take a slot while flying, even when nothing competes', () => {
    const shown = selectHudChips([...HUD_ANCHORS, 'best', 'mode', 'control', 'zone'])
    expect(shown).toEqual([...HUD_ANCHORS])
  })

  test('but they are shown outside flight, where there is room to read them', () => {
    const shown = selectHudChips([...HUD_ANCHORS, 'mode', 'zone'], { inFlight: false })
    expect(shown).toContain('mode')
    expect(shown).toContain('zone')
  })

  test('live state still wins the slots over nothing at all', () => {
    const shown = selectHudChips([...HUD_ANCHORS, 'best', 'mode', 'power', 'tuck'])
    expect(shown).toContain('power')
    expect(shown).toContain('tuck')
    expect(shown).not.toContain('best')
  })
})
