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
    const url = message.location().url || 'inline'
    // Nunito is optional presentation with a system-font fallback. A blocked
    // third-party font host must not hide real app/runtime console failures.
    if (message.type() === 'error' && !url.startsWith('https://fonts.gstatic.com/')) {
      errors.push(`${message.text()} @ ${url}`)
    }
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

test('Hangar purchases wallet-priced planes and claims free seasonal planes before equipping', async ({ page }) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-wallet', '25')
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic']))
    localStorage.setItem('paper-plane-run-skin', 'classic')
    localStorage.setItem('paper-plane-run-skins-version', '1')
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ forceSeason: 'halloween' }))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: '🎨 Skins' }))

  const mint = page.locator('.skin-card', { hasText: 'Mint Fold' })
  await expect(mint).toContainText('Purchase 25★')
  await tap(mint)
  await expect(mint).toContainText('Equipped')
  await expect(page.locator('#hangar-wallet')).toHaveText('0')
  await expect(page.locator('#skins-status')).toHaveText('Mint Fold purchased and equipped.')

  const halloween = page.locator('.skin-card', { hasText: 'Jack-o-Plane' })
  await expect(halloween).toContainText('Claim free')
  await tap(halloween)
  await expect(halloween).toContainText('Equipped')
  await expect(page.locator('#hangar-wallet')).toHaveText('0')
  await expect(page.locator('#skins-status')).toHaveText('Jack-o-Plane claimed and equipped.')
  await expect.poll(() => page.evaluate(() => ({
    equipped: localStorage.getItem('paper-plane-run-skin'),
    owned: JSON.parse(localStorage.getItem('paper-plane-run-skins')),
  }))).toMatchObject({ equipped: 'halloween', owned: expect.arrayContaining(['mint', 'halloween']) })
  expect(errors).toEqual([])
})

test('Plane Collection previews the shared equipped silhouette across card states and flight', async ({ page }, testInfo) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-wallet', '100')
    localStorage.setItem('paper-plane-run-lifetime-stars', '50')
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic', 'mint']))
    localStorage.setItem('paper-plane-run-skin', 'classic')
    localStorage.setItem('paper-plane-run-skins-version', '1')
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: '🎨 Skins' }))

  const preview = page.locator('[data-plane-preview]')
  await expect(preview).toHaveAttribute('data-plane-id', 'classic')
  await expect(preview).toHaveAttribute('data-silhouette', 'classic')
  await expect(preview).toHaveAttribute('data-preview-status', 'ready', { timeout: 45_000 })
  await expect(preview.locator('canvas')).toBeVisible()

  const classic = page.locator('.skin-card[data-plane-id="classic"]')
  const mint = page.locator('.skin-card[data-plane-id="mint"]')
  const coral = page.locator('.skin-card[data-plane-id="coral"]')
  const night = page.locator('.skin-card[data-plane-id="night"]')
  await expect(classic).toHaveClass(/state-equipped/)
  await expect(mint).toHaveClass(/state-owned/)
  await expect(coral).toHaveClass(/state-available/)
  await expect(night).toHaveClass(/state-locked/)
  await expect(coral.locator('.plane-requirement')).toHaveText('Lifetime 50★')
  await expect(coral.locator('.plane-price')).toHaveText('Wallet 50★')
  await expect(coral.getByRole('img', { name: 'Coral Wash portrait' })).toHaveAttribute('src', /assets\/planes\/coral\.webp$/)

  await mint.focus()
  await expect(preview).toHaveAttribute('data-plane-id', 'mint')
  await expect(preview).toHaveAttribute('data-silhouette', 'glider')
  await expect(preview).toHaveAttribute('data-preview-status', 'ready')

  await tap(coral)
  await expect(page.locator('.skin-card[data-plane-id="coral"]')).toHaveClass(/state-equipped/)
  await expect(page.locator('#hangar-wallet')).toHaveText('50')
  await expect(page.locator('#skins-status')).toHaveText('Coral Wash purchased and equipped.')
  await expect(preview).toHaveAttribute('data-plane-id', 'coral')
  await expect(preview).toHaveAttribute('data-silhouette', 'dart')
  await expect(preview).toHaveAttribute('data-preview-status', 'ready')
  await page.locator('.hangar-body').evaluate((element) => { element.scrollTop = 0 })
  if (process.env.CAPTURE_TASK5_PROOF === '1') {
    await page.screenshot({
      path: `output/task-5-browser-proof/plane-collection-${testInfo.project.name}.png`,
      animations: 'disabled',
    })
  }

  await tap(page.getByRole('button', { name: '← Main menu' }))
  await tap(page.locator('#start-btn'))
  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(gameState.plane).toMatchObject({ skinId: 'coral', silhouette: 'dart', collisionRadius: 0.7 })
  expect(errors).toEqual([])
})

test('a delayed engine chunk shows preparation before flight starts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  let engineRequests = 0
  let releaseEngine
  const engineGate = new Promise((resolve) => {
    releaseEngine = resolve
  })
  await page.route('**/src/flight-engine.js*', async (route) => {
    engineRequests += 1
    await engineGate
    await route.continue()
  })

  await openApp(page)
  await tap(page.locator('#start-btn'))

  await expect(page.locator('#engine-status')).toHaveText('Preparing your plane...')
  releaseEngine()
  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  expect(engineRequests).toBe(1)
})

