import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const scenario of [
  { zone: 'city', jump: false },
  { zone: 'sunset', jump: false },
  { zone: 'storm', jump: true },
]) {
  test(`${scenario.zone} legacy shortcut uses formations without rings${scenario.jump ? ' after a score jump' : ''}`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=shortcut-${scenario.zone}#test-journey-shortcut-${scenario.zone}`)
    const trace = await page.evaluate((jump) => {
      window.__paperFreeze(true)
      let jumped = false, sawFormation = false, sawBoss = false, last
      for (let i = 0; i < 1600; i++) {
        window.advanceTime(50)
        last = JSON.parse(window.render_game_to_text())
        sawBoss ||= Boolean(last.boss || last.entities.counts.boss)
        sawFormation ||= Boolean(last.entities.counts.gauntlet)
        if (jump && sawFormation && !jumped) {
          window.__paperJourneyScoreJump(500)
          jumped = true
        }
        if (last.result) break
      }
      return { last, jumped, sawFormation, sawBoss }
    }, scenario.jump)
    expect(trace.last.result?.completed).toBe(true)
    expect(trace.last.journey.triggeredEncounterIds).toHaveLength(3)
    expect(trace.sawFormation).toBe(true)
    expect(trace.sawBoss).toBe(false)
    if (scenario.jump) expect(trace.jumped).toBe(true)
    expect(errors).toEqual([])
  })
}
