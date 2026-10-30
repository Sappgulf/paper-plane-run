import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const scenario of [
  { name: 'Desk Showdown', fixture: 'desk-finale' },
  { name: 'Aurora Showdown', fixture: 'aurora' },
]) {
  test(`${scenario.name} uses enemy formations without boss rings`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=${scenario.fixture}#test-journey-${scenario.fixture}`)
    const trace = await page.evaluate(() => {
      window.__paperFreeze(true)
      let sawFormation = false, sawBoss = false, last
      for (let i = 0; i < 1500; i++) {
        window.advanceTime(50)
        last = JSON.parse(window.render_game_to_text())
        sawBoss ||= Boolean(last.boss || last.entities.counts.boss)
        sawFormation ||= Boolean(last.entities.counts.gauntlet)
        if (last.result) break
      }
      return { last, sawFormation, sawBoss }
    })
    expect(trace.sawFormation).toBe(true)
    expect(trace.sawBoss).toBe(false)
    expect(trace.last.journey.triggeredEncounterIds).toHaveLength(3)
    expect(trace.last.result?.completed).toBe(true)
    expect(errors).toEqual([])
  })
}
