import { expect, test } from '@playwright/test'
import { openApp, tap } from './smoke-helpers.js'

async function ready(page) {
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await expect(page.locator('#slingshot-plane')).toBeVisible({ timeout: 45000 })
}

test('pull and release starts the run, while a cancelled pull stays ready', async ({ page, isMobile }) => {
  await ready(page)
  const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect((await read()).distance).toBe(0)
  const box = await page.locator('#slingshot-plane').boundingBox()
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 85 }] })
    expect((await read()).launch.charge).toBeGreaterThan(.5)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    expect((await read()).launch.pending).toBe(true)
    expect((await read()).launch.charge).toBe(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 85 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await page.mouse.move(x, y); await page.mouse.down()
    await page.mouse.move(x, y + 5); await page.mouse.up()
    expect((await read()).launch.pending).toBe(true)
    await page.mouse.move(x, y); await page.mouse.down()
    await page.mouse.move(x, y + 85, { steps: 5 })
    expect((await read()).launch.charge).toBeGreaterThan(.5)
    expect((await read()).distance).toBe(0)
    await page.screenshot({ path: 'output/slingshot-pulled.png' })
    await page.mouse.up()
  }
  await expect(page.locator('#slingshot')).toBeHidden()
  await expect.poll(async () => (await read()).distance).toBeGreaterThan(0)
  expect((await read()).launch.pending).toBe(false)
})

test('keyboard launch survives pause and releases without a held Tuck', async ({ page }) => {
  test.slow()
  await ready(page)
  await page.locator('#slingshot-plane').press('Space')
  await expect(page.locator('#slingshot')).toBeHidden()
  await page.locator('#pause-btn').click()
  await expect(page.locator('#pause-overlay')).toBeVisible()
  await page.locator('#pause-menu').click()
  await tap(page.locator('#tutorial-btn'))
  await expect(page.locator('#slingshot-plane')).toBeVisible({ timeout: 45000 })
  await page.locator('#pause-btn').click()
  await expect(page.locator('#slingshot')).toBeHidden()
  await page.locator('#pause-resume').click()
  await expect(page.locator('#slingshot-plane')).toBeFocused()
  await page.locator('#slingshot-plane').press('Enter')
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).distance)).toBeGreaterThan(0)
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).flight.tuckHeld)).toBe(false)
})

test('online score session starts on release', async ({ page }) => {
  let sessions = 0
  await page.route('**/api/leaderboard', route => { sessions++; return route.fulfill({ status: 201, json: { runId: 'a'.repeat(32) } }) })
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await expect(page.locator('#slingshot-plane')).toBeVisible({ timeout: 45000 })
  expect(sessions).toBe(0)
  await page.locator('#slingshot-plane').press('Space')
  await expect.poll(() => sessions).toBe(1)
})

test('disconnecting a held controller cancels its pull', async ({ page }) => {
  await page.addInitScript(() => { navigator.getGamepads = () => window.__launchPad ? [window.__launchPad] : [] })
  await ready(page)
  await page.evaluate(() => { window.__launchPad = { connected: true, axes: [], buttons: [{ pressed: true }] } })
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).launch.charge)).toBeGreaterThan(.5)
  await page.evaluate(() => { window.__launchPad = null })
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).launch.charge)).toBe(0)
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).launch.pending)).toBe(true)
  await page.locator('#slingshot-plane').press('Space')
  await expect(page.locator('#slingshot')).toBeHidden()
})
