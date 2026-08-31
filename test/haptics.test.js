import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Haptic } from '../src/haptics.js'

describe('haptics native bridge', () => {
  beforeEach(() => {
    // The test environment runs in plain Node, not jsdom — there is no
    // `window` global by default, matching how haptics.js's own
    // `typeof window !== 'undefined'` guard behaves there (falls through
    // to navigator.vibrate). These tests stub one in to exercise the
    // iOS-bridge branch.
    if (typeof globalThis.window === 'undefined') globalThis.window = {}
  })

  afterEach(() => {
    delete globalThis.window
    delete navigator.vibrate
  })

  test('posts to the iOS native bridge when present, instead of navigator.vibrate', () => {
    const postMessage = vi.fn()
    window.webkit = { messageHandlers: { haptics: { postMessage } } }
    navigator.vibrate = vi.fn()

    Haptic.collect()

    expect(postMessage).toHaveBeenCalledWith('collect')
    expect(navigator.vibrate).not.toHaveBeenCalled()
  })

  test('falls back to navigator.vibrate on the web when there is no native bridge', () => {
    navigator.vibrate = vi.fn()

    Haptic.crash()

    expect(navigator.vibrate).toHaveBeenCalledWith([40, 30, 60, 30, 80])
  })

  // The enabled flag is cached at module load, so a fresh module instance
  // is needed to observe a settings value written before first use.
  test('respects the haptics-disabled setting for both paths', async () => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ haptics: false }))
    vi.resetModules()
    const { Haptic: freshHaptic } = await import('../src/haptics.js')
    const postMessage = vi.fn()
    window.webkit = { messageHandlers: { haptics: { postMessage } } }

    freshHaptic.tap()

    expect(postMessage).not.toHaveBeenCalled()
  })

  test('re-reads the cached flag when a settings-changed event fires', async () => {
    // A real EventTarget stands in for `window` so the module can register
    // its invalidation listeners at import time, as it does in the browser.
    globalThis.window = new EventTarget()
    vi.resetModules()
    const { Haptic: freshHaptic } = await import('../src/haptics.js')
    navigator.vibrate = vi.fn()

    freshHaptic.tap()
    expect(navigator.vibrate).toHaveBeenCalledTimes(1)

    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ haptics: false }))
    window.dispatchEvent(new Event('paperplane:settings-changed'))

    freshHaptic.tap()
    expect(navigator.vibrate).toHaveBeenCalledTimes(1)
  })
})
