import { expect, test } from '@playwright/test'

const UPGRADE_CARD_CONTRACTS = [
  { id: 'handling', name: 'Fold Handling', current: 'Control response +32%', next: 'Control response +40%' },
  { id: 'lift', name: 'Lift Crease', current: 'Sink rate -32%', next: 'Sink rate -40%' },
  { id: 'glide', name: 'Long Glide', current: 'Cruise speed +16% · score +12%', next: 'Cruise speed +20% · score +15%' },
  { id: 'magnet', name: 'Star Magnet', current: 'Star pull +165%', next: 'Star pull +220%' },
  { id: 'shield', name: 'Tough Fiber', current: 'Shield duration +60%', next: 'Shield duration +80%' },
  { id: 'luck', name: 'Lucky Scrap', current: 'Star spawns +36% · power-ups +30%', next: 'Star spawns +48% · power-ups +40%' },
  { id: 'wingspan', name: 'Wide Wings', current: 'Plane scale 1.36× · near-miss window 1.70×', next: 'Plane scale 1.44× · near-miss window 1.85×' },
  { id: 'trail', name: 'Paper Trail', current: 'Score aura +4%', next: 'Score aura +6%' },
  { id: 'turbo', name: 'Turbo Fold', current: 'Boost grace +0.30s · hitbox 0.66×', next: 'Boost grace +0.45s · hitbox 0.60×' },
  { id: 'guardian', name: 'Guardian Crease', current: 'Crash saves 1 per run', next: 'Crash saves 2 per run' },
  { id: 'weapon', name: 'Ink Blast', current: 'Ink cooldown 0.56s', next: 'Ink cooldown 0.38s' },
  { id: 'fever', name: 'Fever Focus', current: 'Fever at 6 near-misses · 5.50s', next: 'Fever at 5 near-misses · 6.25s' },
  { id: 'streak', name: 'Steady Hands', current: 'Star streak window 3.00s', next: 'Star streak window 3.40s' },
  { id: 'wealth', name: 'Gold Rush', current: 'Cluster chance +16% (stacks with Lucky Scrap)', next: 'Cluster chance +24% (stacks with Lucky Scrap)' },
]

function openApp(page, path = '/') {
  page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-disable-sw', '1')
    // The one-time "rotate to landscape" nudge is injected into the menu card's
    // normal flow at module init, so on touch projects it appears after first
    // paint and shifts every button below it. `tap` force-clicks, which skips
    // Playwright's stability wait, so a click resolved before the shift lands
    // somewhere else — the Hangar tap silently missed and left the menu open.
    // Mark it seen so mobile layout is settled before any test touches it.
    localStorage.setItem('paper-plane-run-landscape-hint-seen', '1')
  })
  return page.goto(path, { waitUntil: 'domcontentloaded' })
}

/**
 * Click something and actually land on it.
 *
 * This used to default to `click({ force: true })`, which skips Playwright's
 * actionability and stability checks. That does not make a click more
 * reliable — it makes a *missed* click silent: the click is dispatched at
 * whatever coordinates the element had, so a menu still settling or a banner
 * on top swallows it and the test fails much later somewhere unrelated
 * ("element not found" three steps down). Several mobile flakes traced back
 * here.
 *
 * Now the element must be visible and settled first, and a normal click is
 * tried before anything forceful. The escalation is kept because some overlays
 * legitimately sit over their own controls.
 */
async function tap(locator, options = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await expect(locator).toBeVisible({ timeout: 15_000 })
  try {
    await locator.click({ timeout: 10_000 })
    return
  } catch {
    // Covered by an overlay, still moving — or the click landed and the click
    // itself tore the element down (tapping Hangar hides the menu that holds
    // the Hangar button), which surfaces as a post-click timeout. Escalating
    // blindly then fails against an element that is legitimately gone, so
    // check for that before trying anything else.
  }
  if (!(await locator.isVisible().catch(() => false))) return
  try {
    await locator.click({ force: true, timeout: 5_000 })
    return
  } catch {
    // Fall through to a direct DOM click.
  }
  if (!(await locator.isVisible().catch(() => false))) return
  const element = await locator.elementHandle({ timeout: 5_000 }).catch(() => null)
  await element?.evaluate((node) => node.click())
}

// `/api/*` are Vercel serverless functions. The e2e harness serves the app with
// `vite dev`, which does not host them, so a finished run posting its score
// 404s here and nowhere else. Filtering it keeps tests that let a run *end*
// from failing on the harness rather than on the app.
const ENVIRONMENT_ONLY_ERROR_URLS = [
  // Nunito is optional presentation with a system-font fallback.
  'https://fonts.gstatic.com/',
  '/api/leaderboard',
  '/api/analytics',
]

