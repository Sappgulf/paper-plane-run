# Task 4 — Generated Plane Collection art

## Status

Implemented the generated art manifest and production assets for the 14 existing Plane Collection entries on `codex/balanced-game-polish`.

## Art delivered

- Added one PNG texture master and one WebP Hangar portrait for each existing `SKINS` ID under `public/assets/planes/`.
- Added stable `portrait`, `texture`, and `silhouette` fields to every existing plane. The only valid silhouette families are `classic`, `dart`, `glider`, and `stunt`.
- Kept the catalog bounded to the existing 14 IDs; no placeholder planes, copied legacy textures, or new purchasable entries were introduced.
- All 28 assets are RGB, 313×313 images. PNG files are exact crops from the generated source sheet; WebP portraits preserve the same dimensions and composition.

## ImageGen provenance and visual review

Source ImageGen catalog sheet:

```text
/Users/austinbeatty/.codex/generated_images/019f592f-856b-7642-b3a0-8d57b0aa775d/exec-8fdec678-f05a-4eda-875a-66d6667fec67.png
```

The source is a coherent 4×4 `stylized-concept` catalog sheet using premium handcrafted paper, visible fibers and folds, a consistent three-quarter top view, restrained lighting, and no text, logos, or watermarks. The first 14 cells map row-major to the existing `SKINS` order.

Original-size and mobile contact-sheet inspection covered every crop. All 14 planes have clear silhouettes, complete wings and noses, consistent perspective, and readable color/material identities at mobile scale.

### Deliberate opaque portrait decision

Direct transparent generation, a targeted alpha regeneration, and an ImageGen background-extraction edit each returned a baked checkerboard without an alpha channel. Those attempts were rejected and were not integrated. The accepted catalog instead intentionally uses one uniform warm paper-card background across all portraits. This is a deliberate Hangar presentation treatment: it avoids fake transparency artifacts and makes the collection read as one authored set.

## Stable manifest

| Plane | Silhouette | Texture | Portrait |
|---|---|---|---|
| `classic` | `classic` | `/assets/planes/classic.png` | `/assets/planes/classic.webp` |
| `mint` | `glider` | `/assets/planes/mint.png` | `/assets/planes/mint.webp` |
| `coral` | `dart` | `/assets/planes/coral.png` | `/assets/planes/coral.webp` |
| `night` | `stunt` | `/assets/planes/night.png` | `/assets/planes/night.webp` |
| `gold` | `classic` | `/assets/planes/gold.png` | `/assets/planes/gold.webp` |
| `neon` | `dart` | `/assets/planes/neon.png` | `/assets/planes/neon.webp` |
| `rainbow` | `glider` | `/assets/planes/rainbow.png` | `/assets/planes/rainbow.webp` |
| `stormfoil` | `stunt` | `/assets/planes/stormfoil.png` | `/assets/planes/stormfoil.webp` |
| `sunset` | `classic` | `/assets/planes/sunset.png` | `/assets/planes/sunset.webp` |
| `halloween` | `stunt` | `/assets/planes/halloween.png` | `/assets/planes/halloween.webp` |
| `winter` | `glider` | `/assets/planes/winter.png` | `/assets/planes/winter.webp` |
| `valentine` | `dart` | `/assets/planes/valentine.png` | `/assets/planes/valentine.webp` |
| `spring` | `glider` | `/assets/planes/spring.png` | `/assets/planes/spring.webp` |
| `goldenfold` | `classic` | `/assets/planes/goldenfold.png` | `/assets/planes/goldenfold.webp` |

## RED evidence

Command:

```sh
npm test -- --run test/skins.test.js
```

Before mappings, the new manifest test failed because `classic.portrait` was `undefined`. After stable mappings were added, it remained red because the generated asset paths did not yet exist. Existing ownership tests continued to pass.

## GREEN evidence

Focused manifest and ownership suite:

```sh
npm test -- --run test/skins.test.js
```

Result: passed — 1 file, 15 tests.

Full suite:

```sh
npm test
```

Result: passed — 28 files, 115 tests.

iOS offline bundle build and parity:

```sh
npm run build:ios
npm run verify:ios-parity
```

Result: passed — the rebuilt iOS web bundle contains 98 files and matches `ios-dist` exactly.

Production build:

```sh
npm run build
```

Result: passed. Vite emitted the existing warning for the minified flight-engine chunk exceeding 500 kB; there were no build errors.

Diff hygiene:

```sh
git diff --check
```

Result: passed with no whitespace errors.

## Asset validation and self-review

- Verified all 14 PNG/WebP pairs decode successfully at 313×313.
- Verified every PNG is pixel-identical to its assigned source-sheet crop.
- WebP conversion mean absolute error ranged from 2.13 to 2.90 across RGB channels.
- Verified all 28 filenames and SHA-256 hashes match across `public/assets/planes`, `dist/assets/planes`, `ios-dist/assets/planes`, and `ios/PaperPlaneRun/web/assets/planes`.
- Verified `tmp/imagegen` and its crop/contact-sheet intermediates were removed.
- Reviewed the code diff for catalog expansion, unstable paths, invalid family IDs, and ownership behavior changes; none were introduced.

## Files changed

- `src/skins.js`
- `test/skins.test.js`
- `public/assets/planes/*.png`
- `public/assets/planes/*.webp`
- `.superpowers/sdd/task-4-report.md`

## Commit

```text
art: rebuild the purchasable plane collection
```
