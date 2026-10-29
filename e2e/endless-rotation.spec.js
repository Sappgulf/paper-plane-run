import { expect, test } from '@playwright/test'
import { openFixture, waitForGameText } from './smoke-helpers.js'

test('the capped endless run changes hazard mix without another tier reward', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a development fixture')
  test.skip(testInfo.project.name !== 'desktop', 'the simulation is shared across devices')
  await openFixture(page, '/?rotation=proof#test-endless-rotation', 'test-endless-rotation')
  await waitForGameText(page)
  const result = await page.evaluate(() => {
    window.__paperFreeze(true)
    const before = JSON.parse(window.render_game_to_text())
    window.advanceTime(1000)
    return { before, after: JSON.parse(window.render_game_to_text()) }
  })
  expect(result.before.endless.tier).toBe(8)
  expect(result.before.endless.modifier).not.toBe(result.after.endless.modifier)
  expect(result.after.endless.tier).toBe(8)
  expect(result.after.endless.speedBonus).toBe(result.before.endless.speedBonus)
  expect(result.after.endless.spacingScale).toBe(result.before.endless.spacingScale)
  expect(result.after.entities.counts.star || 0).toBe(0)
  await expect(page.locator('#zone-banner')).toContainText('Tier 8')
})

test('the spawn pump continues producing waves after the capped mix changes', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a development fixture')
  test.skip(testInfo.project.name !== 'desktop', 'the simulation is shared across devices')
  await openFixture(page, '/?rotation=spawn#test-endless-live')
  const result = await page.evaluate(() => {
    const before = JSON.parse(window.render_game_to_text())
    window.advanceTime(1000)
    return { before, after: JSON.parse(window.render_game_to_text()) }
  })
  expect(result.after.state).toBe('playing')
  expect(result.after.distance).toBeGreaterThan(result.before.distance)
  expect(result.after.endless.modifier).not.toBe(result.before.endless.modifier)
  expect(Object.values(result.after.entities.counts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0)
})