function collectConsoleErrors(page) {
  const errors = []
  page.on('console', (message) => {
    const url = message.location().url || 'inline'
    // A blocked third-party font host or an unserved API route must not hide
    // real app/runtime console failures.
    const environmentOnly = ENVIRONMENT_ONLY_ERROR_URLS.some((prefix) =>
      prefix.startsWith('http') ? url.startsWith(prefix) : url.includes(prefix))
    if (message.type() === 'error' && !environmentOnly) {
      errors.push(`${message.text()} @ ${url}`)
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

function getGameState() {
  const snapshot = window.render_game_to_text ? window.render_game_to_text() : null
  if (!snapshot) return null
  try {
    return JSON.parse(snapshot)
  } catch {
    return null
  }
}

async function waitForGameText(page) {
  await expect.poll(
    () => page.evaluate(() => typeof window.render_game_to_text),
    { timeout: 45_000 },
  ).toBe('function')
}

async function pickJourneyRouteCard(page, targetRisk = 'Risky') {
  const selected = await page.evaluate((riskLabel) => {
    const cards = [...document.querySelectorAll('.journey-route-card')]
    if (!cards.length) return null
    const target = String(riskLabel || '').toLowerCase()
    const targetIndex = cards.findIndex((card) => {
      const label = card.querySelector('.route-risk')
      return (label?.textContent || '').toLowerCase().includes(target)
    })
    const chosenIndex = targetIndex >= 0 ? targetIndex : 0
    const chosen = cards[chosenIndex]
    const rewardCopy = chosen.querySelector('.route-reward')?.textContent?.trim() || ''
    const riskCopy = chosen.querySelector('.route-risk')?.textContent?.trim() || ''
    chosen.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return { index: chosenIndex, rewardCopy, riskCopy }
  }, targetRisk)
  if (!selected) return null
  return {
    route: page.locator('.journey-route-card').nth(selected.index),
    rewardCopy: selected.rewardCopy,
    riskCopy: selected.riskCopy,
  }
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

test('Journey route cards and the live HUD expose stamps and shortcut risk', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.getByRole('button', { name: '🗺️ Begin Journey' }))

  await expect(page.locator('.journey-route-card')).toHaveCount(2)
  await expect(page.locator('.journey-route-card .zone-stamp')).toHaveCount(2)
  await expect(page.locator('.journey-route-card .zone-stamp').first()).toHaveAttribute('data-zone', 'city')

  const selection = await pickJourneyRouteCard(page)
  expect(selection).toBeTruthy()
  const rewardCopy = selection.rewardCopy
  const rewardMultiplier = rewardCopy.match(/(\d+\.\d+)× rewards/)?.[1]
  expect(rewardMultiplier).toBeTruthy()

  // A Journey leg is only ~350m, so an idle plane can finish it in seconds. A
  // chain of separate awaits lets the leg end mid-chain and then asserts
  // against the results screen, so capture the whole route HUD in one
  // evaluation that is only valid while the run is still playing.
  await expect.poll(
    async () => page.evaluate(() => {
      const state = JSON.parse(window.render_game_to_text())
      if (state.mode !== 'journey' || state.state !== 'playing') return { playing: false }
      const visible = (id) => {
        const node = document.getElementById(id)
        return Boolean(node) && !node.classList.contains('hidden')
      }
      return {
        playing: true,
        routeVisible: visible('flight-route'),
        risk: document.getElementById('flight-route-risk')?.textContent,
        stampZone: document.getElementById('flight-route-stamp')?.dataset.zone,
        objectiveVisible: visible('journey-objective-hud'),
        objectiveHasText: /\S/.test(document.getElementById('journey-objective-val')?.textContent || ''),
      }
    }),
    { timeout: 45_000 },
  ).toMatchObject({
    playing: true,
    routeVisible: true,
    risk: `SHORTCUT · ${rewardMultiplier}×`,
    stampZone: 'city',
    objectiveVisible: true,
    objectiveHasText: true,
  })
  expect(errors).toEqual([])
})

test('Hangar upgrade cards show exact current, next, and max contracts', async ({ page }) => {
  test.slow()
  test.setTimeout(240_000)
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-wallet', '2000')
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({
      handling: 4,
      lift: 4,
      glide: 4,
      magnet: 3,
      shield: 3,
      luck: 3,
      wingspan: 2,
      trail: 2,
      turbo: 2,
      guardian: 1,
      weapon: 3,
      fever: 2,
      streak: 2,
      wealth: 2,
    }))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))

  await expect(page.locator('.upgrade-card')).toHaveCount(UPGRADE_CARD_CONTRACTS.length)
  for (const contract of UPGRADE_CARD_CONTRACTS) {
    const card = page.locator(`.upgrade-card[data-upgrade-id="${contract.id}"]`)
    await expect(card.locator('.u-effect-current')).toHaveText(`Current: ${contract.current}`)
    await expect(card.locator('.u-effect-next')).toHaveText(`Next: ${contract.next}`)
  }

  for (const contract of UPGRADE_CARD_CONTRACTS) {
    const card = page.locator(`.upgrade-card[data-upgrade-id="${contract.id}"]`)
    await tap(card.locator('.u-buy'))
    await expect(card.locator('.u-effect-current')).toHaveText(`Current: ${contract.next}`)
    await expect(card.locator('.u-effect-next')).toHaveText('Next: MAX — all ranks purchased')
    await expect(card.locator('.u-max')).toHaveText('MAX')
  }
  expect(errors).toEqual([])
})

test('Hangar exposes prestige cap without offering a rewardless reset', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-prestige', '50')
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({
      handling: 5,
      lift: 5,
      glide: 5,
      magnet: 4,
      shield: 4,
      luck: 4,
      wingspan: 3,
      trail: 3,
      turbo: 3,
      guardian: 2,
      weapon: 4,
      fever: 3,
      streak: 3,
      wealth: 3,
    }))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))

  const panel = page.locator('#prestige-panel')
  await expect(panel.locator('strong')).toHaveText('✦ Paper Legend 50 · MAX')
  await expect(panel.locator('span')).toContainText('+150% score & star luck')
  await expect(panel.getByRole('button', { name: /Prestige/ })).toHaveCount(0)
  await expect(panel).not.toContainText('+3%')
  expect(errors).toEqual([])
})

test('Hangar purchases wallet-priced planes and claims free seasonal planes before equipping', async ({ page }) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-wallet', '20')
    localStorage.setItem('paper-plane-run-lifetime-stars', '25')
    localStorage.setItem('paper-plane-run-skins', JSON.stringify(['classic']))
    localStorage.setItem('paper-plane-run-skin', 'classic')
    localStorage.setItem('paper-plane-run-skins-version', '1')
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ forceSeason: 'halloween' }))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('tab', { name: '🎨 Planes' }))

  const mint = page.locator('.skin-card', { hasText: 'Mint Fold' })
  await expect(mint).toContainText('Purchase 18★')
  await tap(mint)
  await expect(mint).toContainText('Equipped')
  await expect(page.locator('#hangar-wallet')).toHaveText('2')
  await expect(page.locator('#skins-status')).toHaveText('Mint Fold purchased and equipped.')

  const halloween = page.locator('.skin-card', { hasText: 'Jack-o-Plane' })
  await expect(halloween).toContainText('Claim free')
  await tap(halloween)
  await expect(halloween).toContainText('Equipped')
  await expect(page.locator('#hangar-wallet')).toHaveText('2')
  await expect(page.locator('#skins-status')).toHaveText('Jack-o-Plane claimed and equipped.')
  await expect.poll(() => page.evaluate(() => ({
    equipped: localStorage.getItem('paper-plane-run-skin'),
    owned: JSON.parse(localStorage.getItem('paper-plane-run-skins')),
  }))).toMatchObject({ equipped: 'halloween', owned: expect.arrayContaining(['mint', 'halloween']) })
  expect(errors).toEqual([])
})

