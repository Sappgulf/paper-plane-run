import { expect } from '@playwright/test'

// Shared e2e driving helpers extracted from smoke.spec.js so gameplay specs
// boot and steer the engine exactly the same way the shell tests do.

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

async function waitForShell(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForFunction(
        () => document.documentElement.dataset.shell === 'ready',
        null,
        { timeout: 60_000 },
      )
      return
    } catch {
      // The first-visit service worker claims the page and reloads it once;
      // the boot marker only exists on the settled document.
      await page.waitForTimeout(1_000)
    }
  }
  throw new Error('shell did not become ready')
}

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
  const goto = page.goto(path, { waitUntil: 'domcontentloaded' })
  return goto.then(() => waitForShell(page))
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

async function waitForGameText(page) {
  await expect.poll(
    () => page.evaluate(() => typeof window.render_game_to_text),
    { timeout: 45_000 },
  ).toBe('function')
}

export {
  UPGRADE_CARD_CONTRACTS,
  collectConsoleErrors,
  openApp,
  tap,
  waitForGameText,
}
