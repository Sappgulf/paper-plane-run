import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

test('Ink button fires a straight dart and respects its reload', async ({ page }, info) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic flight fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?actions=ink#test-manual-weapon')
  const ink = page.locator('#ink-btn')
  await expect(ink).toBeVisible()
  await expect(ink).toHaveAttribute('data-ready', 'true')
  const boxes = await Promise.all([ink.boundingBox(), page.locator('#fire-btn').boundingBox()])
  const separated = boxes[0].x + boxes[0].width <= boxes[1].x || boxes[0].y + boxes[0].height <= boxes[1].y
  expect(separated).toBe(true)
  if (info.project.name === 'mobile') await ink.tap()
  else await ink.click()
  const first = await page.evaluate(() => { window.__paperFreeze(true); return JSON.parse(window.render_game_to_text()) })
  expect(first.weapon.shots).toBe(1)
  expect(first.weapon.ready).toBe(false)
  expect(first.weapon.cooldown).toBeGreaterThan(0)
  await expect(ink).toHaveAttribute('data-ready', 'false')
  const feedback = await page.locator('#flight-feedback').boundingBox()
  if (feedback) {
    const action = await ink.boundingBox()
    const overlap = feedback.x < action.x + action.width && feedback.x + feedback.width > action.x && feedback.y < action.y + action.height && feedback.y + feedback.height > action.y
    expect(overlap).toBe(false)
  }
  const retry = await page.evaluate(() => {
    window.__paperFreeze(false)
    document.getElementById('ink-btn').click()
    window.__paperFreeze(true)
    return JSON.parse(window.render_game_to_text()).weapon
  })
  expect(retry.shots).toBe(1)
  expect(retry.ready).toBe(false)
  await page.screenshot({path: `output/flight-actions-${info.project.name}.png`})
  const travelled = await page.evaluate(() => {
    const before = JSON.parse(window.render_game_to_text()).weapon.shotPositions[0]
    window.advanceTime(150)
    const after = JSON.parse(window.render_game_to_text()).weapon.shotPositions[0]
    return {before, after}
  })
  expect(travelled.after.z).toBeGreaterThan(travelled.before.z)
  expect(travelled.after.x).toBeCloseTo(travelled.before.x, 2)
  expect(travelled.after.y).toBeCloseTo(travelled.before.y, 2)
  expect(errors).toEqual([])
})
