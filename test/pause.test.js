import { describe, expect, test } from 'vitest'
import { nextPauseState } from '../src/game/pause.js'

describe('visibility pause transitions', () => {
  test('pauses an active session when the document becomes hidden', () => {
    expect(nextPauseState(false, 'hidden')).toEqual({ paused: true, resumed: false })
  })

  test('is idempotent while hidden', () => {
    expect(nextPauseState(true, 'hidden')).toEqual({ paused: true, resumed: false })
  })

  test('reports the transition when a paused session becomes visible', () => {
    expect(nextPauseState(true, 'visible')).toEqual({ paused: false, resumed: true })
  })

  test('is idempotent while visible', () => {
    expect(nextPauseState(false, 'visible')).toEqual({ paused: false, resumed: false })
  })
})
