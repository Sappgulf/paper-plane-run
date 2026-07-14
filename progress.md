# Paper Plane Run — Living Journey Expansion

Original prompt: “1-3! Use skills needed, imagegen, computer! Build, test and polish! When finished push and commit! Then deploy to vercel!” Direction approved: “Balanced hybrid!” Final authorization: “I approve get it done!”

## 2026-07-13

- Approved design and implementation plan are committed on `main` at `3833219` and `8372527`.
- Created isolated worktree branch `codex/living-journey-expansion`.
- Baseline: `npm install` found 0 vulnerabilities; 22 test files and 64 tests pass.
- In progress: deterministic authored-plus-seeded encounters and Journey v2 migration.
- Remaining: mastery, runtime encounter adapters, objective/result UI, generated destination artwork, postcard album, browser automation, iOS parity, simulator/device proof, merge/push/deploy/fresh install.

### Implementation and browser proof

- `222e08f` deterministic authored-plus-seeded encounter director.
- `8500f11` Journey v2 migration and idempotent Milo/Pip mastery.
- `4cde544` runtime encounters, objective telemetry/HUD, pilot side-grades, and immutable outcomes.
- `7e75bb3` mastery-aware pilot and result UI.
- `53d0a34` four inspected ImageGen paper-diorama destination artworks and stable registry.
- `86f928b` postcard migration, reveal, detail, album, and share fallback.
- Browser proof: `output/web-game-proof/{city,harbor,storm,aurora}/shot-0.png` with matching `state-0.json`; all scenarios reported `mode: journey`, active objectives, triggered encounters, and no console-error artifacts.
- Computer Use proof: desktop Journey map/mastery cards, Aurora reveal, and scrollable postcard detail inspected in Chrome. Fixed raw internal cosmetic/route IDs after the first visual pass.
- Defect caught by text-state testing: dev-only invulnerability was briefly inserted in normal start; moved into hash-only test setup before release verification.
- Current proof baseline before iOS: 25 Vitest files / 89 tests passed; production Vite build passed; iOS parity previously matched 68 files after artwork integration.
- Final Playwright matrix: 17 passed across desktop and mobile, with 5 viewport-inapplicable cases intentionally skipped.
- iOS bundle regenerated and verified: 68 bundled files match the generated iOS distribution exactly.
- iPhone 17 Pro simulator: Xcode Debug build succeeded; fresh simulator install launched the full menu; Computer Use opened Living Journey, selected Paper City, and visually confirmed active gameplay with objective HUD, distance, power-up, obstacles, and touch controls.
- Generic physical-iOS Release build succeeded with automatic signing, the Apple Development identity, and the team provisioning profile.
- Physical device discovery currently sees Austin's iPhone 16 Pro but reports it unavailable; signed build and install will be retried at the final device lane.
- Remaining: merge/push, Vercel production deploy, physical iPhone fresh install.

### Balanced game polish — Task 2 takeover

- Preserved the inherited uncommitted lifecycle extraction on `codex/balanced-game-polish`; Task 1 remains at `4adbfc0` with its report at `a592fac`.
- Focused loader/first-flight/pause baseline: 3 files and 11 tests pass.
- Current split builds as a 66,899-byte initial entry and a 656,794-byte deferred flight-engine chunk; bundle budget passes at 723,693 total bytes.
- Full Playwright takeover baseline: 18 passed, 7 skipped, 1 mobile Journey deterministic-state failure. The test navigates to a hash-only URL after starting a run, so the browser can retain the live document instead of booting the intended test state; desktop happened to reach an encounter before crashing.
- Completed shell/engine listener ownership, failed-preload retry semantics, deterministic browser navigation, and the required verification matrix.
- Targeted lifecycle/Journey Playwright after the fix: 4 passed, 2 project-specific skips. Delayed preload used one engine request; aborted preload recovered on request two.
- Temporary web-game client proof: three inspected Classic-flight frames reached 14m, 28m, and 40m with leftward movement, matching text state, and no console errors; generated artifacts were removed after inspection.
- Final verification: 27 Vitest files / 94 tests; full Playwright 19 passed / 7 viewport skips; iOS parity 70 files; bundle budget 70,273 initial / 724,470 total bytes. No known code TODOs remain for Task 2.

### Balanced game polish — Task 2 review fixes

- Added a tested runtime seam for latest-layout selection and live settings/AR synchronization.
- Engine import failures remain retryable, while boot failures are tagged as reload-required and reuse one rejected promise so partial initialization cannot run twice in-page.
- Restored `journey_restarted` analytics in the shell and added browser regressions for current custom layouts, post-preload low-power/colorblind updates, AR permission rollback, and restart analytics.
- Focused Vitest is green at 2 files / 8 tests; production build succeeds. Playwright and final verification are pending.
- First affected Playwright run: 4 passed and the AR case failed only because `check()` requires the checkbox to remain checked; the app correctly rolled it back before Playwright's post-click assertion. The test now uses a plain click before asserting false state.
- Corrected affected Playwright lane: 5 passed. Full verification is green at 28 Vitest files / 100 tests and 22 Playwright passes / 10 viewport skips.
- Web-game client proof inspected three Classic-flight frames at 14m, 27m, and 41m; state tracked the plane moving right, runtime settings matched the visuals, and no console-error artifact was produced.
- A final focused browser rerun hit the default 45s timeout after WebGL startup/clicks consumed ~44s; the trace snapshot showed both settings correctly checked. Marked the heavier AR/WebGL smoke `test.slow()` and queued the exact lane again.
- The next serialized run cleared settings/AR but the two-play custom-layout smoke likewise exhausted 45s under current host load; marked that WebGL-heavy regression `test.slow()` as well.
- A subsequent rerun showed even the inherited delayed/retry HUD assertions exceeding their explicit 15s under sustained host load; extended those two WebGL startup assertions to 45s and marked them slow without changing behavior assertions.
- Final exact affected desktop lane passed all 5 tests in 52.8s after the timeout hardening.

