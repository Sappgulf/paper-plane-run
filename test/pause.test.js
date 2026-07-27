import { describe, expect, test } from 'vitest'
import { RESUME_GRACE_SECONDS, nextPauseState } from '../src/game/pause.js'

describe('pause transitions', () => {
  test('pauses an active session when the document becomes hidden', () => {
    expect(nextPauseState(false, { hidden: true })).toEqual({
      paused: true,
      resumed: false,
      graceSeconds: 0,
    })
  })

  test('is idempotent while hidden', () => {
    expect(nextPauseState(true, { hidden: true })).toEqual({
      paused: true,
      resumed: false,
      graceSeconds: 0,
    })
  })

  test('reports resume grace when a paused session becomes visible', () => {
    expect(nextPauseState(true, { hidden: false, manual: false })).toEqual({
      paused: false,
      resumed: true,
      graceSeconds: RESUME_GRACE_SECONDS,
    })
  })

  test('stays paused when manually paused even if the tab is visible', () => {
    expect(nextPauseState(true, { hidden: false, manual: true })).toEqual({
      paused: true,
      resumed: false,
      graceSeconds: 0,
    })
  })

  test('manual resume from a manual pause grants grace', () => {
    expect(nextPauseState(true, { hidden: false, manual: false })).toMatchObject({
      paused: false,
      resumed: true,
      graceSeconds: RESUME_GRACE_SECONDS,
    })
  })

  test('is idempotent while fully visible and unpaused', () => {
    expect(nextPauseState(false, { hidden: false, manual: false })).toEqual({
      paused: false,
      resumed: false,
      graceSeconds: 0,
    })
  })
})
