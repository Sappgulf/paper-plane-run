# Task 2 report: Deferred flight-engine lifecycle

## Status

DONE_WITH_CONCERNS

The planned split was viable. The menu shell now loads independently, Three.js and the flight runtime are behind one deferred lifecycle, failed loads restore an actionable menu, and the final web/iOS verification matrix is green.

## Changed files

- `src/engine-contract.js` — added the shared import/boot promise, lifecycle status, retry reset, and `start` delegation.
- `src/flight-engine.js` — moved Three.js imports, renderer/scene setup, simulation, frame loop, mode startup, return-to-menu behavior, and deterministic runtime hooks behind `bootFlightEngine()`.
- `src/main.js` — retained menu, Journey, Hangar, settings, progression views, editor, PWA/install, service-worker, audio-shell, loading/error UI, idle preload, retry handoff, and the explicit shell bridge.
- `test/engineContract.test.js` — covers preload/start import deduplication, one engine boot, status transitions, and retry after import failure.
- `e2e/smoke.spec.js` — covers delayed loading, visible preparation, aborted loading, actionable retry, recovered HUD, and deferred-start timeouts; also makes the deterministic Journey navigation a real document load.
- `index.html` — added live engine preparation/error status and retry controls.
- `src/style.css` — styled the engine status and retry controls.
- `progress.md` — recorded takeover state, observed failures, visual proof, final verification, and the preserved Task 1 commits.

`npm run build:ios` regenerated and synchronized the ignored/generated iOS web bundle. `verify:ios-parity` confirms that all 70 files, including the deferred engine chunk, match exactly; no generated iOS files were added to the implementation commit.

## Requirement assessment

- `createEngineLoader(importEngine)` exposes `preload`, `start`, and `getStatus`; preload and start share one promise and one boot.
- Import or boot rejection resets status to `idle`, clears the cached promise, and permits retry.
- `bootFlightEngine()` exposes `startMode`, `returnToMenu`, `renderGameToText`, and `advanceTime`.
- Only `src/flight-engine.js` imports Three.js.
- The shell installs its own menu/settings/PWA/service-worker/audio listeners before the engine is available.
- Idle preload uses `requestIdleCallback` with a timeout when available and a 250 ms fallback otherwise.
- Engine initialization is singleton-protected, shell listeners are not re-registered by the engine, and the delayed browser test observes one routed engine request.
- A load failure calls the shell's canonical `showMenu()` path, displays an actionable retry, and preserves a pending start across the recovery reload.

## RED evidence

The prescribed missing-module RED was not recoverable from branch history. This was a takeover of an uncommitted working state in which `src/engine-contract.js`, `src/flight-engine.js`, and `test/engineContract.test.js` already existed and the 11 focused tests already passed. No RED result was fabricated.

Two concrete browser RED states were observed and retained in this report:

- Initial takeover run, `npm run test:e2e`: `18 passed`, `7 skipped`, `1 failed`; mobile Journey expected at least one triggered encounter but received `0`. Cause: hash-only navigation could retain the live flight document instead of booting the deterministic test state. A query-changing navigation fixed the test contract.
- First full run after adding request-count proof, `npm run test:e2e`: `18 passed`, `7 skipped`, `1 failed`; retry reached the HUD, but the test expected `engineRequests` to equal `2` and received `1`. Cause: a registered service worker can satisfy the recovery reload from cache and bypass `page.route`. The test now treats visible recovered HUD as authoritative while retaining the abort/error/retry assertions.

## GREEN evidence and exact commands

- `npm test -- --run test/engineContract.test.js test/firstFlight.test.js test/pause.test.js`
  - Exit `0`; `3` test files passed; `11` tests passed.
- `npx playwright test e2e/smoke.spec.js --grep "delayed engine|aborted engine|Living Journey chooses"`
  - Exit `0`; `4` passed; `2` project-specific skips.
  - The console warnings are intentional evidence from the route-aborted engine request.
- `node /Users/austinbeatty/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:4173 --click-selector '#start-btn' --actions-file /Users/austinbeatty/.codex/skills/develop-web-game/references/action_payloads.json --iterations 3 --pause-ms 250 --screenshot-dir output/task-2-web-game-proof`
  - Exit `0`; inspected three Classic-flight frames at `14m`, `28m`, and `40m`; text state matched leftward movement and no console-error artifact was produced. Temporary generated proof files were removed after inspection.
- `npm run test:e2e`
  - Exit `0`; `19` passed; `7` viewport-inapplicable tests skipped; `0` failed.
- `npm test`
  - Exit `0`; `27` test files passed; `94` tests passed.
- `npm run build:ios`
  - Exit `0`; emitted `70.37 kB` initial entry JS and `654.19 kB` deferred flight-engine JS; postprocessing and iOS web synchronization completed.
- `npm run verify:ios-parity`
  - Exit `0`; `70 files match exactly`.
- `npm run build`
  - Exit `0`; emitted `70.27 kB` initial entry JS and `654.19 kB` deferred flight-engine JS.
- `npm run verify:bundle-budget`
  - Exit `0`; initial `70,273 / 819,200` bytes; total `724,470 / 819,200` bytes; `PASS`.
- `git diff --cached --check`
  - Exit `0`; no whitespace errors.

## Commit

Implementation: `6ca99e125f8aebfbf35b46a7bfa712bf4790d642` (`perf: defer and preload the flight engine`)

Task 1 remains intact at `4adbfc07b7ea9074098d3449a2e612adc31a2daf`, with its report commit at `a592fac`.

## Concerns

- The exact missing-module RED requested by the original TDD sequence predates this takeover and was not committed or otherwise available; only the inherited green state and the observed browser RED/GREEN transitions can be reported honestly.
- Vite still prints its informational warning because the intentionally deferred flight-engine chunk is larger than 500 kB. The initial entry is about 70 kB, and both measured initial and total JavaScript remain within Task 1's enforced budgets.
- Browser recovery uses one reload after a failed native module fetch so it can escape browser module-map failure caching. The selected mode/options survive through `sessionStorage`, and the browser test proves recovery to a visible HUD; a service worker may satisfy that reload without a second routed network request.