### Balanced game polish — final proof and ship gate

- Final Vitest: 34 files and 175 tests passed.
- Final Playwright: 40 passed, 14 intentionally skipped by viewport, 0 failed in 6.5 minutes. Covered menu/Hangar navigation, exact upgrades, purchases and claims, desktop/mobile Plane Collection, deferred-engine retry, settings/AR rollback, custom routes, live upgrades, both readable boss phases, reduced motion, Journey, postcards, pause/resume, retry, mobile HUD, scrolling, and control persistence.
- Production build passed. Bundle budget passed at 80,356 bytes initial and 751,975 bytes total against the 819,200-byte limits.
- iOS bundle regenerated; all 102 bundled files matched the iOS distribution byte-for-byte.
- Representative proof in `output/web-game-proof/balanced-polish/` was inspected at original resolution: desktop/mobile Plane Collection, max shield/boost feedback, iOS menu, Journey map, and Journey routes.
- XcodeBuildMCP built, installed, and launched the exact final app on iPhone 17 Pro simulator with no build warnings or errors. The in-app simulator browser was used to tap from the menu into Living Journey and scroll its route surface.
- The signed final iOS 27 build succeeded with automatic signing, installed on Austin's paired iPhone 16 Pro, and launched as `com.sappgulf.paperplanerun`.
- Self-review found no TODO/debug leakage. Full branch `git diff --check` passes after removing two terminal whitespace defects.
- Remaining ship actions: commit proof, fast-forward `main`, push, production deploy, and production smoke.

### Balanced game polish — Task 5 silhouettes and preview

- Geometry RED failed on the required missing `src/plane-models.js` module; the extracted registry is now green at 4 tests across Classic Fold, Dart, Glider, and Stunt Fold.
- All four families expose positive normalized dimensions and the same `0.7` collision radius, with no runtime stat fields. The model builder retains `wingL`, `wingR`, `shieldBubble`, and `upgradeTrail` names.
- The live-preview browser RED failed on the absent preview surface. The deferred engine now owns the Three.js preview renderer, while the shell passes only a canvas and skin ID; portrait cards use the generated WebP assets.
- Focused plane/skin verification passes 2 files and 19 tests. Desktop/mobile visual inspection and the full verification matrix remain pending.
- Desktop/mobile Plane Collection capture rerun passed 2 tests in 35.3s. Both screenshots were inspected at original resolution: the equipped Coral Dart live model, generated portrait cards, refreshed wallet/status, and responsive mobile layout are all visible without preview clipping.
- The web-game client produced three inspected Classic-flight frames at 14m, 27m, and 38m; text state reports `classic`, collision radius `0.7`, and matching rightward movement with no console-error artifact.
- Final affected collection lane passed 4 desktop/mobile tests in 33.9s after marking the new WebGL-backed Hangar flows slow and excluding only optional `fonts.gstatic.com` resource errors from runtime-console assertions.
- Full Vitest is green at 29 files / 119 tests. The final full Playwright rerun was interrupted before its summary; fresh exact-diff iOS/build/budget verification remains a documented Task 5 concern.

## 2026-07-14 — Two new upgrades and Combo Fever polish

- Added `Fever Focus` (id `fever`, max 3, 18/34/58★) and `Steady Hands` (id `streak`, max 3, 14/26/44★) to the upgrade tree, wired end-to-end: `src/upgrades.js` formulas, `src/game/economy.js` cost table, `src/game/upgrade-runtime.js` shared `getFeverTuning`/`getStreakTuning` helpers (also expose the previously inline `FEVER_COMBO_THRESHOLD`/`FEVER_DURATION`/star-streak-window constants), and `src/flight-engine.js` runtime consumption in `registerNearMiss`/`triggerFever`/`registerStarStreak`.
- Fever Focus lowers the near-miss combo count needed to trigger Combo Fever (floored at 4) and extends Fever's score-multiplier duration. Steady Hands extends the star-streak pickup window before the chain resets.
- Gameplay polish: the combo HUD now shows a `🔥N` countdown once the player is within 3 near-misses of triggering Fever, so the payoff is legible in the moment instead of a surprise.
- Test coverage extended in place: `test/upgrades.test.js` (contract labels/values/effects), `test/upgradeRuntime.test.js` (runtime snapshot assertions + a dedicated Fever Focus floor test), and `e2e/smoke.spec.js` (both Hangar contract-card and prestige-cap-requires-everything-maxed lanes now include the two new upgrades).
- Verification: `npm test` 34 files / 180 tests passed; `npm run build` and `npm run build:ios` succeeded; `npm run verify:ios-parity` matched all 102 files; Playwright Hangar lanes re-verified against the exact new upgrade contracts.
