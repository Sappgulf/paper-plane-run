# Task 1 report: Bundle budget contract

## Status

DONE_WITH_CONCERNS

## Changed files

- `scripts/bundle-budget.mjs` — added manifest accounting, independent initial/total budget checks, CLI verification, and offending-file output.
- `test/bundleBudget.test.js` — added TDD coverage for entry/deferred separation and independent budget failures.
- `package.json` — added `verify:bundle-budget`.
- `vite.config.js` — enabled Vite manifest output.

## Commands and exact results

- `npm test -- --run test/bundleBudget.test.js` (RED): failed as required because `../scripts/bundle-budget.mjs` did not exist; exit code `1`.
- `npm test -- --run test/bundleBudget.test.js` (GREEN): `1` test file passed, `3` tests passed; exit code `0`.
- `git diff --check`: passed; exit code `0`.
- `npm test`: `26` test files passed, `92` tests passed; exit code `0`.
- `npm run build`: passed; exit code `0`. Vite emitted `dist/.vite/manifest.json`, `dist/assets/index-0uPu9bFO.js` at `719.35 kB` (`719,354` bytes), and its existing warning that a chunk exceeds `500 kB`.
- `npm run verify:bundle-budget`: passed with `initial 719,354 bytes / 819,200 bytes`, `total 719,354 bytes / 819,200 bytes`; exit code `0`.

## Commit

Implementation commit: `4adbfc07b7ea9074098d3449a2e612adc31a2daf` (`build: enforce bundle budgets`)

## Concerns

- The existing single JavaScript bundle still triggers Vite’s informational `>500 kB` warning. Task 2 is expected to defer the flight engine; the current 819,200-byte initial/total budgets leave explicit headroom until then.
- E2E and iOS-specific verification were not run because this Task 1 change is limited to manifest accounting and the requested unit/build verification.
