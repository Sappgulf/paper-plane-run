import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

for (let step = 0; step < 4; step++) for (let choice = 0; choice < 2; choice++) {
  test(`Chapter 2 route ${step + 1}, choice ${choice + 1} keeps the plane visible through arrival`, async ({ page }, info) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires a deterministic Journey fixture')
    const errors = collectConsoleErrors(page)
    await openFixture(page, `/?proof=chapter-two#test-chapter2-${step}-${choice}`)
    const flight = await page.evaluate(() => {
      window.__paperFreeze(true)
      let state, pose, hidden = 0
      for (let i = 0; i < 1200; i++) {
        window.advanceTime(50)
        state = JSON.parse(window.render_game_to_text())
        pose = window.__paperPose()
        if (!pose.planeVisible) hidden++
        if (state.distance >= (state.journey?.routeId?.includes('finale') ? 460 : 300) || state.result) break
      }
      return { state, pose, hidden }
    })
    expect(flight.state.state).toBe('playing')
    expect(flight.hidden).toBe(0)
    expect(flight.pose.planeVisible).toBe(true)
    expect(flight.pose.wingBounds.min[0]).toBeLessThan(1)
    expect(flight.pose.wingBounds.max[0]).toBeGreaterThan(-1)
    expect(flight.pose.wingBounds.min[1]).toBeLessThan(1)
    expect(flight.pose.wingBounds.max[1]).toBeGreaterThan(-1)
    await page.screenshot({ path: `output/chapter-two-${step}-${choice}-${info.project.name}.png` })
    const final = await page.evaluate(() => {
      let state, pose
      for (let i = 0; i < 1200; i++) {
        window.advanceTime(50)
        state = JSON.parse(window.render_game_to_text())
        pose = window.__paperPose()
        if (state.result) break
      }
      return { state, pose }
    })
    expect(final.state.result?.completed).toBe(true)
    expect(final.pose.planeVisible).toBe(true)
    expect(final.pose.wingBounds.min[0]).toBeLessThan(1)
    expect(final.pose.wingBounds.max[0]).toBeGreaterThan(-1)
    expect(final.pose.wingBounds.min[1]).toBeLessThan(1)
    expect(final.pose.wingBounds.max[1]).toBeGreaterThan(-1)
    expect(errors).toEqual([])
  })
}