test('Mission claims credit the wallet stars promised by the Hangar copy', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-wallet', '0')
    localStorage.setItem('paper-plane-run-lifetime-stars', '0')
    localStorage.setItem('paper-plane-run-missions', JSON.stringify({
      day: new Date().toISOString().slice(0, 10),
      missions: [{
        id: 'stars-0',
        type: 'stars',
        target: 20,
        label: 'Collect 20 stars in one run',
        progress: 20,
        done: true,
        claimed: false,
      }],
      claimStars: 0,
    }))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('tab', { name: '🎯 Missions' }))

  await page.getByRole('button', { name: 'Claim' }).evaluate((button) => {
    button.click()
    button.click()
  })
  await expect(page.locator('#hangar-wallet')).toHaveText('10')
  await expect(page.locator('#hangar-lifetime')).toHaveText('10')
  await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paper-plane-run-missions')).claimStars)).toBe(10)
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
  await tap(page.getByRole('tab', { name: '🎨 Planes' }))

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
  await expect(coral.locator('.plane-price')).toHaveText('Wallet 32★')
  await expect(coral.getByRole('img', { name: 'Coral Wash portrait' })).toHaveAttribute('src', /assets\/planes\/coral\.webp$/)

  await mint.focus()
  await expect(preview).toHaveAttribute('data-plane-id', 'mint')
  await expect(preview).toHaveAttribute('data-silhouette', 'glider')
  await expect(preview).toHaveAttribute('data-preview-status', 'ready')

  await tap(coral)
  await expect(page.locator('.skin-card[data-plane-id="coral"]')).toHaveClass(/state-equipped/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('paper-plane-run-skin'))).toBe('coral')
  await expect(page.locator('#hangar-wallet')).toHaveText('68')
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

test('Plane Collection releases each preview WebGL context without losing gameplay', async ({ page }) => {
  test.slow()
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await page.locator('#c').evaluate((canvas) => {
    window.__webglContextLosses = { gameplay: 0, preview: 0 }
    canvas.addEventListener('webglcontextlost', () => {
      window.__webglContextLosses.gameplay += 1
    })
  })

  const visits = 6
  for (let visit = 1; visit <= visits; visit += 1) {
    await tap(page.getByRole('tab', { name: '🎨 Planes' }))
    const preview = page.locator('[data-plane-preview]')
    await expect(preview).toHaveAttribute('data-preview-status', 'ready', { timeout: 45_000 })
    await preview.locator('canvas').evaluate((canvas) => {
      canvas.addEventListener('webglcontextlost', () => {
        window.__webglContextLosses.preview += 1
      }, { once: true })
    })

    await tap(page.getByRole('tab', { name: '🔧 Upgrades' }))
    await expect.poll(() => page.evaluate(() => window.__webglContextLosses)).toEqual({
      gameplay: 0,
      preview: visit,
    })
  }

  await tap(page.getByRole('button', { name: '← Main menu' }))
  await tap(page.locator('#start-btn'))
  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3_000 })
  await expect.poll(() => page.evaluate(() => ({
    state: JSON.parse(window.render_game_to_text()).state,
    contextLosses: window.__webglContextLosses,
  }))).toEqual({
    state: 'playing',
    contextLosses: { gameplay: 0, preview: visits },
  })
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
  const engineWarnings = []
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('Flight engine')) {
      engineWarnings.push(message.text())
    }
  })
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
  expect(engineWarnings.filter((message) => message.includes('Flight engine preload failed'))).toHaveLength(1)
  expect(engineWarnings.some((message) => message.includes('Flight engine unavailable'))).toBe(false)
})

test('a preloaded engine applies shell graphics settings and rolls denied AR back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  const arWarnings = []
  let arPermissionDialogs = 0
  const arToast = page.locator('#challenge-toast')
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('AR desk mode unavailable')) {
      arWarnings.push(message.text())
    }
  })
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
  page.on('dialog', (dialog) => {
    arPermissionDialogs += 1
    dialog.dismiss()
  })

  await openApp(page)
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 15_000 })
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: '⚙️ Settings' }))

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
  await expect(arToast).toHaveText('Camera permission needed for Desk AR')
  await page.waitForTimeout(2200)
  await page.locator('#set-ar').click({ force: true })
  await expect(page.locator('#set-ar')).not.toBeChecked()
  await expect.poll(() => page.evaluate(() => ({
    runtime: JSON.parse(window.render_game_to_text()).settings,
    saved: JSON.parse(localStorage.getItem('paper-plane-run-settings-v1')),
  }))).toMatchObject({
    runtime: { arDesk: false, arActive: false },
    saved: { arDesk: false },
  })
  await expect(arToast).toBeVisible()
  await expect(arToast).toHaveText('Camera permission needed for Desk AR')
  await page.waitForTimeout(2600)
  await expect(arToast).toBeHidden()
  expect(arWarnings).toHaveLength(0)
  expect(arPermissionDialogs).toBe(0)
})

test('replaying custom routes uses the latest editor layout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.slow()
  await openApp(page)
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 15_000 })
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: '🛠 Editor' }))

  await page.locator('#editor-import').fill('L1|First%20route|T0.0,8.0,40.0')
  await tap(page.locator('#editor-load'))
  await tap(page.locator('#editor-play'))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).layout)).toEqual({
    name: 'First route',
    itemTypes: ['star'],
  })

  await page.locator('#hangar-btn').evaluate((button) => button.click())
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: '🛠 Editor' }))
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

