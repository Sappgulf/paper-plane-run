import { describe, expect, test } from 'vitest'
import {
  bannerPriority,
  createBannerState,
  resolveBanner,
} from '../src/game/flight-banners.js'

const req = (id, kind, text = `${id} text`) => ({ id, kind, text })

describe('flight banner arbitration', () => {
  test('nothing requested shows nothing', () => {
    expect(resolveBanner(createBannerState(), { requests: [] }).id).toBeNull()
    // Blank text is not a request — an element left in the DOM with no copy
    // must not win the slot.
    expect(resolveBanner(createBannerState(), { requests: [{ id: 'a', kind: 'zone', text: '' }] }).id).toBeNull()
  })

  // The whole point: three sources shouting at once produce one banner.
  test('only ever returns a single banner, the most important one', () => {
    const chosen = resolveBanner(createBannerState(), {
      requests: [req('power', 'power'), req('boss', 'boss'), req('zone', 'zone')],
    })
    expect(chosen.id).toBe('boss')
    expect(chosen.text).toBe('boss text')
  })

  test('priority order runs guardian > boss > gauntlet > zone > wind > power', () => {
    const order = ['guardian', 'boss', 'gauntlet', 'zone', 'wind', 'flare', 'power', 'status']
    for (let i = 1; i < order.length; i += 1) {
      expect(bannerPriority(order[i - 1]), `${order[i - 1]} vs ${order[i]}`)
        .toBeGreaterThan(bannerPriority(order[i]))
    }
    expect(bannerPriority('unknown-kind')).toBe(0)
  })

  // Ties must not depend on the order the engine collected requests in, and two
  // equal banners must not trade the slot frame by frame — that reads as a
  // flicker rather than a message.
  test('ties go to whatever is already on screen, whatever the request order', () => {
    let state = resolveBanner(createBannerState(), { requests: [req('zone', 'zone')] })
    expect(state.id).toBe('zone')
    state = resolveBanner(state, { requests: [req('zone2', 'zone'), req('zone', 'zone')] })
    expect(state.id).toBe('zone')
    state = resolveBanner(state, { requests: [req('zone', 'zone'), req('zone2', 'zone')] })
    expect(state.id).toBe('zone')
  })

  test('a lower-priority arrival never displaces the incumbent', () => {
    let state = resolveBanner(createBannerState(), { requests: [req('zone', 'zone')] })
    for (let i = 0; i < 30; i += 1) {
      state = resolveBanner(state, { requests: [req('zone', 'zone'), req('power', 'power')] })
      expect(state.id).toBe('zone')
    }
  })

  test('is stable: the same inputs give the same answer every frame', () => {
    const requests = [req('power', 'power'), req('zone', 'zone')]
    let state = resolveBanner(createBannerState(), { requests })
    const first = state.id
    for (let i = 0; i < 10; i += 1) state = resolveBanner(state, { requests })
    expect(state.id).toBe(first)
  })

  test('the winner disappearing frees the slot for whatever is left', () => {
    let state = resolveBanner(createBannerState(), { requests: [req('boss', 'boss'), req('power', 'power')] })
    expect(state.id).toBe('boss')
    state = resolveBanner(state, { requests: [req('power', 'power')], dt: 0.01 })
    expect(state.id).toBe('power')
  })
})
