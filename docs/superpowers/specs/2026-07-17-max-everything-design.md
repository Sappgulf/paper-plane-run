# Paper Plane Run — Max Everything Design

**Date:** 2026-07-17  
**Status:** Draft for approval  
**North star:** Raise every pillar (Feel, Architecture, Meta, Content, Ship) to its ceiling in phased passes, without breaking saves, parity, or the star-only economy.

## Goals

- Make every second of flight feel premium: readable, juicy, fair.
- Make the codebase modular enough that future content does not bloat `flight-engine.js`.
- Make Hangar / prestige / collection feel like a long-term fantasy, not a one-shot tree.
- Expand world and Journey content with cohesive paper-diorama art.
- Keep web + offline iOS ship gates green after every tranche.

## Non-goals (global, unless a later phase explicitly amends them)

- No second spendable currency.
- No pay-to-win planes (silhouettes remain cosmetic; collision radius stays shared).
- No full engine rewrite or Three.js replacement.
- No destructive save wipe; migrations must be additive and idempotent.
- No new public game *mode* in Phases 0–3 (Classic / Daily / Journey / etc. stay the surface).
- Phase 4 may add **one** new boss kind and/or **Journey chapter 2** only after explicit go-ahead and scope-guard update.

## Product laws (carry forward)

1. **Upgrade contract:** purchase → persist → formula → runtime consumption → HUD/feedback.
2. **Stars only:** wallet stars spend; lifetime stars gate availability; prestige is permanent multiplier + cosmetics.
3. **Parity:** every web asset/chunk ships in iOS offline bundle; `verify:ios-parity` is law.
4. **Budget:** initial + total JS budgets remain hard gates; defer heavy code behind the engine chunk.
5. **Fairness:** denser content never removes flyable corridors, boss passages, or recovery space.

---

## Current baseline

| Pillar | Baseline |
|--------|----------|
| Feel | Combo fever tease, wind telegraph, boss phases, adaptive quality, guardian/weapon wired |
| Architecture | Shell/engine split; pure helpers growing under `src/game/`; `flight-engine.js` ~5.6k LOC |
| Meta | 14 upgrades, prestige ≤50, plane collection, missions, achievements, postcards |
| Content | 5 zones, 2 bosses, 4 Journey destinations, obstacle art pack |
| Ship | Vitest, Playwright, bundle budget, iOS parity, Vercel production |

**In-flight WIP (Phase 0 input):** modular `combo-fever` / `star-streak` / `star-spawn`, soft first-rank economy for fever/streak/wealth, hangar/CTA polish notes in `progress.md`.

---

## Phase map

```
P0 Stabilize WIP → P1 Feel Max → P2 Architecture → P3 Meta Max → P4 Content Max → P5 Ship Max
         \________________ always-on verification after each phase ________________/
```

Phases are sequential for risk, but small prep work (tests, art batches) may run ahead when they do not couple to unfinished APIs.

---

## Phase 0 — Stabilize the runway

**Intent:** Land what is already started so every later phase builds on green main.

### Deliverables

- Finish wiring pure modules into the flight loop:
  - `src/game/combo-fever.js`
  - `src/game/star-streak.js`
  - `src/game/star-spawn.js`
- Soft first ranks for fever / streak / wealth remain in `FUTURE_PRICE_TABLE`.
- `estimateUpgradeTreeCost` + economy tests green.
- Scope guard tests updated only if still accurate (no new modes/bosses/currencies).
- Commit WIP; do not leave half-modules untracked.

### Out of scope

- New upgrades, zones, bosses, prestige redesign.

### Exit criteria

- `npm test` green
- Focused Playwright hangar/upgrade lanes green
- `npm run build` + `verify:bundle-budget` pass
- `npm run build:ios` + `verify:ios-parity` pass when touching distributed assets/scripts

---

## Phase 1 — Feel Max

**Intent:** Every existing system *reads* and *sounds* maxed without new systems.

### Juice targets (existing systems only)

