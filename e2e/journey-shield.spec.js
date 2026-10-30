import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

test('a collected shield disqualifies the shieldless objective, while the route still completes', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires a deterministic Journey fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?proof=shield#test-journey-shield')
  const result = await page.evaluate(() => {
    window.__paperFreeze(true)
    window.advanceTime(100)
    const pickup = JSON.parse(window.render_game_to_text())
    let final = pickup
    for (let i = 0; i < 1200 && !final.result; i++) {
      window.advanceTime(50)
      final = JSON.parse(window.render_game_to_text())
    }
    return { pickup, final }
  })
  expect(result.pickup.power?.kind).toBe('shield')
  expect(result.pickup.journey.telemetry.shieldUsed).toBe(true)
  expect(result.final.result?.completed).toBe(true)
  expect(result.final.result?.objectiveCompleted).toBe(false)
  expect(errors).toEqual([])
})
