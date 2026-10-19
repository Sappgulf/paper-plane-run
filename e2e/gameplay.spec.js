import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, openFixture, tap, waitForGameText } from './smoke-helpers.js'

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

// The Vite dev server occasionally re-transforms its module graph mid-session
// and full-reloads the page (observed: a transient `EngineLifecycleError` from
// a `?t=`-busted re-transform, then a reload). The reload lands on a plain
// menu because the engine scrubs `?query` and `#hash` from the address bar
// after its first boot. A pass that dies to that is not a fixture failure —
// re-run the whole pass from a fresh deep-link boot.
const ENV_RESET = /no longer live|Execution context was destroyed|is not a function/
async function withEnvRetries(pass) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await pass()
      return
    } catch (error) {
      if (attempt === 1 || !ENV_RESET.test(String(error?.message ?? error))) throw error
    }
  }
}

test.describe('gameplay systems regression', () => {
  // Every test in this file drives the sim through `window.advanceTime` and
  // boots from a `#test-*` state. Both are `import.meta.env.DEV` hooks that
  // Vite strips from a production build, so this is a dev-server suite by
  // construction (`npm run test:e2e`). Run under PLAYWRIGHT_PREVIEW it failed
  // every test on a missing hook rather than on anything about the game, which
  // made `npm run test:e2e:prod` — a documented verification step — permanently
  // red and therefore useless as a signal.
  test.skip(
    process.env.PLAYWRIGHT_PREVIEW === '1',
    'drives the sim through DEV-only advanceTime/#test-* hooks; run npm run test:e2e',
  )

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
    expect(await page.evaluate(() => Number(localStorage.getItem('paper-plane-run-lifetime-gauntlets')))).toBeGreaterThanOrEqual(1)
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
      // Fixed-step reward accounting cannot also integrate wall-clock rAF
      // while the browser is waiting on screenshots or another test worker.
      await page.evaluate(() => window.__paperFreeze(true))
      return drive(page, { slices: 8, msPerSlice: 250 })
    }

    // The bonus is measured *inside* one run, as the jump in the slice where it
    // lands, rather than by comparing two runs' totals. The runs free-run on
    // rAF between navigation and the first driven slice, so they never accrue
    // exactly the same amount of untimed flight — and since cruise speed now
    // rides on how fast the plane is descending, that drift can exceed the
    // reward itself and swamp the very thing being measured.
    const threadedSamples = await flyThrough('?run=tagged#test-thread-gap')
    const threaded = threadedSamples.at(-1)
    expect(threaded.lastReward).toBe('thread')

    const deltas = threadedSamples.map((sample, index) => (
      index === 0 ? null : sample.distance - threadedSamples[index - 1].distance
    ))
    const payoutIndex = threadedSamples.findIndex((sample, index) => (
      index > 0 && sample.lastReward === 'thread' && threadedSamples[index - 1].lastReward !== 'thread'
    ))
    expect(payoutIndex, 'no slice recorded the thread payout').toBeGreaterThan(0)
    // Cruise-only slices set the baseline the payout slice has to clear.
    const cruise = deltas.filter((delta, index) => delta !== null && index !== payoutIndex)
    const baseline = cruise.reduce((sum, delta) => sum + delta, 0) / cruise.length
    expect(deltas[payoutIndex] - baseline).toBeGreaterThan(15)

    const control = (await flyThrough('?nothread=1&run=control#test-thread-gap')).at(-1)
    expect(control.lastReward ?? null).toBeNull()
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

  test('every mode boots and flies: daily, weekly, tutorial, classic', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
    test.slow()
    const bootAndFly = async (buttonId, name) => {
      await openApp(page)
      await waitForGameText(page)
      // A menu mid-layout-change can swallow a click; the state poll retries
      // the tap once so a single miss never fails the whole boot.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await tap(page.locator(`#${buttonId}`))
        try {
          await expect.poll(async () => (await snapshot(page)).state, { timeout: 20_000 }).toBe('playing')
          break
        } catch {
          if (attempt === 1) throw new Error(`mode ${name} did not start after two taps`)
        }
      }
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

    // Time Attack, co-op and hot-seat were removed: each was a separate verb
    // competing with the core loop for tuning attention. The modes that remain
    // are the ones the game is actually about, and every one of them still has
    // to boot, fly and return to the menu cleanly.
    await bootAndFly('daily-btn', 'daily')
    const weekly = await bootAndFly('weekly-btn', 'weekly')
    expect(weekly.weeklyFold).toBeTruthy()
    await bootAndFly('start-btn', 'classic')
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
    for (let i = 0; i < 60 && (await snapshot(page)).state === 'playing'; i += 1) {
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

  test('boss gate off-lane lights the hole chevron on the trailing screen edge', async ({ page }, testInfo) => {
    // Desktop's landscape frustum is wider than the whole flight corridor, so
    // the gate hole never leaves it: |x| caps at MAX_X 13 while the half-width
    // at the gate plane is ~74 units, and the chevron's 0.92 NDC arm point is
    // unreachable (probed: it never lights on desktop across the whole gate
    // approach). The narrow portrait frustum is exactly the player this cue
    // exists for, so the live behaviour is locked in there.
    test.skip(testInfo.project.name !== 'mobile')
    const errors = collectConsoleErrors(page)
    await withEnvRetries(async () => {
      await openFixture(page, '/?boss-proof=scissors#test-boss-encounter')

      // The fixture parks spawns and hands out approach invuln, so the only
      // thing under test is the cue. x increases left on screen (see the
      // snapshot's coordinateSystem note): drifting the plane toward +x slides
      // the gate hole toward the screen's right edge, so #edge-threat-right is
      // the element that must light.
      await page.keyboard.down('ArrowLeft')
      try {
        // Each poll step drives one fixed sim slice, so the sampling grid is
        // deterministic no matter how the wall-clock retries space out. The
        // budgets are wall-clock and each slice costs the better part of a
        // second under a software renderer — generous on purpose.
        await expect.poll(async () => {
          await page.evaluate(() => window.advanceTime(250))
          return (await snapshot(page)).player.x
        }, { timeout: 20_000 }).toBeGreaterThanOrEqual(5)

        await expect.poll(async () => page.evaluate(() => {
          window.advanceTime(250)
          const el = document.getElementById('edge-threat-right')
          if (!el || el.classList.contains('hidden')) return 0
          return Number(el.style.opacity) || 0
        }), { timeout: 25_000 }).toBeGreaterThan(0.5)
      } finally {
        await page.keyboard.up('ArrowLeft')
      }
      // Sim time only advances inside advanceTime, so the lit state read back
      // here is the same frame the poll succeeded on.
      const lit = await page.evaluate(() => {
        const el = document.getElementById('edge-threat-right')
        return { hidden: el?.classList.contains('hidden'), opacity: Number(el?.style.opacity) }
      })
      expect(lit.hidden).toBe(false)
      expect(lit.opacity).toBeGreaterThan(0.5)
    })
    expect(errors).toEqual([])
  })

  test('boss approach pulls the camera back and releases it once the gate is behind', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop')
    test.setTimeout(150_000)
    const errors = collectConsoleErrors(page)

    // The pullback is not part of render_game_to_text (it only rides the DEV
    // __paperDeathCause probe), but the live camera rig is: with no boss the
    // chase sits at z −8 exactly, and while a gate is ahead of the plane's
    // slice the rig eases out to −8 × 1.55 = −12.4. Every sample must come
    // from a live run — a wiped boot idles at the menu, whose camera never
    // moves and would satisfy the settle assertion for nothing. The guard and
    // the step share one evaluate so a boot lost mid-test surfaces as the
    // sentinel instead of leaking raw "advanceTime is not a function" errors.
    const stepCamZ = (fixtureLabel) => page.evaluate((label) => {
      if (typeof window.advanceTime !== 'function' || typeof window.__paperPose !== 'function') return null
      try {
        if (JSON.parse(window.render_game_to_text()).state !== 'playing') return null
        window.advanceTime(250)
        return window.__paperPose().camPos[2]
      } catch {
        return null
      }
    }, fixtureLabel).catch(() => null).then((camZ) => {
      if (camZ === null) throw new Error(`${fixtureLabel} fixture run is no longer live (environment reload reset the boot)`)
      return camZ
    })

    // One full pass: pull-in while the gate is ahead, then settle after the
    // gate expires behind. If the environment reloads onto the scrubbed URL
    // mid-pass (the engine wipes ?query and #hash after its first boot), the
    // sentinel fires and the pass starts over from a fresh deep-link boot.
    const pullInAndSettle = async () => {
      await openFixture(page, '/?boss-proof=scissors#test-boss-encounter')
      // Boot must start at the plain chase distance before any sim step runs
      // the ease. (No step yet: read the pose directly, guarded the same way.)
      expect(await page.evaluate(() => (
        typeof window.__paperPose === 'function' ? window.__paperPose().camPos[2] : null
      ))).toBe(-8)
      // The pullback crosses 1.375 (camZ −11) within ~3 fixed slices of sim.
      await expect.poll(() => stepCamZ('boss'), { timeout: 10_000 }).toBeLessThan(-11)
      // The invulnerable fixture can neither die to the gate nor clear it, so
      // gate expiry is the retire path; the ease back to the plain chase then
      // needs a few seconds of sim to converge on −8. The budget is wall-clock
      // and each fixed 250ms slice costs the better part of a second under a
      // software renderer, so this is generous on purpose.
      await expect.poll(() => stepCamZ('boss'), { timeout: 45_000 }).toBeGreaterThan(-8.01)
    }
    const bootAndHold = async () => {
      await openFixture(page, '/?proof=nocam#test-upgrade-live-cooldown')
      // A parked boot with no boss at all must hold the plain chase distance
      // exactly through the same amount of stepping.
      for (let slice = 0; slice < 8; slice += 1) {
        expect(await stepCamZ('control')).toBe(-8)
      }
    }
    for (const pass of [pullInAndSettle, bootAndHold]) {
      await withEnvRetries(pass)
    }
    expect(errors).toEqual([])
  })

  test('a hazard centred behind the plane is a pass, not a death', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop')
    const errors = collectConsoleErrors(page)

    await withEnvRetries(async () => {
      // 'tail' parks a scissors with its centre just behind the plane's centre
      // (z −0.78, dead-centre x). The kill window closes just past centre
      // contact (dz > −0.3), so the near-miss path may fire but the run must
      // survive every frame the hazard sits in the plane's slice.
      await openFixture(page, '/?collision=tail#test-upgrade-live-collision')
      const tail = await drive(page, { slices: 6, msPerSlice: 1000 / 60 })
      for (const sample of tail) {
        expect(sample.state).toBe('playing')
      }

      // Control: dead-centre is the ordinary lethal hit and must die within
      // the same window — the fixture only differs in the hazard's z.
      await openFixture(page, '/?collision=hit#test-upgrade-live-collision')
      await expect.poll(async () => {
        await page.evaluate(() => window.advanceTime(1000 / 60))
        return (await snapshot(page)).state
      }, { timeout: 5_000 }).toBe('dead')
    })
    expect(errors).toEqual([])
  })

  test('tucking under the ground-warning band forces the release cue while held', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop')
    const errors = collectConsoleErrors(page)

    await withEnvRetries(async () => {
      // The fixture parks the plane at y=3 — inside the 4-unit ground-warning
      // band — with spawns parked and invuln up, so the cue is the only thing
      // under test and the tuck cannot end the run.
      await openFixture(page, '/?proof=tucklow#test-upgrade-live-tucklow')

      const readTuckCue = () => page.evaluate(() => {
        const hud = document.getElementById('tuck-hud')
        return {
          hidden: hud?.classList.contains('hidden') ?? null,
          tuck: hud?.dataset.tuck ?? null,
          value: document.getElementById('tuck-val')?.textContent ?? null,
          buttonCue: document.getElementById('fire-btn')?.dataset.cue ?? null,
        }
      })
      expect(await readTuckCue()).toMatchObject({ hidden: true, value: 'Hold' })

      await page.keyboard.down('Space')
      await page.evaluate(() => window.advanceTime(400))
      // Below the band the forced cue must own the chip for the whole hold.
      expect(await readTuckCue()).toMatchObject({ hidden: false, tuck: 'release', value: 'Release!' })

      await page.keyboard.up('Space')
      await page.evaluate(() => window.advanceTime(200))
      // Ending the hold retires the cue: the chip hides again and the button
      // cue resets. (The dataset keeps its last lit value while hidden on
      // purpose — it is only read while the chip is visible.)
      const released = await readTuckCue()
      expect(released.hidden).toBe(true)
      expect(released.buttonCue).not.toBe('release')
    })
    expect(errors).toEqual([])
  })
})
