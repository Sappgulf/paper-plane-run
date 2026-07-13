import { expect, test } from '@playwright/test'

function openApp(page, path = '/') {
  return page.goto(path, { waitUntil: 'domcontentloaded' })
}

function tap(locator) {
  return locator.click({ force: true })
}

function collectConsoleErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url || 'inline'}`)
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('menu boots and the hangar returns to the main menu', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)

  await expect(page).toHaveTitle('Paper Plane Run')
  await expect(page.getByRole('heading', { name: 'Paper Plane Run' })).toBeVisible()
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await expect(page.getByRole('heading', { name: 'Hangar' })).toBeVisible()
  await tap(page.getByRole('button', { name: '← Main menu' }))
  await expect(page.locator('#start-btn')).toBeVisible()
  expect(errors).toEqual([])
})

test('first flight starts with launch protection', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#start-btn'))

  await expect(page.locator('#hud')).toBeVisible()
  await expect(page.locator('#power-banner')).toContainText('launch protection active')
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3000 })
  expect(errors).toEqual([])
})

test('Living Journey chooses a route and starts the shared game loop', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)

  await tap(page.getByRole('button', { name: '🗺️ Begin Journey' }))
  await expect(page.getByRole('heading', { name: 'Across the Paper Skies' })).toBeVisible()
  await expect(page.locator('.journey-stop')).toHaveCount(4)
  await expect(page.locator('.journey-pilot')).toHaveCount(2)
  await expect(page.locator('.journey-pilot').first()).toContainText('Level 0')
  await expect(page.locator('.route-objective').first()).toContainText('Goal')
  await expect(page.locator('#journey-panel')).toHaveCSS('touch-action', 'pan-y')
  await tap(page.locator('.journey-route-card').first())

  await expect(page.locator('#hud')).toBeVisible()
  await expect(page.locator('#journey-objective-hud')).toBeVisible()
  await expect(page.locator('#hud-mode')).not.toHaveText('Normal')
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3000 })
  await openApp(page, '/#test-journey-city')
  const textState = await page.evaluate(() => {
    let snapshot = JSON.parse(window.render_game_to_text())
    for (let batch = 0; batch < 6 && snapshot.journey.triggeredEncounterIds.length === 0; batch += 1) {
      window.advanceTime(5000)
      snapshot = JSON.parse(window.render_game_to_text())
    }
    return snapshot
  })
  expect(textState.mode).toBe('journey')
  expect(textState.journey.objective).toBeTruthy()
  expect(textState.journey.triggeredEncounterIds.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('postcard reveal opens details and keeps share fallback visible', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copiedPostcard = text } } })
  })
  await openApp(page, '/#test-postcard')

  await expect(page.locator('#postcard-reveal')).toBeVisible()
  await expect(page.locator('#postcard-reveal img')).toHaveAttribute('src', /aurora-postcard\.webp/)
  await tap(page.getByRole('button', { name: 'View details' }))
  await expect(page.locator('#postcard-detail')).toBeVisible()
  await expect(page.locator('#postcard-detail')).toContainText('Mastery Level 3')
  await tap(page.getByRole('button', { name: 'Share postcard' }))
  await expect(page.locator('#postcard-detail [data-postcard-status]')).toContainText('copied')
  await expect(page.locator('#postcard-detail')).toBeVisible()
})

test('postcard reveal respects reduced motion and compact scrolling', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ reducedMotion: true })))
  await openApp(page, '/#test-postcard')
  await expect(page.locator('html')).toHaveClass(/a11y-reduced-motion/)
  await expect(page.locator('.postcard-surface')).toHaveCSS('overflow-y', 'auto')
  await expect(page.getByRole('button', { name: 'Close postcard' })).toBeInViewport()
})

test('Living Journey selection survives a reload', async ({ page }) => {
  await openApp(page)
  await tap(page.getByRole('button', { name: '🗺️ Begin Journey' }))
  const routeId = await page.locator('.journey-route-card').first().getAttribute('data-route-id')
  await tap(page.locator('.journey-route-card').first())
  await page.reload()
  await tap(page.getByRole('button', { name: '🗺️ Begin Journey' }))

  await expect(page.locator(`[data-route-id="${routeId}"]`)).toHaveClass(/selected/)
})

test('visibility pause freezes and resumes flight distance', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3000 })

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const pausedDistance = await page.locator('#distance').textContent()
  await page.waitForTimeout(500)
  await expect(page.locator('#distance')).toHaveText(pausedDistance)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('#distance')).not.toHaveText(pausedDistance, { timeout: 3000 })
  await expect(page.locator('#power-banner')).toContainText('Resumed')
})

test('mobile flight hides secondary HUD chips', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🕹️ Stick' }))
  await tap(page.locator('#start-btn'))

  await expect(page.locator('#distance')).toBeVisible()
  await expect(page.locator('#stars')).toBeVisible()
  await expect(page.locator('#best').locator('..')).toBeHidden()
  await expect(page.locator('#ctrl-hud')).toBeHidden()
})

test('mobile game-over puts retry before sharing and inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page, '/#test-gameover')

  const retry = page.getByRole('button', { name: 'Fly Again' })
  const share = page.getByRole('button', { name: 'Share Score' })
  await expect(page.getByRole('heading', { name: 'Crashed!' })).toBeVisible()
  await expect(retry).toBeVisible()
  await expect(retry).toBeInViewport()
  expect(await retry.evaluate((button, other) => {
    const shareButton = document.querySelector(other)
    return Boolean(button.compareDocumentPosition(shareButton) & Node.DOCUMENT_POSITION_FOLLOWING)
  }, '#share-btn')).toBe(true)
  await expect(share).toBeVisible()
})

test('mobile Hangar tabs reset the shared scroll position', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))

  const hangarBody = page.locator('.hangar-body')
  await hangarBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await tap(page.getByRole('button', { name: '🛠 Editor' }))

  await expect(page.getByRole('button', { name: '🏢 Building' })).toBeVisible()
  await expect.poll(() => hangarBody.evaluate((element) => element.scrollTop)).toBe(0)
})

test('Aim feel selection survives a Hangar tab round trip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: '⚙️ Settings' }))

  await page.locator('#set-mouse-sens').selectOption('0.75')
  await tap(page.getByRole('button', { name: '🛠 Editor' }))
  await tap(page.getByRole('button', { name: '⚙️ Settings' }))

  await expect(page.locator('#set-mouse-sens')).toHaveValue('0.75')
})
