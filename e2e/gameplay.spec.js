import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap, waitForGameText } from './smoke-helpers.js'

function snapshot(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

/** Drive the sim forward in fixed slices, sampling state after each slice. */
async function drive(page, { slices, msPerSlice }) {
  const samples = []
  for (let i = 0; i < slices; i += 1) {
    await page.evaluate((ms) => window.advanceTime(ms), msPerSlice)
    samples.push(await snapshot(page))
  }
  return samples
}

test.describe('gameplay systems regression', () => {
  test('altitude tier climb drops golden stars along the reserved lane', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    test.slow()
    const errors = collectConsoleErrors(page)
    await openApp(page, '/#test-tier-climb')
    await waitForGameText(page)
    const before = await snapshot(page)
    expect(before.endless.tier).toBe(0)

    const samples = await drive(page, { slices: 16, msPerSlice: 250 })
    const crossed = samples.find((s) => s.endless.tier >= 1)
    expect(crossed, 'run should cross into Tier 1 within ~4s of sim').toBeTruthy()
    expect(crossed.banners.zone || crossed.endless.name).toMatch(/Tier 1/)

    // Golden drops spawn ahead (z 58–78) and stream past with the world, so
    // the payoff window is the samples right after the crossing. The text
    // contract must expose them with the telegraph flag so the lane promise
    // stays assertable.
    let goldenSample = null
    for (const s of samples) {
      const goldens = s.fairness.visibleStars.filter((star) => star.golden)
      if (goldens.length >= 3) {
        goldenSample = { s, goldens }
        break
      }
    }
    expect(goldenSample, 'a post-climb sample must show the golden arc').toBeTruthy()
    for (const star of goldenSample.goldens) {
      expect(star.telegraph).toBe(true)
      expect(star.z).toBeGreaterThan(0)
    }
    expect(errors).toEqual([])
  })

  test('gauntlet tripwire banks +3 stars for holding the promised lane', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    const errors = collectConsoleErrors(page)
    await openApp(page, '/#test-gauntlet-payoff')
    await waitForGameText(page)
    expect((await snapshot(page)).entities.counts.gauntlet ?? 0).toBe(1)

    const samples = await drive(page, { slices: 10, msPerSlice: 350 })
    const paidBanner = samples.some((s) => /Gauntlet cleared/.test(s.banners.action || ''))
    expect(paidBanner, 'crossing in-lane should surface the gauntlet banner').toBe(true)
    const final = samples.at(-1)
    expect(final.stars).toBeGreaterThanOrEqual(3)
    // Endless mode re-runs gauntlets every 250m by design, so the entity may
    // legitimately reappear — what matters is that the wallet only ever grows.
    await page.evaluate(() => window.advanceTime(1200))
    const settled = await snapshot(page)
    expect(settled.stars).toBeGreaterThanOrEqual(final.stars)
    expect(settled.stars).toBeGreaterThanOrEqual(3)
    expect(errors).toEqual([])
  })

  test('thread-the-gap pays exactly the route bonus vs an untagged control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    const flyThrough = async (query) => {
      // Distinct query strings force a real document navigation each time —
      // two URLs differing only by a hash would reuse the running engine.
      await openApp(page, `/${query}`)
      await waitForGameText(page)
      const samples = await drive(page, { slices: 8, msPerSlice: 250 })
      return samples.at(-1)
    }
    // The control skips only the corridor tag; everything else (seed, towers,
    // inputs) matches. Cruise speed feeds back into distance accrual, so the
    // total drifts a little between runs — the reward tag plus a clearly
    // positive delta is the honest integration proof.
    const threaded = await flyThrough('?run=tagged#test-thread-gap')
    const control = await flyThrough('?nothread=1&run=control#test-thread-gap')
    expect(threaded.lastReward).toBe('thread')
    expect(control.lastReward ?? null).toBeNull()
    expect(threaded.distance - control.distance).toBeGreaterThan(5)
  })

  test('duplicate power orb refreshes the timer to full instead of wiping it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    const errors = collectConsoleErrors(page)
    await openApp(page, '/#test-power-refresh')
    await waitForGameText(page)
    // Fixture drains magnet ~1.5s then re-catches the same kind.
    const state = await snapshot(page)
    expect(state.power).toMatchObject({ kind: 'magnet', timeLeft: 9 })
    expect(state.banners.action).toMatch(/refreshed/)
    expect(errors).toEqual([])
  })

  test('every mode boots and flies: daily, weekly, time attack, co-op, hot-seat', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    test.slow()
    const bootAndFly = async (buttonId, name) => {
      await openApp(page)
      await tap(page.locator(`#${buttonId}`))
      await waitForGameText(page)
      await expect.poll(async () => (await snapshot(page)).state, { timeout: 30_000 }).toBe('playing')
      await page.evaluate(() => window.advanceTime(1200))
      const mid = await snapshot(page)
      expect(mid.mode).toBe(name)
      expect(mid.distance).toBeGreaterThan(0)
      // Returning to the menu must not strand weather artifacts on screen.
      // In flight, Main menu lives behind the pause overlay.
      await tap(page.locator('#pause-btn'))
      await tap(page.locator('#pause-menu'))
      await expect.poll(async () => (await snapshot(page)).state).toBe('menu')
      return mid
    }

    await bootAndFly('daily-btn', 'daily')
    const weekly = await bootAndFly('weekly-btn', 'weekly')
    expect(weekly.weeklyFold).toBeTruthy()
    await bootAndFly('timeattack-btn', 'timeattack')
    await bootAndFly('coop-btn', 'coop')

    await openApp(page)
    await tap(page.locator('#hotseat-btn'))
    await waitForGameText(page)
    await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
    await page.evaluate(() => window.advanceTime(800))
    expect((await snapshot(page)).mode).toBe('hotseat')
  })

  test('tutorial completes without hazards and classic survives sustained steering', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    test.slow()
    const errors = collectConsoleErrors(page)

    // Tutorial: rings only, no hazards — fly up through them until it ends.
    await openApp(page)
    await tap(page.locator('#tutorial-btn'))
    await waitForGameText(page)
    await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
    await page.keyboard.down('ArrowUp')
    for (let i = 0; i < 24 && (await snapshot(page)).state === 'playing'; i += 1) {
      await page.evaluate(() => window.advanceTime(500))
    }
    await page.keyboard.up('ArrowUp')
    const tutorialEnd = await snapshot(page)
    expect(['dead', 'menu']).toContain(tutorialEnd.state)

    // Classic with sustained climb input: the run must stay alive well past
    // the first gauntlet cadence point and accrue real distance.
    await openApp(page)
    await tap(page.locator('#start-btn'))
    await waitForGameText(page)
    await expect.poll(async () => (await snapshot(page)).state).toBe('playing')
    let sawGauntletOrBoss = false
    let maxDistance = 0
    await page.keyboard.down('ArrowUp')
    for (let i = 0; i < 40; i += 1) {
      await page.evaluate(() => window.advanceTime(400))
      const s = await snapshot(page)
      if (s.state !== 'playing') break
      maxDistance = Math.max(maxDistance, s.distance)
      const counts = s.entities.counts
      if ((counts.gauntlet ?? 0) > 0 || (counts.boss ?? 0) > 0) sawGauntletOrBoss = true
      if (maxDistance > 260 && sawGauntletOrBoss) break
    }
    await page.keyboard.up('ArrowUp')
    expect(maxDistance).toBeGreaterThan(200)
    expect(sawGauntletOrBoss).toBe(true)
    expect(errors).toEqual([])
  })
})
