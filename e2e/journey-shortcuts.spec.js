import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const scenario of [
  { zone: 'city', jump: false },
  { zone: 'sunset', jump: false },
  { zone: 'storm', jump: true },
]) {
  test(`${scenario.zone} shortcut gates arrive and count before the route finishes${scenario.jump ? ' after a score jump' : ''}`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=shortcut-${scenario.zone}#test-journey-shortcut-${scenario.zone}`)
    const trace = await page.evaluate((jump) => {
      window.__paperFreeze(true)
      let jumped = false
      let seenFirst = false
      let finishedWhileGateActive = false
      let last = null
      for (let i = 0; i < 1600; i++) {
        window.advanceTime(50)
        const state = JSON.parse(window.render_game_to_text())
        if (state.boss && !seenFirst) seenFirst = true
        if (jump && seenFirst && !jumped) {
          // Model a large pickup/bonus crossing the next encounter and finish.
          window.__paperJourneyScoreJump(500)
          jumped = true
        }
        if (state.state !== 'playing' && state.boss && !state.boss.completed) finishedWhileGateActive = true
        last = state
        if (state.result) break
      }
      return { last, jumped, finishedWhileGateActive }
    }, scenario.jump)
    expect(trace.last.result?.completed).toBe(true)
    expect(trace.last.result?.objectiveCompleted).toBe(true)
    expect(trace.last.journey.telemetry.shortcutGatesTotal).toBe(2)
    expect(trace.last.journey.telemetry.shortcutGatesCleared).toBe(2)
    expect(trace.last.journey.triggeredEncounterIds).toHaveLength(3)
    expect(trace.finishedWhileGateActive).toBe(false)
    if (scenario.jump) expect(trace.jumped).toBe(true)
    expect(errors).toEqual([])
  })
}
