import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const outcome of ['win', 'loss']) {
  test(`the Red Dart finale records an actual ${outcome} while completing the route`, async ({ page }, info) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?duel=${outcome}#test-journey-duel-${outcome}`)
    await page.evaluate(() => { window.__paperFreeze(true); window.advanceTime(2000) })
    const first = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
    expect(first.journey.rival.delta * (outcome === 'win' ? 1 : -1)).toBeGreaterThan(0)
    await expect(page.locator('#journey-objective-hud')).toBeVisible()
    await expect(page.locator('#journey-objective-val')).toContainText(outcome === 'win' ? 'behind' : 'ahead')
    await page.screenshot({ path: `output/red-dart-${outcome}-${info.project.name}.png` })
    const finish = await page.evaluate(() => {
      let state
      for (let i = 0; i < 1200; i++) {
        window.advanceTime(50)
        state = JSON.parse(window.render_game_to_text())
        if (state.result) break
      }
      return state
    })
    expect(finish.result?.completed).toBe(true)
    expect(finish.result?.objectiveCompleted).toBe(outcome === 'win')
    expect(finish.journey.rival.won).toBe(outcome === 'win')
    expect(finish.journey.telemetry.shortcutGatesTotal).toBe(0)
    expect(finish.journey.triggeredEncounterIds).toHaveLength(3)
    expect(errors).toEqual([])
  })
}