| System | Max treatment |
|--------|----------------|
| Combo Fever | Distinct enter/exit VFX, audio swell, restrained camera pulse (respect reduced motion) |
| Near-miss chain | Escalating confetti/haptic tiers at 3 / 6 / fever threshold |
| Star streak | Visible chain meter / chip; break sting; Gold Rush cluster telegraph when odds high |
| Guardian | Slow-mo crease flash + HUD charge spend that is unmistakable |
| Ink Blast | Rank-scaled projectile trail + pop feedback; ready pulse on cooldown complete |
| Boost / Turbo | Cleaner entry grace + speed-line readability without washout |
| Boss final pass | Stronger commit feedback already fair; hit-stop only if reduced-motion safe |
| Run summary | Count-up polish, clear “Spend ★ in Hangar” CTA (partially done) |

### Player-facing rules

- Feedback must never hide hazard silhouettes.
- Reduced motion: keep timing text and lane labels; drop spin/camera excess.
- Colorblind: shape + brightness remain primary, not hue alone.

### Tests

- Unit: fever/streak state machines, HUD string contracts.
- Playwright: live upgrade fixtures still assert fever/streak/wealth text state.
- Visual smoke: 2–3 Classic frames with max upgrades vs baseline (manual inspect).

### Exit criteria

- Maxed upgrades produce obviously better *feedback*, not just invisible multipliers.
- No spawn/collision fairness regressions (bird density, corridors, boss passages).

---

## Phase 2 — Architecture Max

**Intent:** Carve the god-file so Content/Meta can ship fast without merge pain.

### Target module seams (from `flight-engine.js`)

Extract pure or near-pure ownership first; leave Three.js scene graph orchestration in a thin runtime shell.

| Module | Responsibility |
|--------|----------------|
| `game/spawn-chunk.js` (or similar) | Hazard/star/power chunk rolls using existing `getSpawnRates` |
| `game/powers-runtime.js` | Activate/clear power, duration via `getPowerDuration` |
| `game/weapon-runtime.js` | Fire, shots update, cooldown via `getWeaponState` |
| `game/boss-runtime.js` | Approach clear, phase ticks — director stays pure |
| `game/zone-weather.js` | Zone apply, weather FX, sky/ground crossfade helpers |
| `game/plane-install.js` | Install/dispose flight plane + trail (already partial) |
| Keep in shell | rAF loop, input, DOM HUD bindings, mode start/stop |

### Rules

- Prefer **move + re-export** over rewrite.
- Public engine contract (`engine-contract` / `bootFlightEngine`) stays stable.
- No behavior change intended; golden unit tests + Playwright smoke prove parity.
- Bundle: extractions must stay in the **deferred** engine chunk, not inflate initial shell.

### Exit criteria

- `flight-engine.js` meaningfully smaller (target: under ~4k LOC after first carve, trajectory toward ~2.5–3k over follow-ups).
- Same test matrix green; no new public mode APIs.

---

## Phase 3 — Meta Max

**Intent:** Long-horizon Hangar fantasy while preserving first-hour affordability.

### 3A — Tree clarity (no new IDs required)

- Hangar **recommended early path** (handling → lift → magnet or luck) as non-binding UI guidance.
- Progress filter clarity (already started): Progress vs Meta groups stay legible on mobile.
- Synergy surfacing: document and highlight existing wingspan+trail gold synergy; add **at most 1–2** more dual-max synergies (cosmetic trail tint + tiny score aura only).

### 3B — Prestige fantasy

| Prestige level | Reward direction |
|----------------|------------------|
| Every level | Keep +3% score/star mul, tree reset |
| P1 | Existing Golden Fold claim |
| P3 / P5 / P10 | New prestige-only cosmetic planes or trail frames |
| Cap (50) | Title / hangar badge (“Paper Legend”) — cosmetic |

No prestige-only *stat* upgrades that skip the tree; optional **post-prestige ranks** (level cap +1 on 2–3 upgrades) only if economy math is re-proven with `estimateUpgradeTreeCost` and normal-run earnings.

### 3C — Achievements & missions

- Add achievement tracks: fever triggers lifetime, boss clears, journey stamps, clean distance.
- Mission templates for journey objectives / ink pops already partial — extend without daily overwhelm (still 3/day).

### Save rules

- Additive keys only; prestige plane claims use existing claim path.
- Never reset wallet on prestige (current behavior).

### Exit criteria

- New pilot can afford first ranks within a few normal runs.
- Prestige player has visible cosmetic goals beyond the percentage.
- All purchase/claim paths covered by unit + Hangar Playwright contracts.

---

## Phase 4 — Content Max

**Intent:** More world to fly through, still fair and on-theme.

