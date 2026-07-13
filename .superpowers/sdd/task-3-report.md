# Task 3 — Plane Collection purchases

## Status

Implemented and committed the versioned plane-ownership model on `codex/balanced-game-polish`.

## Behavior delivered

- Added `purchasePlane(id)` for lifetime-available planes. It spends only `paper-plane-run-wallet` stars and leaves `paper-plane-run-lifetime-stars` unchanged.
- Added `claimPlane(id, seasonId)` for free seasonal and prestige planes.
- Added explicit collection states: `locked`, `available`, `owned`, and `equipped`.
- Added separate view data for `requirement` (lifetime stars, season, or prestige) and `price` (wallet stars, or `null` for claims).
- Added the sole new persistence key: `paper-plane-run-skins-version` (`1`). Existing `paper-plane-run-skins` ownership and `paper-plane-run-skin` equipped keys are unchanged.
- Migrates all legacy saved ownership plus the legacy equipped ID into permanent ownership, including when the legacy ownership JSON is corrupt.
- Kept `unlockSkin` as a compatibility alias to `purchasePlane`; `refreshUnlocks` now migrates/reads ownership without auto-granting planes from lifetime totals.

## RED evidence

Command:

```sh
npm test -- --run test/skins.test.js test/upgrades.test.js
```

Result before implementation: failed as expected — `test/skins.test.js` had 8 failures. The new tests reported absent `purchasePlane` / `claimPlane` APIs and absent `state`, `requirement`, and `price` fields. `test/upgrades.test.js` passed, confirming the existing wallet primitive already leaves lifetime stars untouched.

## GREEN evidence

Focused command:

```sh
npm test -- --run test/skins.test.js test/upgrades.test.js
```

Result: passed — 2 files, 17 tests.

Full relevant suite:

```sh
npm test
```

Result: passed — 28 files, 109 tests.

Production build:

```sh
npm run build
```

Result: passed. Vite emitted the existing flight-engine chunk-size warning (>500 kB); no build errors.

Diff hygiene:

```sh
git diff --check
```

Result: passed with no whitespace errors.

## Test coverage added

- Legacy unlocked and equipped plane retention and schema migration.
- Lifetime availability gate and separate wallet price.
- Exact wallet deduction with lifetime-star preservation.
- Insufficient wallet rejection.
- Idempotent repeat purchase.
- Seasonal and prestige claims.
- Corrupt legacy ownership JSON recovery.
- Wallet primitive does not modify lifetime availability stars.

## Files changed

- `src/skins.js`
- `test/skins.test.js`
- `test/upgrades.test.js`

`src/upgrades.js` already exposed the correct wallet-only `spendWallet` primitive, so no production change there was required.

## Commit

- `e418bf2 feat: make plane ownership wallet-purchased`

## Self-review and concerns

- Verified that every existing `SKINS` cosmetic ID and both legacy ownership/equipped save keys remain unchanged.
- Verified migration never deducts wallet or lifetime stars and always retains the legacy equipped ID as owned.
- The task brief constrained implementation to the collection model and tests. `src/main.js` still uses the compatibility `unlocked` / `canUnlock` fields and does not yet invoke the new purchase/claim APIs directly; wiring the hangar interaction to `purchasePlane` / `claimPlane` is a follow-up UI integration concern outside the listed Task 3 files.
