# Task 5 preview WebGL lifecycle fix

## Status

Fixed and verified.

## Finding addressed

`createPlanePreview()` disposed its Three.js renderer but did not explicitly release the preview canvas's WebGL context. Repeated Plane Collection sessions can therefore retain contexts long enough to starve the gameplay renderer, especially in WKWebView.

## Change

- During preview-session teardown only, call `previewRenderer.forceContextLoss()` immediately after `previewRenderer.dispose()`.
- Leave the main gameplay renderer untouched.
- Add a Playwright regression that opens and tears down six Plane Collection previews, asserts one lost preview context per teardown, then starts a normal flight and verifies active, advancing gameplay while the gameplay canvas remains at zero context losses.

## TDD evidence

### RED

The new regression was applied to an isolated checkout of `HEAD` without the lifecycle change:

```sh
npx playwright test e2e/smoke.spec.js --grep 'releases each preview WebGL context'
```

Desktop and mobile both failed as intended on the first teardown: expected `preview: 1`, received `preview: 0`; `gameplay` remained `0`.

### GREEN

With `previewRenderer.forceContextLoss()` in the preview teardown:

```sh
npx playwright test e2e/smoke.spec.js --grep 'releases each preview WebGL context'
```

The desktop and mobile regression runs passed. Playwright recorded `test-results/.last-run.json` with `status: passed` and no failed tests.

### Follow-up review RED

The gameplay HUD expectation was first added immediately after the six teardown cycles, before any navigation or flight start:

```sh
npx playwright test e2e/smoke.spec.js --project=desktop --grep 'releases each preview WebGL context'
```

The test failed as intended because it remained on Hangar → Upgrades. This demonstrated that the original regression never exercised the gameplay renderer after repeated preview teardown.

### Follow-up review GREEN

The regression now returns to the main menu, starts flight, waits for the HUD, requires distance to advance beyond `0m`, checks runtime state `playing`, and reasserts `{ gameplay: 0, preview: 6 }` context losses.

## Verification

- `npx playwright test e2e/smoke.spec.js --grep 'releases each preview WebGL context'`
  - Desktop and mobile passed; six preview contexts were lost in sequence, then gameplay started, distance advanced, runtime state was `playing`, and the gameplay count remained zero.
- `npx playwright test e2e/smoke.spec.js --grep 'first flight starts with launch protection'`
  - Independent desktop and mobile first-flight smoke passed: 2 tests in 9.2s.
- `npm test`
  - Passed: 29 files, 119 tests.
- `npx playwright test e2e/smoke.spec.js --grep 'previews the shared equipped silhouette'`
  - Existing desktop and mobile Plane Collection/flight behavior passed (`test-results/.last-run.json`: passed, no failed tests).
- `npm run build`
  - Passed. Vite retained its pre-existing informational deferred-chunk size warning.
- `git diff --check`
  - Passed.

## Scope review

- Changed only `src/flight-engine.js`, `e2e/smoke.spec.js`, and this report.
- The forced context loss belongs solely to the local preview renderer; the gameplay renderer does not call `forceContextLoss()`.
- `.claude` was not modified.