test('max upgrades expose deterministic in-flight feedback on desktop and mobile', async ({ page }, testInfo) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await openApp(page, '/?upgrade-proof=max#test-upgrades-shield')

  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('#power-label')).toContainText('Shield')
  await expect(page.locator('#guardian-hud')).toBeVisible()
  await expect(page.locator('#guardian-hud-val')).toHaveText('2')
  await expect(page.locator('#fire-btn')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('#magnet-pull-trail')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('#magnet-pull-trail')).not.toHaveAttribute('aria-live', /.+/)
  const shieldUpgrades = await page.evaluate(() => JSON.parse(window.render_game_to_text()).upgrades)
  expect(shieldUpgrades).toMatchObject({
    handling: { acceleration: 58.8 },
    lift: { sinkPerSecond: 1.44 },
    glide: { cruiseSpeed: expect.any(Number) },
    magnet: { active: true, trailActive: true },
    shield: { duration: 14.4 },
    luck: { starChance: expect.any(Number) },
    wingspan: { visualScale: 1.44, collisionPlaneRadius: 0.7 },
    trail: { visible: true },
    turbo: { graceSeconds: 1.35, collisionScale: 0.6 },
    guardian: { charges: 2, remaining: 2 },
    weapon: { unlocked: true, ready: true, cooldownSeconds: 0.38 },
    fever: { threshold: 5, duration: 6.6, active: false },
    streak: { count: 0 },
  })
  expect(shieldUpgrades.streak.windowSeconds).toBeCloseTo(3.4)
  expect(shieldUpgrades.luck.starChance).toBeCloseTo(0.8584)
  expect(shieldUpgrades.luck.doubleStarChance).toBeGreaterThan(0.25)
  if (process.env.CAPTURE_TASK7_PROOF === '1') {
    await page.screenshot({
      path: `output/task-7-browser-proof/max-shield-${testInfo.project.name}.png`,
      animations: 'disabled',
    })
  }

  await openApp(page, '/?upgrade-proof=max#test-upgrades-boost')
  await expect(page.locator('#boost-safety-cue')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('#boost-safety-cue')).toContainText('0.45s')
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).upgrades.turbo)).toMatchObject({
    active: true,
    graceSeconds: 1.35,
    collisionScale: 0.6,
  })
  if (process.env.CAPTURE_TASK7_PROOF === '1') {
    await page.screenshot({
      path: `output/task-7-browser-proof/max-boost-${testInfo.project.name}.png`,
      animations: 'disabled',
    })
  }
  expect(errors).toEqual([])
})

test('live flight loop wires seeded upgrade spawning, collision fairness, and ink cooldown', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({
      controlMode: 'mouse',
      mouseSensitivity: 0.75,
      haptics: false,
    }))
  })

  await openApp(page, '/?twist-star-mul=1.6#test-upgrade-live-spawn')
  await waitForGameText(page)
  const baselineSpawn = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(baselineSpawn.upgrades.handling.follow).toBeCloseTo(0.275)
  expect(baselineSpawn.upgrades.luck.twistStarMultiplier).toBe(1.6)
  expect(baselineSpawn.upgrades.luck.starChance).toBeCloseTo(0.928)
  expect(baselineSpawn.upgrades.fever.threshold).toBe(8)
  expect(baselineSpawn.upgrades.streak.windowSeconds).toBeCloseTo(2.2)
  // 1.6 hazard radius + 0.7 plane radius × the 0.52 air-damage weight. The
  // weight dropped from 0.72 when bird and scissors hitboxes were deliberately
  // shrunk so only visibly lethal air hazards end a run.
  expect(baselineSpawn.fairness.airDamageRadius).toBe(1.964)
  expect(baselineSpawn.fairness.visibleHazards.length).toBeGreaterThan(0)
  expect(baselineSpawn.fairness.visibleHazards.every(({ passageLane }) => [-1, 0, 1].includes(passageLane))).toBe(true)

  await openApp(page, '/?upgrade-proof=max&twist-star-mul=1.6#test-upgrade-live-spawn')
  await waitForGameText(page)
  const maxSpawn = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(maxSpawn.entities.counts.star).toBeGreaterThan(baselineSpawn.entities.counts.star)
  // Powers roll at most once per chunk, so over 32 chunks the *count* is a
  // single noisy sample — and the two configs consume different numbers of RNG
  // draws (max spawns more stars), so their streams diverge and the counts can
  // tie at the same value while the upgrade is working perfectly. Assert the
  // spawn rate the upgrade actually controls, which is deterministic.
  expect(maxSpawn.upgrades.luck.powerChance).toBeGreaterThan(baselineSpawn.upgrades.luck.powerChance)
  expect(maxSpawn.upgrades.fever.threshold).toBe(5)
  // Max fever + streak synergy adds +0.35s duration on top of Fever Focus max.
  expect(maxSpawn.upgrades.fever.duration).toBeCloseTo(6.6)
  expect(maxSpawn.upgrades.streak.windowSeconds).toBeCloseTo(3.4)
  expect(maxSpawn.upgrades.luck.doubleStarChance).toBeGreaterThan(baselineSpawn.upgrades.luck.doubleStarChance)

  await openApp(page, '/?upgrade-proof=fever-max#test-upgrade-live-fever')
  await waitForGameText(page)
  const feverLive = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(feverLive.upgrades.fever.active).toBe(true)
  expect(feverLive.upgrades.fever.threshold).toBe(5)
  expect(feverLive.upgrades.fever.timer).toBeGreaterThan(0)
  await expect(page.locator('#fever-hud')).toBeVisible()
  await expect(page.locator('#fever-val')).toContainText('1.5x')

  await openApp(page, '/?upgrade-proof=streak-max#test-upgrade-live-streak')
  await waitForGameText(page)
  const streakLive = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(streakLive.upgrades.streak.count).toBe(5)
  expect(streakLive.upgrades.streak.visible).toBe(true)
  expect(streakLive.upgrades.streak.windowSeconds).toBeCloseTo(3.4)
  await expect(page.locator('#streak-hud')).toBeVisible()
  await expect(page.locator('#streak-val')).toHaveText('5')
  await expect(page.locator('#power-banner')).toContainText('Star Streak')

  await openApp(page, '/?upgrade-proof=wingspan-max&collision=near#test-upgrade-live-collision')
  await waitForGameText(page)
  await page.evaluate(() => window.advanceTime(1000 / 60))
  const nearCollision = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(nearCollision.upgrades.wingspan.visualScale).toBe(1.44)
  expect(nearCollision.plane.collisionRadius).toBe(0.7)
  expect(nearCollision.state).toBe('playing')

  await openApp(page, '/?upgrade-proof=wingspan-max&collision=hit#test-upgrade-live-collision')
  await waitForGameText(page)
  await page.evaluate(() => window.advanceTime(1000 / 60))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).state)).toBe('dead')

  await openApp(page, '/?upgrade-proof=weapon-max#test-upgrade-live-cooldown')
  await waitForGameText(page)
  await page.keyboard.down('x')
  await page.evaluate(() => window.advanceTime(1000 / 60))
  await page.keyboard.up('x')
  const fired = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(fired.entities.counts.shot).toBe(1)
  expect(fired.upgrades.weapon).toMatchObject({ ready: false, cooldownSeconds: 0.38 })
  await page.evaluate(() => window.advanceTime(400))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).upgrades.weapon.ready)).toBe(true)

  expect(errors).toEqual([])
})

