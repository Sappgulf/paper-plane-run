# Task 6 — Exact upgrade contracts

## Status

DONE

Every existing upgrade now has one shared formula source for runtime effects and an exact player-facing current/next contract. The Hangar renders that contract directly, including an explicit max state.

The validated Task 6 review findings are also closed: prestige level 50 is a terminal state across progression and UI, and the exact-contract proof now checks every descriptor value, runtime mapping, purchase case, and Hangar card.

## Behavior delivered

- Exported `describeUpgradeEffect(id, level)` with normalized current level, exact current values/label, exact next values/label, and `null` next effect at the cap.
- Centralized all eleven upgrade formulas in private helpers used by both `describeUpgradeEffect()` and `getUpgradeEffects()`.
- Preserved all upgrade IDs and storage keys while normalizing malformed saved data to integer levels within each known upgrade's true cap.
- Kept purchases wallet-only; existing insufficient-funds, persistence, prestige, and lifetime-star protections remain covered.
- Added current and next contract text to every Hangar upgrade card. Maxed cards display `Next: MAX — all ranks purchased`.
- Removed prestige percentage arithmetic from `main.js`; its displayed and confirmation values now come from the upgrades module.
- Preserved `paper-plane-run-prestige` and the existing cap of 50 while preventing rewardless resets at that cap.
- Made `canPrestige()` return false at level 50 and `doPrestige()` return `{ ok: false, reason: 'max-prestige', level: 50 }` without changing saved upgrades or prestige.
- Added a visible `Golden Fold 50 · MAX` state with the exact +150% permanent bonus and no prestige button or promised +3% reward.
- Exposed exact Turbo grace and hitbox values through `getUpgradeEffects()` from the same private formula used by the descriptor.

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

### Review RED

```sh
npm test -- --run test/upgrades.test.js
```

Failed in the three intended places: prestige bonus queries returned 153% beyond the cap, the cap case still exposed another reward, and Turbo's exact grace/hitbox values were absent from runtime effects.

```sh
npx playwright test e2e/smoke.spec.js --grep "Hangar upgrade cards show exact current, next, and max contracts|Hangar exposes prestige cap"
```

The new prestige-cap browser case failed as intended because the UI rendered `Golden Fold 50` instead of an explicit MAX state.

### Review GREEN

```sh
npm test -- --run test/upgrades.test.js
```

Final focused result: 1 file passed, 35 tests passed.

The strengthened table asserts every `values` field at every level, including `scorePercent`, `powerSpawnPercent`, `nearMissWindow`, and `boostGraceSeconds`. Runtime alignment runs at every level, and purchase persistence/insufficient-funds cases run for all eleven IDs alongside parameterized prestige eligibility, final reward, and cap cases.

## Verification evidence

- `npm test -- --run test/upgrades.test.js`
  - Exit 0; 1 file passed; 35 tests passed.
- `npm test -- --run`
  - Exit 0; 29 files passed; 146 tests passed.
- `npx playwright test e2e/smoke.spec.js --grep "Hangar upgrade cards show exact current, next, and max contracts"`
  - Superseded by the review lane below.
- Targeted review E2E, run separately with `--project=desktop --workers=1` and `--project=mobile --workers=1`
  - Exit 0; desktop 2 passed and mobile 2 passed.
  - Verifies exact max-minus-one current/next labels for all eleven cards, purchases each final rank, then verifies all eleven exact current/MAX states.
  - Verifies prestige level 50 displays the exact +150% cap state, no prestige button, and no promised +3% reward.
- Playwright CLI mobile Hangar snapshot
  - All eleven current/next labels were present at the 390 × 844 viewport, including Wide Wings, Turbo Fold, and Ink Blast; no page errors were reported.
- `npm run build`
  - Exit 0. Vite retained its existing informational warning for the deferred flight-engine chunk over 500 kB.
- `npm run verify:bundle-budget`
  - Exit 0; initial 79,415 bytes and total 740,488 bytes, both below the 819,200-byte limit.

## Self-review

- Formula/UI drift: upgrade card text contains no effect constants and renders descriptors from `src/upgrades.js`.
- Save compatibility: existing keys and IDs are unchanged; invalid JSON, `null`, fractional, negative, and over-cap values normalize safely.
- Accessibility and mobile: current/next text is visible DOM content, with a separate max state, and the targeted mobile flow passed.
- Prestige cap: level and bonus queries clamp to 50/+150%; the cap rejection path returns before either storage key can be mutated.

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
fix: guard prestige cap contracts
```

## Concerns

None.
