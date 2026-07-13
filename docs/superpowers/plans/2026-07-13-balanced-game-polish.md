# Balanced Game Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a faster-loading, better-balanced Paper Plane Run with purchasable cosmetic planes, proven upgrades, regenerated plane/boss art, and polished existing gameplay across web and iOS.

**Architecture:** A lightweight application shell dynamically imports an explicit flight-engine lifecycle. Versioned progression and visual registries preserve existing IDs while code retains deterministic geometry, collision, save data, and offline iOS parity.

**Tech Stack:** Vite 8, vanilla ES modules, Three.js, Vitest, Playwright, OpenAI ImageGen, WKWebView/Xcode, Vercel.

## Global Constraints

- Add no game mode, boss type, currency, combat system, or stat-bearing plane.
- Preserve every existing save key and cosmetic ID.
- Generated images remain cosmetic and never define collision.
- Deferred chunks and generated assets ship in the offline iOS bundle.
- Keep the pre-existing untracked `.claude/` directory untouched.

---

### Task 1: Bundle budget contract

**Files:** Create `scripts/bundle-budget.mjs`, `test/bundleBudget.test.js`; modify `package.json`, `vite.config.js`.

**Interfaces:** `summarizeManifest(manifest, sizes)`, `checkBudget(summary, budget)`, and `npm run verify:bundle-budget`.

- [ ] Write failing tests proving entry bytes are separate from deferred bytes and both limits report independently.
- [ ] Run `npm test -- --run test/bundleBudget.test.js`; expect missing-module failure.
- [ ] Implement manifest accounting with this contract:

```js
export function summarizeManifest(manifest, sizes) {
  const js = Object.values(manifest).filter((entry) => entry.file?.endsWith('.js'))
  return {
    initialBytes: js.filter((entry) => entry.isEntry).reduce((n, entry) => n + (sizes[entry.file] || 0), 0),
    totalBytes: js.reduce((n, entry) => n + (sizes[entry.file] || 0), 0),
  }
}
```

- [ ] Enable Vite’s manifest, add measured initial/total limits after Task 2, and print offending files.
- [ ] Run `npm run build && npm run verify:bundle-budget`; expect PASS.
- [ ] Commit with `git commit -m "build: enforce bundle budgets"`.

### Task 2: Deferred flight-engine lifecycle

**Files:** Create `src/engine-contract.js`, `src/flight-engine.js`, `test/engineContract.test.js`; modify `src/main.js`, `index.html`, `src/style.css`, `e2e/smoke.spec.js`.

**Interfaces:** `createEngineLoader(importEngine) -> { preload, start, getStatus }`; `bootFlightEngine() -> { startMode, returnToMenu, renderGameToText, advanceTime }`.

- [ ] Write failing tests proving preload/start share one import and a failed import returns to `idle` for retry.
- [ ] Run `npm test -- --run test/engineContract.test.js`; expect missing-module failure.
- [ ] Implement the loader state machine:

```js
export function createEngineLoader(importEngine = () => import('./flight-engine.js')) {
  let status = 'idle'
  let promise = null
  const preload = () => {
    if (promise) return promise
    status = 'loading'
    promise = importEngine().then((m) => m.bootFlightEngine())
      .then((engine) => { status = 'ready'; return engine })
      .catch((error) => { status = 'idle'; promise = null; throw error })
    return promise
  }
  return { preload, getStatus: () => status, async start(kind, options = {}) { return (await preload()).startMode(kind, options) } }
}
```

- [ ] Move Three.js imports, scene setup, simulation, frame loop, `startGame`, and deterministic runtime hooks into `src/flight-engine.js`; keep menu, Hangar, settings, and progression orchestration in `src/main.js`.
- [ ] Add browser tests delaying/aborting the engine chunk and asserting `Preparing your plane...`, actionable retry, then HUD success.
- [ ] Idle-preload with `requestIdleCallback` or a 250 ms fallback; deduplicate listeners/imports.
- [ ] Run focused Vitest, full Playwright, `build:ios`, parity, and bundle-budget verification.
- [ ] Commit with `git commit -m "perf: defer and preload the flight engine"`.

### Task 3: Versioned Plane Collection purchases

**Files:** Modify `src/skins.js`, `src/upgrades.js`, `test/skins.test.js`, `test/upgrades.test.js`.