test('an aborted engine chunk offers a retry that can start flight', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  let engineRequests = 0
  await page.route('**/src/flight-engine.js*', async (route) => {
    engineRequests += 1
    if (engineRequests === 1) await route.abort('failed')
    else await route.continue()
  })

  await openApp(page)
  await tap(page.locator('#start-btn'))

  await expect(page.locator('#engine-status')).toContainText('Couldn’t prepare your plane')
  await expect(page.locator('#engine-retry')).toBeVisible()
  await expect(page.locator('#start-btn')).toBeEnabled()
  await tap(page.locator('#engine-retry'))
  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  // A registered service worker may satisfy the reload from cache, bypassing
  // page.route; the visible HUD is the authoritative recovery assertion.
  expect(engineRequests).toBeGreaterThanOrEqual(1)
})

test('a preloaded engine applies shell graphics settings and rolls denied AR back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  await page.addInitScript(() => {
    window.__denyCamera = false
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: async () => {},
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          if (!window.__denyCamera) return new MediaStream()
          throw new DOMException('Camera permission denied', 'NotAllowedError')
        },
      },
    })
  })
  page.on('dialog', (dialog) => dialog.dismiss())

  await openApp(page)
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 15_000 })
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: '⚙️ Settings' }))

  await page.locator('#set-low-power').check({ force: true })
  await page.locator('#set-colorblind').check({ force: true })
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).settings)).toMatchObject({
    lowPower: true,
    colorblindPowers: true,
    shadowsEnabled: false,
    dustVisible: false,
    shieldPowerColor: 0x0077bb,
  })

  await page.locator('#set-ar').click({ force: true })
  await expect(page.locator('#set-ar')).toBeChecked()
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).settings)).toMatchObject({
    arDesk: true,
    arActive: true,
  })

  await page.locator('#set-ar').click({ force: true })
  await expect(page.locator('#set-ar')).not.toBeChecked()
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).settings)).toMatchObject({
    arDesk: false,
    arActive: false,
  })

  await page.evaluate(() => { window.__denyCamera = true })
  await page.locator('#set-ar').click({ force: true })
  await expect(page.locator('#set-ar')).not.toBeChecked()
  await expect.poll(() => page.evaluate(() => ({
    runtime: JSON.parse(window.render_game_to_text()).settings,
    saved: JSON.parse(localStorage.getItem('paper-plane-run-settings-v1')),
  }))).toMatchObject({
    runtime: { arDesk: false, arActive: false },
    saved: { arDesk: false },
  })
})

test('replaying custom routes uses the latest editor layout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  await openApp(page)
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 15_000 })
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: '🛠 Editor' }))

  await page.locator('#editor-import').fill('L1|First%20route|T0.0,8.0,40.0')
  await tap(page.locator('#editor-load'))
  await tap(page.locator('#editor-play'))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).layout)).toEqual({
    name: 'First route',
    itemTypes: ['star'],
  })

  await page.locator('#hangar-btn').evaluate((button) => button.click())
  await tap(page.getByRole('button', { name: '🛠 Editor' }))
  await page.locator('#editor-import').fill('L1|Current%20route|R1.0,9.0,35.0;P-2.0,7.0,55.0')
  await tap(page.locator('#editor-load'))
  await tap(page.locator('#editor-play'))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).layout)).toEqual({
    name: 'Current route',
    itemTypes: ['bird', 'power'],
  })
})

test('starting a new Journey records journey_restarted analytics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🗺️ Begin Journey' }))
  await tap(page.getByRole('button', { name: 'Start a new Journey' }))

  const restarted = await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem('paper-plane-run-analytics') || '[]')
    return events.findLast((event) => event.e === 'journey_restarted')
  })
  expect(restarted?.p?.journeyId).toBeTruthy()
})

test('first flight starts with launch protection', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#start-btn'))

  await expect(page.locator('#hud')).toBeVisible({ timeout: 15_000 })
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

  await expect(page.locator('#hud')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#journey-objective-hud')).toBeVisible()
  await expect(page.locator('#hud-mode')).not.toHaveText('Normal')
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3000 })
  // Changing only the hash can keep the live flight document. A query change
  // guarantees a fresh boot into the deterministic Journey test state.
  await openApp(page, '/?e2e=journey#test-journey-city')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && typeof window.advanceTime === 'function', null, { timeout: 15_000 })
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
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 15_000 })

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

  await expect(page.locator('#distance')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#stars')).toBeVisible()
  await expect(page.locator('#best').locator('..')).toBeHidden()
  await expect(page.locator('#ctrl-hud')).toBeHidden()
})

test('mobile game-over puts retry before sharing and inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page, '/#test-gameover')

  const retry = page.getByRole('button', { name: 'Fly Again' })
  const share = page.getByRole('button', { name: 'Share Score' })
  await expect(page.getByRole('heading', { name: 'Crashed!' })).toBeVisible({ timeout: 15_000 })
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
