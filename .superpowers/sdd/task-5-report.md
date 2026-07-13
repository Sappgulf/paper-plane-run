# Task 5 — Four fair silhouettes and live preview

## Status

DONE_WITH_CONCERNS

Task 5 is implemented. The Plane Collection now presents generated portraits and a live Three.js preview, and flight constructs the equipped plane from the same four-family registry. The final full Playwright rerun was interrupted before its summary, so this report does not claim a complete final E2E matrix.

## Behavior delivered

- Added `src/plane-models.js` with `getPlaneGeometrySpec(silhouette)` and `createPaperPlane({ THREE, silhouette, materials, withShield })`.
- Added Classic Fold, Dart, Glider, and Stunt Fold procedural geometry without speed, handling, lift, score, or other runtime-stat fields.
- Preserved the original Classic geometry coordinates and `1.2` model scale while retaining the animation hooks `wingL`, `wingR`, `shieldBubble`, and `upgradeTrail`.
- Exported one shared `PLANE_COLLISION_RADIUS` of `0.7`; all four specs and the flight collision path consume that value.
- Kept the upgrade trail in world space in flight so the existing trail animation/material behavior remains independent of plane banking and position.
- Rebuilds the player and ghost geometry from the equipped skin's registered silhouette while preserving skin materials, shield behavior, wing damage animation, unfolding, banking, and crash animation.
- Replaced legacy texture thumbnails in the Hangar with the generated WebP portraits from Task 4.
- Added explicit locked, available, owned, and equipped card presentation with separate lifetime/season/prestige requirement and wallet/free-claim price rows.
- Added a responsive live model preview that refreshes on focus, purchase, claim, and equip.
- Kept Three.js behind the deferred-engine boundary. `main.js` passes only a canvas and skin ID to the engine-owned preview API.
- Added plane skin ID, silhouette, and collision radius to `render_game_to_text`.
- Added a narrowed `PLANE_THREE` injection facade. Passing the full Three.js namespace initially defeated tree-shaking and exceeded Task 1's total bundle budget; the narrowed facade restored the budget.

## TDD evidence

### Geometry RED

```sh
npm test -- --run test/planeModels.test.js
```

Failed as intended because `../src/plane-models.js` did not exist.

### Geometry GREEN

```sh
npm test -- --run test/planeModels.test.js test/skins.test.js
```

Final focused result: 2 files passed, 19 tests passed.

### Browser RED

```sh
npx playwright test e2e/smoke.spec.js --project=desktop --grep "Plane Collection previews"
```

Failed as intended because `[data-plane-preview]` did not exist.

### Browser GREEN

```sh
npx playwright test e2e/smoke.spec.js --grep "Hangar purchases|Plane Collection previews"
```

Final affected result after WebGL timeout hardening: 4 passed in 33.9s across desktop and mobile.

## Verification evidence

- `npm test -- --run test/planeModels.test.js test/skins.test.js`
  - Exit 0; 2 files passed; 19 tests passed.
- `npm test`
  - Exit 0; 29 files passed; 119 tests passed.
- `CAPTURE_TASK5_PROOF=1 npx playwright test e2e/smoke.spec.js --grep "Plane Collection previews"`
  - Exit 0; desktop and mobile passed, 2 tests in 35.3s.
  - Both screenshots were inspected at original resolution. The Coral Dart live model, purchase/equip status, wallet refresh, generated portrait cards, and responsive mobile layout were visible. Temporary screenshots were removed before commit.
- Web-game Playwright client, 3 iterations
  - Captured and inspected Classic-flight frames at 14m, 27m, and 38m.
  - Text state reported `skinId: classic`, `silhouette: classic`, collision radius `0.7`, and matching player movement. No console-error artifact was produced.
- `npm run build && npm run verify:bundle-budget`
  - Last completed build before the final preview-session refactor exited 0.
  - Measured initial JavaScript: 76,264 bytes; total JavaScript: 737,137 / 819,200 bytes; budget PASS.
  - Vite retained its existing informational warning for the intentionally deferred flight-engine chunk exceeding 500 kB.
- `git diff --check`
  - Passed before final report creation.

## Full-matrix concern

The first full Playwright matrix completed with 23 passed, 10 viewport skips, and 3 failures. Two failures were total-test timeouts under concurrent WebGL load; the page snapshots showed the expected preview and persisted purchase state. The third was an optional `fonts.gstatic.com` connection closure despite the configured system-font fallback.

The two WebGL-backed Hangar tests were marked slow, and the console collector now excludes only optional Google Fonts resource errors while continuing to collect app/runtime errors. The exact four affected desktop/mobile tests then passed in 33.9s.

A subsequent full Playwright rerun progressed through the Task 5 desktop/mobile tests successfully and continued through the wider suite, but it was interrupted before Playwright printed a final summary. Per the user's stop instruction, it was not restarted. A fresh final `build:ios`, `verify:ios-parity`, production build, bundle-budget check, and complete Playwright summary therefore remain unverified on the exact final diff.

## Files changed

- `src/plane-models.js`
- `test/planeModels.test.js`
- `src/flight-engine.js`
- `src/main.js`
- `src/style.css`
- `e2e/smoke.spec.js`
- `progress.md`
- `.superpowers/sdd/task-5-report.md`

## Commit

```text
feat: add fair plane silhouettes and previews
```

## Concerns

- The final full Playwright rerun was interrupted before its summary.
- iOS build/parity and a fresh production build/bundle-budget run were not completed on the exact final diff.
- Vite's existing deferred-chunk size warning remains informational; the last completed measured budget passed.