### 4A — Zone expansion (default in-scope)

- **Zone 6** after Aurora (e.g. “Midnight Origami” or “Desk Underworld”).
- Imagine sky + ground; hazard bias table entry; fog/hemi palette.
- Distance threshold past 1200m with recovery spacing before denser bias kicks in.

### 4B — Obstacle / ground pack

- 2–4 new obstacle cutouts or ground props reusing flyer pipeline.
- Zone-tinted decor density, not new collision types if avoidable.

### 4C — Journey chapter 2 (optional gate)

- Additional destinations only after Chapter 1 flow remains stable.
- Same postcard + mastery patterns; new art registry entries.
- No new currency; stars and stamps only.

### 4D — Boss kind (optional gate — requires scope-guard amendment)

- Third boss only with full director phases (warning / pressure / final), passage tests, art contract, reduced-motion/colorblind.
- Candidates: Stapler Gate, Tape Roller, Hole Punch — paper-desk theme.
- **Do not start 4D without explicit approval.**

### Art contract (unchanged)

Premium paper-diorama, transparent cutouts, no text/logos, mobile-readable silhouettes, inspected before commit.

### Exit criteria

- New zone reachable in Classic; Journey assets in web + iOS.
- Boss/zone fairness tests green; Playwright journey smoke green if chapter expanded.

---

## Phase 5 — Ship Max

**Intent:** Productize the maxed game.

### Checklist

- Full Vitest + full Playwright matrix
- Production build + bundle budget
- iOS generate + parity + simulator smoke
- Physical device when available
- Production deploy + production URL smoke (menu, hangar, one flight)
- Progress/README feature list updated
- No TODO/debug leakage; `git diff --check` clean
- Optional: PWA offline smoke, analytics funnel sanity, marketing stills from web-game-proof

### Exit criteria

- `main` green, pushed, production live, iOS bundle in sync.

---

## Cross-cutting verification (every phase)

| Gate | Command / action |
|------|------------------|
| Unit | `npm test` |
| E2E | Focused lanes then `npm run test:e2e` as phase ends |
| Web build | `npm run build && npm run verify:bundle-budget` |
| iOS | `npm run build:ios && npm run verify:ios-parity` when assets/JS ship |
| Scope | Keep or intentionally amend `test/scopeGuard.test.js` |
| Saves | No forced wipe; migrations tested |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Feel juice hides hazards | Reduced-motion path; silhouette-first review |
| Engine split regressions | Extract pure logic first; golden tests; no API renames mid-phase |
| Economy inflation | Soft first ranks; `NORMAL_RUN_EARNINGS` driven pricing |
| Bundle bloat | Defer art-heavy and engine code; budget gate fails the PR |
| Scope creep (new mode) | Phases 0–3 forbidden; Phase 4D/Journey explicitly gated |
| iOS drift | Parity script required before merge when dist changes |

---

## Suggested PR / commit slices

1. **P0** — modular fever/streak/wealth + economy soft prices + tests  
2. **P1a** — fever/near-miss juice  
3. **P1b** — streak/guardian/weapon juice + run summary  
4. **P2a** — extract spawn + powers  
5. **P2b** — extract boss runtime + zone weather  
6. **P3a** — hangar guidance + synergy UI  
7. **P3b** — prestige cosmetics + achievements  
8. **P4a** — zone 6 + art  
9. **P4b** — journey chapter 2 and/or boss 3 (if approved)  
10. **P5** — full matrix, deploy, docs  

---

## Completion definition (program-level)

Paper Plane Run is “maxed” when:

1. Max upgrades and prestige cosmetics are *felt* and *seen*, not only calculated.  
2. `flight-engine.js` is a coordinator, not a junk drawer.  
3. Hangar has a multi-prestige fantasy beyond a single prestige plane.  
4. The world continues past Aurora with at least one new zone and cohesive art.  
5. Web production and offline iOS ship from the same verified bundle with green automated gates.

---

## Decision log (to fill on approval)

| Decision | Choice | Date |
|----------|--------|------|
| North star | All pillars, phased | 2026-07-17 |
| Phase 4D third boss | TBD | |
| Phase 4C Journey chapter 2 | TBD | |
| Post-prestige upgrade ranks | TBD | |
| Start implementation at | Phase 0 (recommended) | TBD |
