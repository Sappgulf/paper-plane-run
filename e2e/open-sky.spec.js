import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

test('endless flight keeps spawning enemies and formations without boss rings', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic flight fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?proof=open-sky#test-endless-no-boss')
  const trace = await page.evaluate(() => {
    window.__paperFreeze(true)
    let sawBoss = false, sawEnemy = false, sawFormation = false, state
    for (let i = 0; i < 2000; i++) {
      window.advanceTime(50)
      state = JSON.parse(window.render_game_to_text())
      sawBoss ||= Boolean(state.boss || state.entities.counts.boss)
      sawEnemy ||= Boolean(state.entities.counts.bird || state.entities.counts.scissors)
      sawFormation ||= Boolean(state.entities.counts.gauntlet)
      if (state.distance >= 1600 || state.state !== 'playing') break
    }
    return { state, sawBoss, sawEnemy, sawFormation }
  })
  expect(trace.state.state).toBe('playing')
  expect(trace.state.distance).toBeGreaterThanOrEqual(1600)
  expect(trace.sawEnemy).toBe(true)
  expect(trace.sawFormation).toBe(true)
  expect(trace.sawBoss).toBe(false)
  expect(errors).toEqual([])
})

test('the illustrated hawk loads on the actual in-flight enemy', async ({ page }, info) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic enemy lineup')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?proof=hawk-art#test-obstacles')
  await page.waitForFunction(() => window.__paperPose().hazardWarnings.some(item => item.flyerId === 'hawk' && item.illustrated))
  await page.screenshot({ path: `output/open-sky-enemies-${info.project.name}.png` })
  expect(errors).toEqual([])
})

test('an existing bounty upgrade pays its bonus on a formation', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a deterministic formation fixture')
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => localStorage.setItem('paper-plane-run-upgrades', JSON.stringify({ bounty: 2 })))
  await openFixture(page, '/?proof=formation-bounty#test-gauntlet-payoff')
  const trace = await page.evaluate(() => {
    window.__paperFreeze(true)
    for (let i = 0; i < 160; i++) {
      window.advanceTime(50)
      const state = JSON.parse(window.render_game_to_text())
      if (/Gauntlet cleared.*\+7/.test(state.banners.action || '')) return state
    }
    return null
  })
  expect(trace).not.toBeNull()
  expect(trace.stars).toBeGreaterThanOrEqual(7)
  expect(trace.endless.recovering).toBe(true)
  expect(errors).toEqual([])
})
