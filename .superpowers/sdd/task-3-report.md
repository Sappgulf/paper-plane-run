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

## Review findings follow-up

### Fixed

- Hangar cards now differentiate `owned` from `available`: owned planes equip immediately, wallet-priced available planes call `purchasePlane`, and free seasonal/prestige available planes call `claimPlane`.
- A plane equips only after its purchase or claim succeeds. The Hangar re-renders both wallet/card state and announces the result; an insufficient-wallet result leaves the plane unequipped and reports the shortfall.
- Corrupt/non-array ownership data is now always written back as valid ownership, even when no equipped value exists or the equipped value cannot identify a plane. In that fallback case, Classic is equipped.
- Added repeat seasonal-claim and prestige-claim idempotence assertions.
- Added a rendered Hangar regression covering wallet purchase, free seasonal claim, automatic equip, wallet refresh, persisted ownership, and zero browser-console errors in both desktop and mobile projects.

### Verification

```sh
npm test -- --run test/skins.test.js test/upgrades.test.js
```

Result: passed — 2 files, 18 tests.

```sh
npm run test:e2e -- --grep 'Hangar purchases wallet-priced planes and claims free seasonal planes before equipping'
```

Result: passed — desktop and mobile, 2 tests.

```sh
npm run build
```

Result: passed. Vite emitted the existing flight-engine chunk-size warning (>500 kB); no build errors.

```sh
git diff --check
```

Result: passed with no whitespace errors.

### Fix commit

- `fix: complete plane collection Hangar flow` (this review-fix commit)

## Data-repair follow-up

### Fix evidence

- `src/skins.js` now filters parsed ownership entries to string IDs present in `SKINS`, removes duplicates, ensures `classic`, and persists the repaired known-ID array.
- An invalid non-empty `paper-plane-run-skin` value now persists back to `classic` while `getEquippedSkinId()` returns the repaired fallback.
- Focused coverage verifies repair of `[null]` to `['classic']`, `['classic', 7]` to `['classic']`, removal of unknown IDs while retaining known `mint`, and invalid equipped-ID repair to `classic`.

### Test evidence

Command:

```sh
npm test -- --run test/skins.test.js test/upgrades.test.js
```

Result: passed — 2 files, 22 tests.

```sh
git diff --check
```

Result: passed with no whitespace errors.
