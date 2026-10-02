import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap, waitForGameText } from './smoke-helpers.js'
import { createJourney } from '../src/journey.js'

const snapshot = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()))

test('Hangar replaces an impossible weapon mission and shows the attainable gauntlet award', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-missions', JSON.stringify({
      day: new Date().toISOString().slice(0, 10), missions: [
        { id: 'sharpshooter-0', type: 'popped', target: 5, label: 'Pop 5 hazards with Ink Blast in one run', progress: 0, done: false, claimed: false },
        { id: 'stars-1', type: 'stars', target: 10, label: 'Collect 10 stars in one run', progress: 6, done: false, claimed: false },
      ],
    }))
  })
  await openApp(page)
  await tap(page.locator('#hangar-btn'))
  await tap(page.locator('#hangar-tab-missions'))
  await expect(page.locator('#missions-list')).not.toContainText('Ink Blast')
  await expect(page.locator('#missions-list')).toContainText('Collect 10 stars in one run')
  await expect(page.locator('#missions-list')).toContainText('6/10')
  await tap(page.locator('#hangar-tab-achievements'))
  await expect(page.locator('#achievements-list')).toContainText('Gauntlet Runner')
  await expect(page.locator('#achievements-list')).not.toContainText('Sharpshooter')
  await page.screenshot({ path: `output/polish-${testInfo.project.name}-awards.png` })
})

test('warm engine shortcuts preserve text entry and native button activation', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await waitForGameText(page)
  const pilot = page.locator('#pilot-name')
  await pilot.fill('')
  await pilot.pressSequentially('Milo Paper')
  await expect(pilot).toHaveValue('Milo Paper')
  expect((await snapshot(page)).state).toBe('menu')
  await page.locator('#hangar-btn').focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#hangar-panel')).toBeVisible()
  expect((await snapshot(page)).state).toBe('menu')
  expect(errors).toEqual([])
})

test('flight guide contains keyboard focus and returns it on close', async ({ page }, testInfo) => {
  await openApp(page)
  await tap(page.locator('#flight-guide-btn'))
  await expect(page.getByRole('dialog', { name: 'A good fold goes further.' })).toBeVisible()
  await expect(page.locator('#flight-guide-close')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('#flight-guide-close')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#flight-guide-close')).toBeFocused()
  await page.screenshot({ path: `output/polish-${testInfo.project.name}-guide.png` })
  await page.keyboard.press('Escape')
  await expect(page.locator('#flight-guide')).toBeHidden()
  await expect(page.locator('#flight-guide-btn')).toBeFocused()
})

test('pause freezes the run, contains focus and resumes through native Space', async ({ page }, testInfo) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
  await expect(page.locator('#altitude-hud')).toHaveAttribute('title', /^sink \d+\.\d\/s \(base \d+\.\d \+ bank \d+\.\d \+ tuck \d+\.\d\)$/)
  await page.keyboard.press('Escape')
  await expect(page.locator('#pause-resume')).toBeFocused()
  const paused = await snapshot(page)
  expect(paused.paused).toBe(true)
  await expect(page.locator('#pause-context')).toContainText('Tutorial')
  await expect(page.locator('#pause-distance')).toHaveText(`${paused.distance}m`)
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#pause-menu')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('#pause-resume')).toBeFocused()
  await page.mouse.move(15, 15)
  await page.waitForTimeout(250)
  expect((await snapshot(page)).distance).toBe(paused.distance)
  await page.screenshot({ path: `output/polish-${testInfo.project.name}-pause.png` })
  await page.keyboard.press('Space')
  await expect(page.locator('#pause-overlay')).toBeHidden()
  await expect(page.locator('#c')).toBeFocused()
  await expect.poll(async () => (await snapshot(page)).distance).toBeGreaterThan(paused.distance)
  await page.keyboard.press('Escape')
  await tap(page.locator('#pause-menu'))
  await expect(page.locator('#menu')).toBeVisible()
  expect(errors).toEqual([])
})

test('menu actions fit phone portrait and landscape without horizontal overflow', async ({ page }, testInfo) => {
  // Returning-player captions must fit too; their line is longer than the
  // first-visit introduction on a 320px screen.
  await page.addInitScript(journey => localStorage.setItem('paper-plane-run-journey-v1', JSON.stringify(journey)), createJourney({ seed: 17 }))
  await openApp(page)
  await expect(page.locator('#journey-launch-copy')).toContainText('Your map awaits')
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport)
    const bounds = await page.locator('#menu .menu-card').boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
    for (const id of ['journey-btn', 'start-btn', 'daily-btn', 'weekly-btn', 'tutorial-btn', 'hangar-btn', 'flight-guide-btn']) {
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 1 })
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const button of await page.locator('#menu .diff-btn').all()) {
      const label = await button.evaluate(node => ({ text: node.textContent, scroll: node.scrollWidth, width: node.clientWidth }))
      expect(label.scroll, `${viewport.width}×${viewport.height}: ${label.text} must fit its button`).toBeLessThanOrEqual(label.width + 1)
    }
    await page.screenshot({ path: `output/polish-${testInfo.project.name}-menu-${viewport.width}.png` })
  }
})

test('a fresh flight clears a held tuck and starts with neutral momentum', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
  await page.keyboard.down('Space')
  await expect.poll(async () => (await snapshot(page)).flight.tuckPhase).toBe('tucking')
  await page.keyboard.press('Escape')
  expect((await snapshot(page)).flight.tuckHeld).toBe(false)
  await page.keyboard.up('Space')
  await tap(page.locator('#pause-menu'))
  // Read the reset in the same browser task as the warm-engine start. Separate
  // Playwright awaits allow ordinary sinking to borrow dive speed before the
  // snapshot, so a valid reset can otherwise look like retained momentum.
  const fresh = await page.evaluate(async () => {
    document.getElementById('tutorial-btn').click()
    let state
    for (let step = 0; step < 50; step++) {
      await Promise.resolve()
      state = JSON.parse(window.render_game_to_text())
      if (state.state === 'playing') return state
    }
    return state
  })
  expect(fresh.state).toBe('playing')
  expect(fresh.flight.tuckPhase).toBe('idle')
  expect(fresh.flight.tuckHeld).toBe(false)
  expect(fresh.flight.tuckCharge).toBe(0)
  expect(fresh.flight.diveSpeed).toBe(0)
  expect(fresh.player.velX).toBe(0)
  expect(fresh.player.bank).toBe(0)
  expect(errors).toEqual([])
})

test('tutorial teaches the current flight loop and reaches a complete result', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'deterministic time stepping is development-only')
  test.skip(testInfo.project.name !== 'desktop', 'shared simulation; mobile controls covered separately')
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
  const first = await snapshot(page)
  expect(first.entities.counts.updraft).toBe(3)
  const lessons = new Set()
  await page.keyboard.down('ArrowUp')
  for (let i = 0; i < 80; i++) {
    const state = await snapshot(page)
    if (state.tutorialLesson) lessons.add(state.tutorialLesson)
    if (state.state !== 'playing') break
    await page.evaluate(() => window.advanceTime(300))
  }
  await page.keyboard.up('ArrowUp')
  expect(lessons).toEqual(new Set([
    'Find your line', 'Height is fuel', 'Ride the rising air', 'Tuck, then flare',
    'Release while you have height', 'Take it into the open sky',
  ]))
  await expect(page.locator('#gameover')).toBeVisible()
  await expect(page.locator('#gameover-title')).toHaveText('Tutorial complete!')
  expect(errors).toEqual([])
})