**Interfaces:** `purchasePlane(id)`, `claimPlane(id, seasonId)`, and view state `locked|available|owned|equipped` with separate `requirement` and `price`.

- [ ] Add failing tests for legacy/equipped retention, lifetime gating, wallet deduction, insufficient funds, idempotence, seasonal/prestige claims, and corrupt JSON.
- [ ] Run `npm test -- --run test/skins.test.js test/upgrades.test.js`; expect missing purchase APIs.
- [ ] Add only a schema-version key; retain existing ownership/equipped keys. Every legacy unlocked/equipped ID remains permanently owned.
- [ ] Spend wallet stars only; never deduct lifetime stars.
- [ ] Run focused tests and commit with `git commit -m "feat: make plane ownership wallet-purchased"`.

### Task 4: Generate existing Plane Collection art

**Files:** Create `public/assets/planes/*.png`, `public/assets/planes/*.webp`; modify `src/skins.js`, `test/skins.test.js`.

**Interfaces:** Every plane gets `portrait`, `texture`, and `silhouette` (`classic|dart|glider|stunt`).

- [ ] Add failing tests for valid family IDs and actual asset paths.
- [ ] Generate one ImageGen reference: `stylized-concept`, transparent, premium handcrafted paper, fibers/folds, consistent three-quarter top view, restrained lighting, no text/logo/watermark.
- [ ] Inspect original and mobile-thumbnail output; reject clipped wings, unclear silhouettes, inconsistent perspective, baked backgrounds, text, or excess detail.
- [ ] Batch only the existing catalog and regenerate rejected assets with one targeted prompt change.
- [ ] Register stable paths, run tests, build iOS, verify parity, and commit with `git commit -m "art: rebuild the purchasable plane collection"`.

### Task 5: Four fair silhouettes and live preview

**Files:** Create `src/plane-models.js`, `test/planeModels.test.js`; modify `src/flight-engine.js`, `src/main.js`, `src/style.css`, `e2e/smoke.spec.js`.

**Interfaces:** `getPlaneGeometrySpec(silhouette)` and `createPaperPlane({ THREE, silhouette, materials, withShield })`.

- [ ] Write failing tests for four families, positive normalized dimensions, one shared collision radius, and stable child names `wingL`, `wingR`, `shieldBubble`, `upgradeTrail`.
- [ ] Extract current geometry and implement Classic Fold, Dart, Glider, and Stunt Fold without runtime stat fields.
- [ ] Implement locked/available/owned/equipped cards with separate lifetime requirement and wallet price.
- [ ] Make preview and flight consume the same registry; purchase/equip refreshes immediately.
- [ ] Run focused tests and desktop/mobile collection flows; inspect screenshots.
- [ ] Commit with `git commit -m "feat: add fair plane silhouettes and previews"`.

### Task 6: Exact upgrade contracts

**Files:** Modify `src/upgrades.js`, `test/upgrades.test.js`, `src/main.js`.

**Interfaces:** `describeUpgradeEffect(id, level)` shares private formula helpers with `getUpgradeEffects()`.

- [ ] Add table-driven failing tests for all eleven upgrades from zero through max: monotonic values, caps, exact current-to-next labels, persistence, insufficient funds, and prestige.
- [ ] Run focused tests and verify failure.
- [ ] Implement shared formulas; do not duplicate percentages in UI code.
- [ ] Update cards to exact current and next values.
- [ ] Run tests and commit with `git commit -m "feat: expose exact upgrade contracts"`.

### Task 7: Runtime proof and feedback for upgrades

**Files:** Create `src/game/upgrade-runtime.js`, `test/upgradeRuntime.test.js`; modify `src/flight-engine.js`, `index.html`, `src/style.css`.

**Interfaces:** Pure helpers for control response, altitude recovery, spawn rates, near-miss/collision radii, boost safety, guardian charges, shield duration, and weapon cooldown.

- [ ] Write baseline-versus-max deterministic tests, changing one upgrade at a time; cover all control modes and seeded luck samples.
- [ ] Wire helpers into the actual flight loop.
- [ ] Add magnet pull trail, shield timer, guardian count, boost cue, Ink Blast ready state, and fair Wide Wings collision.
- [ ] Run Vitest, E2E, web-game client comparisons, text-state checks, and screenshot inspection.
- [ ] Commit with `git commit -m "fix: make every upgrade observable in flight"`.