test('flight ticks reuse cached upgrade effects instead of reading storage every frame', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem
    window.__upgradeStorageReads = 0
    Storage.prototype.getItem = function getItem(key) {
      if (key === 'paper-plane-run-upgrades') window.__upgradeStorageReads += 1
      return originalGetItem.call(this, key)
    }
  })
  await openApp(page, '/?upgrade-proof=weapon-max#test-upgrade-live-cooldown')
  await waitForGameText(page)
  const before = await page.evaluate(() => window.__upgradeStorageReads)
  await page.evaluate(() => window.advanceTime(1000))
  const after = await page.evaluate(() => window.__upgradeStorageReads)
  expect(after).toBe(before)
})

test('reduced motion keeps shield and phase feedback stable in the live loop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ reducedMotion: true, haptics: false }))
  })

  for (const power of ['shield', 'phase']) {
    await openApp(page, `/#test-upgrades-${power}`)
    await waitForGameText(page)
    const before = await page.evaluate(() => JSON.parse(window.render_game_to_text()).upgrades.shield)
    await page.evaluate(() => window.advanceTime(700))
    const after = await page.evaluate(() => JSON.parse(window.render_game_to_text()).upgrades.shield)
    expect(before.visualVisible).toBe(true)
    expect(after.visualVisible).toBe(true)
    expect(after.visualOpacity).toBe(before.visualOpacity)
  }
})

test('existing bosses expose deterministic readable phases and accessibility cues', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')

  await openApp(page, '/?boss-proof=scissors#test-boss-encounter')
  await waitForGameText(page)
  const scissors = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(scissors.boss).toMatchObject({ kind: 'scissors', phase: 'warning', completed: false })
  expect(scissors.boss.passage).toMatchObject({ halfWidth: 4.8, halfHeight: 4.4 })
  expect([-1, 0, 1]).toContain(scissors.boss.safeLane)
  expect(scissors.plane.collisionRadius).toBe(0.7)
  await page.evaluate(() => window.advanceTime(1550))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).boss.phase)).toBe('pressure')
  await page.evaluate(() => window.advanceTime(1600))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).boss.phase)).toBe('final-pass')

  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({
      reducedMotion: true,
      colorblindPowers: true,
      haptics: false,
    }))
  })
  await openApp(page, '/?boss-proof=wind#test-boss-encounter')
  await waitForGameText(page)
  const wind = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(wind.boss).toMatchObject({ kind: 'wind', phase: 'warning', shapeCue: 'radial-vane-ring' })
  expect(wind.settings).toMatchObject({ reducedMotion: true, colorblindPowers: true })
  expect(wind.plane.collisionRadius).toBe(0.7)

  await openApp(page, '/?boss-proof=scissors&boss-pass=1#test-boss-encounter')
  await waitForGameText(page)
  await page.evaluate(() => window.advanceTime(220))
  const cleared = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(cleared.state).toBe('playing')
  expect(cleared.boss).toMatchObject({ kind: 'scissors', completed: true })
  expect(cleared.stars).toBe(5)
})

test('native performance pressure lowers visual cost without changing gameplay state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await openApp(page, '/#test-upgrade-live-cooldown')
  await waitForGameText(page)
  const before = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('paperplane:native-runtime', {
      detail: { thermalState: 'serious', lowPowerMode: false, memoryPressure: false },
    }))
  })
  const after = await page.evaluate(() => JSON.parse(window.render_game_to_text()))

  expect(before.state).toBe('playing')
  expect(after.state).toBe('playing')
  expect(after.performance.quality).toMatchObject({ level: 'low', pixelRatio: 1, shadows: false })
  expect(after.performance.nativeSignal.thermalState).toBe('serious')
})

test('Living Journey chooses a route and starts the shared game loop', async ({ page }) => {
  test.slow()
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

  await expect(page.locator('#hud')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('#journey-objective-hud')).toBeVisible()
  await expect(page.locator('#hud-mode')).not.toHaveText('Normal')
  await expect(page.locator('#distance')).not.toHaveText('0m', { timeout: 3000 })
  // Changing only the hash can keep the live flight document. A query change
  // guarantees a fresh boot into the deterministic Journey test state.
  await openApp(page, '/?e2e=journey#test-journey-city')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && typeof window.advanceTime === 'function', null, { timeout: 45_000 })
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
  // Selected by data-ctrl rather than label: the visible text is just "Stick",
  // and the emoji this used to match has not been in the markup for a while.
  await tap(page.locator('.ctrl-btn[data-ctrl="joystick"]'))
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

test('game-over summarizes banked rewards and the next action', async ({ page }) => {
  await openApp(page, '/#test-gameover')

  const summary = page.locator('#run-summary')
  await expect(summary).toBeVisible({ timeout: 15_000 })
  await expect(summary).toContainText('Banked')
  await expect(summary).toContainText('+3★')
  await expect(summary).toContainText('Banked 3★ · keep flying toward an upgrade')
  await expect(page.getByRole('button', { name: 'Hangar · 3★' })).toBeVisible()
})

test('Hangar Progress/Meta filter keeps only the active group tabs visible', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: '🏠 Hangar' }).click()

  await expect(page.getByRole('tab', { name: /Upgrades/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Editor/ })).toBeHidden()

  await page.getByRole('button', { name: 'Meta' }).click()
  await expect(page.getByRole('tab', { name: /Board/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Upgrades/ })).toBeHidden()
  await expect(page.getByRole('tab', { name: /Editor/ })).toBeVisible()
})

