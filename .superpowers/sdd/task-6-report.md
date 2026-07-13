# Task 6 — Exact upgrade contracts

## Status

DONE

Every existing upgrade now has one shared formula source for runtime effects and an exact player-facing current/next contract. The Hangar renders that contract directly, including an explicit max state.

## Behavior delivered

- Exported `describeUpgradeEffect(id, level)` with normalized current level, exact current values/label, exact next values/label, and `null` next effect at the cap.
- Centralized all eleven upgrade formulas in private helpers used by both `describeUpgradeEffect()` and `getUpgradeEffects()`.
- Preserved all upgrade IDs and storage keys while normalizing malformed saved data to integer levels within each known upgrade's true cap.
- Kept purchases wallet-only; existing insufficient-funds, persistence, prestige, and lifetime-star protections remain covered.
- Added current and next contract text to every Hangar upgrade card. Maxed cards display `Next: MAX — all ranks purchased`.
- Removed prestige percentage arithmetic from `main.js`; its displayed and confirmation values now come from the upgrades module.

## TDD evidence

### RED

```sh
npm test -- --run test/upgrades.test.js
```

Failed as intended before implementation: `describeUpgradeEffect is not a function`, and malformed persisted fractional levels were not normalized.

### GREEN

```sh
npm test -- --run test/upgrades.test.js
```

Final focused result: 1 file passed, 12 tests passed.

The table-driven contract test covers all eleven IDs from level zero through max, exact current/next labels and values, monotonic direction, caps, malformed saved levels, and runtime/descriptor alignment. Existing focused tests retain persistence, insufficient-funds, wallet-only, and prestige coverage.

## Verification evidence

- `npm test -- --run test/upgrades.test.js`
  - Exit 0; 1 file passed; 12 tests passed.
- `npm test -- --run`
  - Exit 0; 29 files passed; 123 tests passed.
- `npx playwright test e2e/smoke.spec.js --grep "Hangar upgrade cards show exact current, next, and max contracts"`
  - Exit 0; desktop and mobile both passed.
  - Verifies initial exact labels, post-purchase current/next refresh, and explicit max state without console errors.
- Playwright CLI mobile Hangar snapshot
  - All eleven current/next labels were present at the 390 × 844 viewport, including Wide Wings, Turbo Fold, and Ink Blast; no page errors were reported.
- `npm run build`
  - Exit 0. Vite retained its existing informational warning for the deferred flight-engine chunk over 500 kB.
- `npm run verify:bundle-budget`
  - Exit 0; initial 79,084 bytes and total 740,157 bytes, both below the 819,200-byte limit.

## Self-review

- Formula/UI drift: upgrade card text contains no effect constants and renders descriptors from `src/upgrades.js`.
- Save compatibility: existing keys and IDs are unchanged; invalid JSON, `null`, fractional, negative, and over-cap values normalize safely.
- Accessibility and mobile: current/next text is visible DOM content, with a separate max state, and the targeted mobile flow passed.

## Files changed

- `src/upgrades.js`
- `test/upgrades.test.js`
- `src/main.js`
- `src/style.css`
- `e2e/smoke.spec.js`
- `.superpowers/sdd/task-6-report.md`

## Commit

```text
feat: expose exact upgrade contracts
```

## Concerns

None.