### Task 8: Economy balance

**Files:** Create `src/game/economy.js`, `test/economy.test.js`; modify `src/upgrades.js`, `src/skins.js`.

**Interfaces:** `estimateProgression({ starsPerRun, runs })` and one future-price table.

- [ ] Write tests asserting early purchases occur within a small number of normal runs, mid-tier choices require saving, and lifetime stars are never spent.
- [ ] Measure actual earning rates with deterministic runs.
- [ ] Tune only future prices; retain purchased levels and owned planes.
- [ ] Run economy, upgrade, and plane tests; commit with `git commit -m "balance: align purchases with flight earnings"`.

### Task 9: Generate existing boss art

**Files:** Create `public/assets/bosses/*.png`, `public/assets/bosses/*.webp`, `src/game/boss-art.js`, `test/bossArt.test.js`.

**Interfaces:** `BOSS_ART.scissors` and `BOSS_ART.wind` expose stable texture paths and accessibility-safe palette/shape metadata.

- [ ] Write failing registry/file-existence tests for both existing bosses.
- [ ] Generate straight-on transparent handcrafted-paper blade/hinge and turbine/vane assets with no words, background, or baked motion blur.
- [ ] Inspect at original and mobile gameplay scale; regenerate unclear/clipped/inconsistent assets.
- [ ] Register assets, run tests, build iOS, verify parity, and commit with `git commit -m "art: rebuild the scissors and wind bosses"`.

### Task 10: Boss phases and accessibility

**Files:** Create `src/game/boss-director.js`, `test/bossDirector.test.js`; modify `src/flight-engine.js`, `src/style.css`.

**Interfaces:** `createBossEncounter({ kind, difficulty, reducedMotion, colorblind }) -> { phase, safeLane, warningSeconds, pressure, completed }`.

- [ ] Write deterministic tests for warning, pressure, final pass, safe passage, collision, completion, recovery, difficulty timing, reduced motion, and shape cues.
- [ ] Drive existing Scissors/Wind geometry from explicit phases; difficulty changes timing/lane movement, never hitbox size.
- [ ] Add only current boss identity, phase, safe lane, and timer to `render_game_to_text`.
- [ ] Run web-game scenarios and inspect state/screenshots.
- [ ] Commit with `git commit -m "fix: make boss encounters readable and fair"`.

### Task 11: Existing pacing and control polish

**Files:** Create `src/game/pacing.js`, `test/pacing.test.js`; modify `src/flight-engine.js`, `src/settings.js`, `test/settings.test.js`.

**Interfaces:** Pure wave/recovery scheduling and shared pointer/touch/stick/keyboard response helpers.

- [ ] Write tests for no unavoidable overlap, post-boss recovery, valid star paths, coherent difficulty scaling, and control parity.
- [ ] Schedule existing hazards/collectibles/mini-gauntlets into waves; add no mechanic.
- [ ] Tune camera, speed escalation, near misses, collision feedback, audio, and haptics.
- [ ] Run every existing mode/control/browser viewport and inspect screenshots/text state/errors.
- [ ] Commit with `git commit -m "polish: improve flight pacing and controls"`.

### Task 12: Full proof, push, and deploy

**Files:** Modify `progress.md`; create `output/web-game-proof/balanced-polish/*`.

- [ ] Run `npm test -- --run`, production build, bundle budget, full E2E, iOS build, and parity.
- [ ] Use the required web-game client for cold/preloaded startup, four silhouettes, purchase/equip, baseline/max upgrades, both bosses, reduced motion, and colorblind states; inspect all representative screenshots and text state.
- [ ] Use the in-app Browser for every mode, Hangar tab, purchase state, settings persistence, pause/resume, retry/menu, desktop, and mobile; review errors and failed requests.
- [ ] Use XcodeBuildMCP for simulator build/run/UI snapshots and menu, purchase/equip, gameplay smoke; install/launch on the paired physical phone when available.
- [ ] Record exact proof in `progress.md` and commit with `git commit -m "test: prove balanced polish across web and ios"`.
- [ ] Run code review and verification-before-completion; fix validated issues with focused tests.
- [ ] Confirm only pre-existing `.claude/` is untracked, push `main`, deploy through authenticated Vercel, verify deployed commit equals `HEAD`, and production-smoke menu, cold flight, Plane Collection, and asset/chunk loading.