test('leaderboard renders pilot names as text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-lb-local', JSON.stringify([{
      name: '<b>pilot</b>',
      distance: 42,
      stars: 3,
      mode: 'normal',
      at: Date.now(),
    }]))
  })
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: /Board/ }))

  const row = page.locator('#board-list .board-row').first()
  await expect(row).toContainText('<b>pilot</b>')
  await expect(row.locator('b, img, script')).toHaveCount(0)
})

test('mobile Hangar tabs reset the shared scroll position', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))

  const hangarBody = page.locator('.hangar-body')
  await hangarBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: '🛠 Editor' }))

  await expect(page.getByRole('button', { name: '🏢 Building' })).toBeVisible()
  await expect.poll(() => hangarBody.evaluate((element) => element.scrollTop)).toBe(0)
})

test('Aim feel selection survives a Hangar tab round trip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await openApp(page)
  await tap(page.getByRole('button', { name: '🏠 Hangar' }))
  await tap(page.getByRole('button', { name: 'Meta' }))
  await tap(page.getByRole('tab', { name: '⚙️ Settings' }))

  await page.locator('#set-mouse-sens').selectOption('0.75')
  await tap(page.getByRole('tab', { name: '🛠 Editor' }))
  await tap(page.getByRole('tab', { name: '⚙️ Settings' }))

  await expect(page.locator('#set-mouse-sens')).toHaveValue('0.75')
})

test('ground skim rewards flying the low lane and releases when you climb', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({
      controlMode: 'mouse',
      mouseSensitivity: 0.75,
      haptics: false,
    }))
  })

  await openApp(page)
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  const skimHud = page.locator('#skim-hud')
  await expect(skimHud).toBeHidden()

  const viewport = page.viewportSize()
  // Flying at minimum altitude through a city eventually clips a building and
  // restarts the run, so assert on the best chain seen across the hold rather
  // than on whatever the final frame happens to hold.
  const holdLow = async (ms) => {
    const deadline = Date.now() + ms
    let peak = { tier: 0, scoreMultiplier: 1, stars: 0, y: Number.POSITIVE_INFINITY }
    while (Date.now() < deadline) {
      await page.mouse.move(viewport.width / 2, viewport.height - 4)
      await page.waitForTimeout(60)
      const snapshot = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
      if (snapshot.groundSkim.tier >= peak.tier) {
        peak = {
          tier: snapshot.groundSkim.tier,
          scoreMultiplier: snapshot.groundSkim.scoreMultiplier,
          stars: snapshot.stars,
          y: Math.min(peak.y, snapshot.player.y),
          ceiling: snapshot.groundSkim.ceiling,
        }
      }
    }
    return peak
  }

  const peak = await holdLow(12_000)
  expect(peak.y).toBeLessThan(peak.ceiling)
  // Tiers accrue while low, each paying stars and lifting the score multiplier.
  expect(peak.tier).toBeGreaterThanOrEqual(2)
  expect(peak.scoreMultiplier).toBeGreaterThan(1)
  expect(peak.stars).toBeGreaterThan(0)
  await expect(skimHud).toBeVisible()
  await expect(skimHud).toHaveClass(/skim-tier-/)

  // Climbing out past the grace window ends the chain and hides the chip.
  const deadline = Date.now() + 4_000
  while (Date.now() < deadline) {
    await page.mouse.move(viewport.width / 2, 90)
    await page.waitForTimeout(60)
  }
  const climbed = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(climbed.groundSkim.active).toBe(false)
  expect(climbed.groundSkim.tier).toBe(0)
  expect(climbed.groundSkim.scoreMultiplier).toBe(1)
  await expect(skimHud).toBeHidden()

  expect(errors).toEqual([])
})

test('ground life dresses each zone without entering the flight corridor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  const life = await page.evaluate(() => JSON.parse(window.render_game_to_text()).groundLife)
  expect(life.zone).toBe('city')
  // A whole field costs one draw call per species, however many instances.
  expect(life.draws).toBe(life.species.length)
  expect(life.species.length).toBeGreaterThanOrEqual(3)
  expect(life.instances).toBeGreaterThan(80)
  for (const species of life.species) {
    expect(species.count).toBeGreaterThan(0)
    // Hazard lanes top out around x = 7.2. Upright props must clear them; the
    // flat decal band is the one class allowed to cross under the plane.
    if (species.motion === 'none') continue
    expect(species.minAbsX).toBeGreaterThan(11)
  }

  // Scenery is decoration and must yield to the frame budget. This browser is
  // headless and software-rendered, so frame health lands on 'critical' and
  // quality drops to 'low' — exactly the pressure that should shed the field.
  // (Real GPU numbers are not assertable here; measure those in a real browser.)
  await expect
    .poll(
      () => page.evaluate(() => JSON.parse(window.render_game_to_text()).performance.status),
      { timeout: 30_000 },
    )
    .not.toBe('warming')
  const performance = await page.evaluate(() => JSON.parse(window.render_game_to_text()).performance)
  if (performance.quality.level === 'low') {
    const shed = await page.evaluate(() => JSON.parse(window.render_game_to_text()).groundLife)
    expect(shed.draws).toBe(0)
    expect(shed.instances).toBe(0)
  }
  expect(errors).toEqual([])
})

/**
 * Flies a long run using the DEV `advanceTime` stepper plus a potential-field
 * autopilot steering off the snapshot's own hazard list. A real-time run dies
 * long before the endless long tail, and the tiers under test only begin at
 * 1000m.
 *
 * The DEV `seed` query parameter pins classic/endless randomness, so failures
 * can be replayed from the test URL instead of depending on a lucky retry.
 */
