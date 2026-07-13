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

  test('respects the haptics-disabled setting for both paths', () => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ haptics: false }))
    const postMessage = vi.fn()
    window.webkit = { messageHandlers: { haptics: { postMessage } } }

    Haptic.tap()

    expect(postMessage).not.toHaveBeenCalled()
  })
})
