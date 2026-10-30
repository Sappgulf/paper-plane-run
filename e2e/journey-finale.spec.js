import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const scenario of [
  { name: 'Desk Showdown', fixture: 'desk-finale', kind: 'stapler' },
  { name: 'Aurora Showdown', fixture: 'aurora', kind: 'scissors' },
]) {
  test(`${scenario.name} follows its authored boss encounters`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=${scenario.fixture}#test-journey-${scenario.fixture}`)
    const trace = await page.evaluate(() => {
      window.__paperFreeze(true)
      let firstBoss = null
      let sawEarlyBoss = false
      for (let i = 0; i < 900; i++) {
        window.advanceTime(50)
        const state = JSON.parse(window.render_game_to_text())
        if (state.boss && state.distance < 210) sawEarlyBoss = true
        if (state.boss && !firstBoss) firstBoss = { kind: state.boss.kind, distance: state.distance, events: state.journey.triggeredEncounterIds }
        if (state.state !== 'playing' || state.distance > 330) break
      }
      return { firstBoss, sawEarlyBoss }
    })
    expect(trace.sawEarlyBoss).toBe(false)
    expect(trace.firstBoss?.kind).toBe(scenario.kind)
    expect(trace.firstBoss.events.length).toBeGreaterThanOrEqual(2)
    expect(errors).toEqual([])
  })
}
