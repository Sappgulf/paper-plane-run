import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (const zone of ['city', 'harbor', 'storm', 'aurora']) {
  test(`Chapter 1 ${zone} route keeps the plane on screen through arrival`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=chapter-one#test-journey-${zone}`)
    const result = await page.evaluate(() => {
      window.__paperFreeze(true)
      let state, pose, hidden = 0
      for (let i = 0; i < 1800; i++) {
        window.advanceTime(50)
        state = JSON.parse(window.render_game_to_text())
        pose = window.__paperPose()
        if (!pose.planeVisible) hidden++
        if (state.result) break
      }
      return { state, pose, hidden }
    })
    expect(result.state.result?.completed).toBe(true)
    expect(result.hidden).toBe(0)
    expect(result.pose.wingBounds.min[0]).toBeLessThan(1)
    expect(result.pose.wingBounds.max[0]).toBeGreaterThan(-1)
    expect(result.pose.wingBounds.min[1]).toBeLessThan(1)
    expect(result.pose.wingBounds.max[1]).toBeGreaterThan(-1)
    expect(errors).toEqual([])
  })
}
