# First-Flight Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automated behavioral coverage and make the opening flight, background pause, mobile HUD, and mobile retry flow safer without changing progression or visual identity.

**Architecture:** Add two renderer-independent policy modules under `src/game/`, consume them from the existing runtime, and cover them with Vitest. Use Playwright for player-facing smoke contracts and the in-app browser for final visual verification.

**Tech Stack:** JavaScript ES modules, Vite 8, Three.js 0.185, Vitest, Playwright.

## Global Constraints

- Preserve all existing localStorage keys and save values.
- Do not add modes, hazards, upgrades, skins, or art assets.
- Grant exactly 4 seconds of grace to first-time classic runs and every tutorial run.
- Keep gameplay state independent from Three.js objects in new modules.
- Hide secondary mobile HUD chips at 520 CSS pixels or below.
- All behavior changes follow red-green-refactor.

---

### Task 1: Establish the deterministic unit-test baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.js`
- Create: `test/setup.js`
- Create: `test/rng.test.js`
- Create: `test/editor.test.js`
- Create: `test/upgrades.test.js`

**Interfaces:**
- Consumes: existing exports from `src/rng.js`, `src/editor.js`, and `src/upgrades.js`.
- Produces: `npm test` and `npm run test:watch`; reusable localStorage isolation in `test/setup.js`.

- [ ] Install Vitest as a development dependency and add `test` plus `test:watch` scripts.
- [ ] Write tests proving daily seeds are stable for the same UTC date/mode and differ across dates/modes.
- [ ] Write tests proving layout share codes round-trip and malformed codes return `null`.
- [ ] Write tests proving upgrade purchases deduct the exact cost, reject insufficient funds, and stop at the rank cap.
- [ ] Run `npm test` and verify the existing contracts pass.
- [ ] Commit with `test: add deterministic gameplay baseline`.

### Task 2: Add test-first launch-grace policy

**Files:**
- Create: `src/game/firstFlight.js`
- Create: `test/firstFlight.test.js`
- Modify: `src/main.js`
- Modify: `src/style.css`

**Interfaces:**
- Produces: `FIRST_FLIGHT_GRACE_SECONDS`, `shouldGrantLaunchGrace({ runKind, tutorialDone, completedRuns })`, and `isLaunchGraceActive(elapsedSeconds, graceSeconds)`.
- Consumes: existing `runKind`, `tutorialDone`, `getRunCount()`, `elapsed`, and transient challenge-toast UI.

- [ ] Write failing tests for first classic run eligibility, tutorial eligibility, returning-player exclusion, other-mode exclusion, and the exact four-second boundary.
- [ ] Run `npx vitest run test/firstFlight.test.js` and verify failure because the module is absent.
- [ ] Implement the minimal pure policy module.
- [ ] Run the focused test and verify it passes.
- [ ] Import `getRunCount`, calculate `launchGraceSeconds` in `resetGame()`, and display a transient `Get ready` message.
- [ ] Gate lethal building/bird/scissors/boss collisions while `isLaunchGraceActive(elapsed, launchGraceSeconds)` is true; keep movement, pickups, rings, and near-miss visuals active.
- [ ] Run the full unit suite and build.
- [ ] Commit with `feat: protect first-flight launch window`.

### Task 3: Add explicit visibility pause behavior

**Files:**
- Create: `src/game/pause.js`
- Create: `test/pause.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `nextPauseState(current, visibilityState) -> { paused, resumed }`.
- Consumes: animation frame timing, `document.visibilityState`, transient toast UI, and audio pause/resume methods when available.

- [ ] Write failing tests for active-to-hidden pause, repeated-hidden idempotence, hidden-to-visible resume, and repeated-visible idempotence.
- [ ] Run `npx vitest run test/pause.test.js` and verify the expected missing-module failure.
- [ ] Implement the pure transition function and verify focused tests pass.
- [ ] Add a `visibilitychange` listener in `src/main.js`; freeze `update()` while paused and reset the timer on resume.
- [ ] Show a transient `Resumed` message without creating a persistent HUD card.
- [ ] Run all unit tests and build.
- [ ] Commit with `feat: pause flight when page is hidden`.

### Task 4: Modernize Three.js timing and shadows

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: existing animation-frame loop and renderer settings.
- Produces: timer behavior with a maximum simulation delta of 0.05 seconds and a supported shadow-map type.

- [ ] Replace `THREE.Clock` with `THREE.Timer`, calling `timer.update()` and `timer.getDelta()` each frame.
- [ ] Replace `THREE.PCFSoftShadowMap` with `THREE.PCFShadowMap`.
- [ ] Run unit tests and build.
- [ ] Run a browser boot and verify neither deprecation warning appears.
- [ ] Commit with `chore: update Three.js timing APIs`.

### Task 5: Compact the mobile flight and retry UI

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

**Interfaces:**
- Produces: stable `data-hud-priority` markers for primary/secondary HUD chips and `.gameover-actions` ordering hooks.
- Consumes: existing HUD/game-over DOM IDs and button handlers unchanged.

- [ ] Add primary/secondary priority markers to HUD cards.
- [ ] At 520 CSS pixels or below, hide secondary Best, Mode, Zone, Ghost, Guardian, and Control chips only during active flight.
- [ ] Move `Fly Again` into the first game-over action row and place share actions afterward while preserving IDs and listeners.
- [ ] Add compact mobile photo sizing and top-aligned scroll behavior so retry is reached earlier.
- [ ] Run unit tests and build.
- [ ] Commit with `feat: streamline mobile flight and retry UI`.

### Task 6: Add browser smoke tests and quiet local optional APIs

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.js`
- Create: `e2e/smoke.spec.js`
- Modify: `src/analytics.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `npm run test:e2e`, a development-only `?testState=gameover` hook, and optional remote analytics without local console noise.
- Consumes: visible menu/hangar/HUD/game-over DOM contracts.

- [ ] Install Playwright as a development dependency and add `test:e2e`.
- [ ] Add a dev-only deterministic game-over hook after boot, guarded by `import.meta.env.DEV`.
- [ ] Write browser tests for page identity, hangar round trip, flight start, compact 390x844 HUD, and retry-first mobile game-over.
- [ ] Run the smoke suite and verify the new UI assertions fail before completing the relevant integration.
- [ ] Change development analytics delivery to use `fetch(...).catch()` rather than `sendBeacon`, preserving production beacon delivery, so absent local functions do not create browser-console resource errors.
- [ ] Run the e2e suite and verify all flows pass with no relevant console errors.
- [ ] Commit with `test: cover first-flight browser flows`.

### Task 7: Full verification and in-app-browser QA

**Files:**
- No production files expected.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: current verification evidence and player-visible screenshots.

- [ ] Run `npm test` and record test count with zero failures.
- [ ] Run `npm run test:e2e` and record test count with zero failures.
- [ ] Run `npm run build` and record exit status and remaining bundle warning.
- [ ] Start Vite at `http://127.0.0.1:5173`.
- [ ] In the in-app browser, validate desktop 1280x720 menu -> hangar -> first flight -> game-over.
- [ ] In the in-app browser, validate mobile 390x844 joystick flight, compact HUD, retry-first game-over, and vertical scrolling.
- [ ] Inspect warning/error logs and distinguish remaining WebGL warnings from application failures.
- [ ] Capture desktop-flight and mobile-game-over screenshots.
- [ ] Review `git diff`, `git diff --check`, and `git status` for accidental files.
- [ ] Commit any verification-only corrections after their own red-green cycle.