async function flyAutopilot(page, { untilDistance, maxFrames = 60 * 900, attempts = 5 }) {
  return page.evaluate(async ({ untilDistance, maxFrames, attempts }) => {
    const snapshot = () => JSON.parse(window.render_game_to_text())
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    const restart = async () => {
      const button = [...document.querySelectorAll('button')]
        .find((candidate) => /Fly Again|Retry/i.test(candidate.textContent))
        || document.getElementById('retry-btn')
      button?.click()
      // The restart lands on a later frame, not synchronously on the click.
      for (let waited = 0; waited < 40; waited += 1) {
        await nextFrame()
        if (snapshot().state === 'playing') return true
      }
      return snapshot().state === 'playing'
    }
    const send = (type, code) =>
      window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }))
    const held = new Set()
    const hold = (code, want) => {
      if (want && !held.has(code)) { held.add(code); send('keydown', code) }
      else if (!want && held.has(code)) { held.delete(code); send('keyup', code) }
    }
    // Pick the (x, y) with the most clearance, weighting nearer hazards higher.
    const aim = (state) => {
      const hazards = state.fairness.visibleHazards.filter((h) => h.z > 1 && h.z < 75)
      let best = { x: 0, y: 9, score: -Infinity }
      for (let x = -6; x <= 6; x += 0.5) {
        for (let y = 4; y <= 15; y += 0.5) {
          let score = -Math.abs(y - 9) * 0.05 - Math.abs(x) * 0.02
          for (const hazard of hazards) {
            const radius = hazard.radius + state.fairness.airDamageRadius
            const gap = Math.hypot(hazard.x - x, hazard.y - y)
            const nearness = 1 + Math.max(0, 75 - hazard.z) / 75 * 3
            if (gap < radius + 2) score -= (radius + 2 - gap) * nearness * 3
          }
          if (score > best.score) best = { x, y, score }
        }
      }
      return best
    }

    // One flight. Observations are per-attempt: a run that died short tells us
    // nothing about tiers it never reached.
    const fly = () => {
      const tiers = []
      const laps = []
      let lastTier = -1
      let lastLap = 0
      let peakDistance = 0
      for (let frame = 0; frame < maxFrames; frame += 1) {
        const state = snapshot()
        if (state.state !== 'playing') return { died: true, peakDistance, tiers, laps }
        peakDistance = state.distance
        if (state.endless.tier !== lastTier) {
          lastTier = state.endless.tier
          tiers.push({
            tier: state.endless.tier,
            name: state.endless.name,
            modifier: state.endless.modifier,
            distance: state.distance,
            spacingScale: state.endless.spacingScale,
            scoreMultiplier: state.endless.scoreMultiplier,
            capped: state.endless.capped,
          })
        }
        if (state.endless.zoneLap !== lastLap) {
          lastLap = state.endless.zoneLap
          laps.push({ lap: state.endless.zoneLap, distance: state.distance, zone: state.groundLife.zone })
        }
        if (state.distance >= untilDistance) return { died: false, peakDistance, tiers, laps }
        const target = aim(state)
        hold('ArrowLeft', state.player.x < target.x - 0.25)
        hold('ArrowRight', state.player.x > target.x + 0.25)
        hold('ArrowUp', state.player.y < target.y - 0.35)
        hold('ArrowDown', state.player.y > target.y + 0.35)
        window.advanceTime(1000 / 60)
      }
      return { died: false, timedOut: true, peakDistance, tiers, laps }
    }

    let best = { died: true, peakDistance: -1, tiers: [], laps: [] }
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (snapshot().state !== 'playing' && !(await restart())) break
      const result = fly()
      if (result.peakDistance > best.peakDistance) best = result
      if (!result.died) return { ...result, attempts: attempt + 1 }
      // Release the keys so a dead run's held input can't leak into the retry.
      for (const code of [...held]) hold(code, false)
    }
    return { ...best, attempts }
  }, { untilDistance, maxFrames, attempts })
}

test('endless tiers keep escalating the run past the point every other dial caps', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page, '/?seed=endless-tier-smoke')
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  const opening = await page.evaluate(() => JSON.parse(window.render_game_to_text()).endless)
  // Everything before 1000m must fly exactly as it shipped.
  expect(opening).toMatchObject({ tier: 0, name: null, modifier: null, spacingScale: 1, scoreMultiplier: 1, capped: false })

  const run = await flyAutopilot(page, { untilDistance: 7_400 })
  const flightReport = JSON.stringify({
    died: run.died,
    timedOut: run.timedOut,
    attempts: run.attempts,
    peakDistance: Math.round(run.peakDistance),
    tiers: run.tiers.map((entry) => entry.tier),
  })
  expect(run.died, flightReport).toBe(false)
  expect(Math.round(run.peakDistance), flightReport).toBeGreaterThanOrEqual(7_400)

  const climbed = run.tiers.filter((entry) => entry.tier > 0)
  expect(climbed.length, flightReport).toBeGreaterThanOrEqual(8)

  // Tier 1 begins at 1000m, and every tier after it is 900m further out.
  expect(climbed[0].tier).toBe(1)
  expect(climbed[0].distance).toBeGreaterThanOrEqual(1_000)
  expect(climbed[0].distance).toBeLessThan(1_060)

  for (let index = 1; index < climbed.length; index += 1) {
    const previous = climbed[index - 1]
    const current = climbed[index]
    expect(current.tier).toBe(previous.tier + 1)
    // Each tier is named, and waves tighten while the payoff grows.
    expect(current.name).toContain(`Tier ${current.tier}`)
    expect(current.modifier).toBeTruthy()
    expect(current.modifier).not.toBe(previous.modifier)
    expect(current.spacingScale).toBeLessThan(previous.spacingScale)
    expect(current.scoreMultiplier).toBeGreaterThan(previous.scoreMultiplier)
    // Waves must never compress past the readable floor.
    expect(current.spacingScale).toBeGreaterThanOrEqual(0.82)
  }

  const last = climbed[climbed.length - 1]
  expect(last.tier).toBe(8)
  expect(last.capped).toBe(true)

  expect(errors).toEqual([])
})

test('the endless route cycles zones instead of freezing on the final one', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page, '/?seed=endless-route-smoke')
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  const run = await flyAutopilot(page, { untilDistance: 5_000 })
  const flightReport = JSON.stringify({
    died: run.died,
    timedOut: run.timedOut,
    attempts: run.attempts,
    peakDistance: Math.round(run.peakDistance),
    laps: run.laps,
  })
  expect(run.died, flightReport).toBe(false)

  // Two full laps of the zone table, each folding back to Paper City.
  expect(run.laps.length, flightReport).toBeGreaterThanOrEqual(2)
  for (const lap of run.laps) {
    expect(lap.zone).toBe('city')
  }
  expect(run.laps[0].lap).toBe(1)
  expect(run.laps[1].lap).toBe(2)
  // Laps are one full zone loop apart.
  expect(run.laps[1].distance - run.laps[0].distance).toBeGreaterThan(2_200)
  expect(run.laps[1].distance - run.laps[0].distance).toBeLessThan(2_600)

  expect(errors).toEqual([])
})

