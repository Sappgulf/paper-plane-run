import { expect, test } from '@playwright/test'
import { launchPlane, openApp, tap, waitForGameText } from './smoke-helpers.js'

const flight = page => page.evaluate(() => JSON.parse(window.render_game_to_text()).flight)

test('an unrelated finger cannot release a held tuck', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'exercises simultaneous touch input')
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses deterministic flight stepping')
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await waitForGameText(page)
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).state)).toBe('playing')
  await page.evaluate(() => {
    const tuck = document.getElementById('fire-btn')
    tuck.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 41 }))
    window.__paperFreeze(true)
    window.advanceTime(250)
  })
  expect((await flight(page)).tuckPhase).toBe('tucking')
  await page.evaluate(() => {
    document.getElementById('fire-btn').dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'touch', pointerId: 41 }))
    window.advanceTime(100)
  })
  expect((await flight(page)).tuckPhase).toBe('tucking')
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 42 }))
    window.advanceTime(100)
  })
  expect((await flight(page)).tuckPhase).toBe('tucking')
  await page.evaluate(() => {
    const tuck = document.getElementById('fire-btn')
    window.__paperFreeze(false)
    tuck.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Enter' }))
    tuck.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, code: 'Enter' }))
    window.__paperFreeze(true)
    window.advanceTime(100)
  })
  expect((await flight(page)).tuckPhase).toBe('tucking')
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 41 }))
    window.advanceTime(100)
  })
  expect((await flight(page)).tuckPhase).toBe('flaring')
})

test('tutorial card stays centered while it appears', async ({ page }) => {
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await expect(page.locator('#tutorial-hint')).toBeVisible({ timeout: 45_000 })
  const offset = await page.locator('#tutorial-hint').evaluate(element => {
    element.style.animation = 'none'
    void element.offsetWidth
    element.style.removeProperty('animation')
    const animation = element.getAnimations().find(item => item.effect?.target === element)
    if (!animation) throw new Error('Tutorial entrance animation was not found')
    animation.pause()
    animation.currentTime = 160
    const box = element.getBoundingClientRect()
    return Math.abs(box.left + box.width / 2 - innerWidth / 2)
  })
  expect(offset).toBeLessThan(1)
})

for (const [controlMode, expected] of [['joystick', /drag the stick/i], ['mouse', /drag on the sky/i]]) {
  test(`tutorial explains ${controlMode} controls on touch screens`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'checks touch-specific guidance')
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses deterministic flight stepping')
    await page.addInitScript(mode => {
      localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ controlMode: mode }))
    }, controlMode)
    await openApp(page)
    await tap(page.locator('#tutorial-btn'))
    await launchPlane(page)
    await expect(page.locator('#tutorial-copy')).toHaveText(expected, { timeout: 45_000 })
    await waitForGameText(page)
    const reached = await page.evaluate(() => {
      window.__paperFreeze(true)
      for (let step = 0; step < 80; step++) {
        if (document.getElementById('tutorial-title').textContent.includes('Tuck, then flare')) return true
        window.advanceTime(300)
      }
      return false
    })
    expect(reached).toBe(true)
    await expect(page.locator('#tutorial-copy')).toContainText('Tuck button')
    await expect(page.locator('#tutorial-copy')).not.toContainText('Space')
  })
}

test('holding Tuck while steering works with two touch contacts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'exercises a phone touchscreen')
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ controlMode: 'joystick' }))
  })
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await waitForGameText(page)
  await expect(page.locator('#stick-base')).toBeVisible({ timeout: 45_000 })
  const tuck = await page.locator('#fire-btn').boundingBox()
  const stick = await page.locator('#stick-base').boundingBox()
  const touch = (box, id) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id })
  const a = touch(tuck, 1)
  const b = touch(stick, 2)
  await page.evaluate(() => {
    window.__testTouchEvents = []
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'pointerleave', 'touchstart', 'touchend', 'touchcancel']) {
      window.addEventListener(type, event => window.__testTouchEvents.push({ type, id: event.pointerId, target: event.target.id, touches: event.touches?.length }), true)
    }
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] })
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(true)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a, b] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [b] })
  expect((await flight(page)).tuckHeld, JSON.stringify(await page.evaluate(() => window.__testTouchEvents))).toBe(true)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [a] })
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(false)
  await cdp.detach()
})

test('the focused Tuck button remains usable with the keyboard', async ({ page }) => {
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await waitForGameText(page)
  await expect(page.locator('#fire-btn')).toBeVisible({ timeout: 45_000 })
  await page.locator('#fire-btn').focus()
  await page.keyboard.down('Enter')
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(true)
  await page.keyboard.up('Enter')
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(false)
})

test('tutorial state reports the lesson actually shown on screen', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses deterministic flight stepping')
  test.skip(testInfo.project.name !== 'desktop', 'the lesson timeline is shared across devices')
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await waitForGameText(page)
  await expect(page.locator('#tutorial-hint')).toBeVisible({ timeout: 45_000 })
  const result = await page.evaluate(() => {
    window.__paperFreeze(true)
    window.advanceTime(3000)
    return {
      visible: document.getElementById('tutorial-title').textContent.split(' · ')[1],
      reported: JSON.parse(window.render_game_to_text()).tutorialLesson,
    }
  })
  expect(result.reported).toBe(result.visible)
})

test('Tuck keyboard holds clear on focus loss and release independently', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'exercises physical keyboard interaction')
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await launchPlane(page)
  await waitForGameText(page)
  await expect(page.locator('#fire-btn')).toBeVisible({ timeout: 45000 })
  await page.locator('#fire-btn').focus()
  await page.keyboard.down('Enter')
  await page.keyboard.down('Space')
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(true)
  await page.keyboard.up('Enter')
  expect((await flight(page)).tuckHeld).toBe(true)
  await page.locator('#pause-btn').focus()
  await expect.poll(async () => (await flight(page)).tuckHeld).toBe(false)
  await page.keyboard.up('Space')
})