test('an in-flight notification clears the HUD chip row instead of covering it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page)

  // In the menu the HUD is hidden and the toast keeps its own top row.
  const menuTop = await page.evaluate(() => {
    const toast = document.getElementById('challenge-toast')
    toast.textContent = 'Season event'
    toast.classList.remove('hidden')
    return Math.round(toast.getBoundingClientRect().top)
  })
  expect(menuTop).toBeLessThan(96)

  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  // In flight, even a wrapped multi-line toast over a fully expanded HUD row
  // must sit clear of it — the HUD carries the values the player is reading.
  const boxes = await page.evaluate(async () => {
    const hud = document.getElementById('hud')
    const toast = document.getElementById('challenge-toast')
    for (const chip of hud.children) chip.classList.remove('hidden')
    toast.textContent = 'Tier 1 · Headwind — The air pushes back — waves arrive closer together.'
    toast.classList.remove('hidden')
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const hudBox = hud.getBoundingClientRect()
    const toastBox = toast.getBoundingClientRect()
    return { hudBottom: hudBox.bottom, hudTop: hudBox.top, toastTop: toastBox.top }
  })
  expect(boxes.hudBottom).toBeGreaterThan(boxes.hudTop)
  expect(boxes.toastTop).toBeGreaterThanOrEqual(boxes.hudBottom)

  expect(errors).toEqual([])
})

test('a cold load shows the banked wallet, not the markup placeholder', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  // Arrive as a returning player with stars banked and upgrades in reach.
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-wallet', '318')
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-lifetime-stars', '318')
  })
  await openApp(page)

  // The menu ships visible in the markup, so nothing calls showMenu() on a
  // cold load — the wallet has to be synced during boot instead.
  const hangarBtn = page.locator('#hangar-btn')
  await expect(page.locator('#wallet-stars')).toHaveText('318')
  // With that much banked, the affordability highlight must be lit.
  await expect(hangarBtn).toHaveClass(/hangar-can-spend/)

  expect(errors).toEqual([])
})

test('hazard motion never carries a hazard into the reserved passage lane', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  // Step the run deterministically and check every airborne hazard against the
  // lane it was spawned to keep clear, on every frame. The guarantee has to
  // hold for a hazard's whole path, not just the frame it spawned on — the
  // previous integrated motion drifted one way and could close the lane.
  const report = await page.evaluate(() => {
    const LANE_X = [-6, 0, 6]
    const PLANE_RADIUS = 0.7
    const AIR_DAMAGE_WEIGHT = 0.52
    const MARGIN = 0.35
    const snapshot = () => JSON.parse(window.render_game_to_text())
    let worstSlack = Infinity
    let worst = null
    let checks = 0
    let frames = 0
    for (let frame = 0; frame < 60 * 200; frame += 1) {
      const state = snapshot()
      if (state.state !== 'playing') break
      for (const hazard of state.fairness.visibleHazards) {
        if (hazard.type !== 'bird' || hazard.passageLane == null) continue
        const laneX = LANE_X[hazard.passageLane + 1]
        if (laneX === undefined) continue
        // Each hazard's own envelope, not the snapshot's fixed sample radius.
        const need = hazard.radius + PLANE_RADIUS * AIR_DAMAGE_WEIGHT + MARGIN
        const slack = Math.abs(hazard.x - laneX) - need
        checks += 1
        if (slack < worstSlack) {
          worstSlack = slack
          worst = { slack, x: hazard.x, laneX, radius: hazard.radius, distance: state.distance }
        }
      }
      frames += 1
      window.advanceTime(1000 / 60)
    }
    return { worstSlack, worst, checks, frames }
  })

  const detail = JSON.stringify(report)
  // The run has to actually have produced hazards for this to mean anything.
  expect(report.checks, detail).toBeGreaterThan(500)
  // The snapshot rounds positions to two decimals, so a hazard sitting exactly
  // on the boundary can read as much as 0.005 inside it. The exact invariant is
  // proven over the whole time domain in test/hazardPatterns.test.js; this guard
  // is here to catch the engine wiring drifting, and cannot resolve finer than
  // its own input.
  expect(report.worstSlack, detail).toBeGreaterThan(-0.006)

  expect(errors).toEqual([])
})

test('stars spread across lanes instead of stacking on the guaranteed one', async ({ page }, testInfo) => {
  test.slow()
  test.skip(testInfo.project.name !== 'desktop')
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)

  // Sample stars while they are still far ahead, before the plane's magnet or
  // its own position can have moved them.
  const mix = await page.evaluate(() => {
    const LANE_X = [-6, 0, 6]
    const snapshot = () => JSON.parse(window.render_game_to_text())
    const lanes = new Map(LANE_X.map((x) => [x, 0]))
    let offAxis = 0
    let total = 0
    for (let frame = 0; frame < 60 * 90; frame += 1) {
      window.advanceTime(1000 / 60)
      if (frame % 10) continue
      const state = snapshot()
      if (state.state !== 'playing') break
      for (const star of state.fairness.visibleStars) {
        if (star.z < 130) continue
        const lane = LANE_X.find((x) => Math.abs(star.x - x) <= 0.85)
        if (lane === undefined) offAxis += 1
        else lanes.set(lane, lanes.get(lane) + 1)
        total += 1
      }
    }
    return { lanes: Object.fromEntries(lanes), offAxis, total }
  })

  const detail = JSON.stringify(mix)
  // A run that crashes early still samples plenty; keep the floor low enough
  // that this asserts on the mix rather than on how long the plane survived.
  expect(mix.total, detail).toBeGreaterThan(30)
  // Every lane must be used — the point is that the reserved lane is no longer
  // the only place a star can be.
  for (const count of Object.values(mix.lanes)) {
    expect(count, detail).toBeGreaterThan(0)
  }
  // And no single lane may hold nearly all of them.
  const busiest = Math.max(...Object.values(mix.lanes))
  expect(busiest / mix.total, detail).toBeLessThan(0.8)

  expect(errors).toEqual([])
})
