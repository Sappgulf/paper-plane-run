# Max Everything — Implementation Plan

> **For agentic workers:** Complete phases in order. Each phase must exit green before the next. Prefer thin vertical slices. Design authority: `docs/superpowers/specs/2026-07-17-max-everything-design.md`.

**Goal:** Raise Feel, Architecture, Meta, Content, and Ship to ceiling quality without breaking saves, parity, star-only economy, or fairness.

**Architecture:** Keep shell → deferred `flight-engine` split. Grow pure modules under `src/game/`. Extract god-file seams before large content. Art stays paper-diorama with stable paths in web + iOS.

**Tech stack:** Vite, Three.js, Vitest, Playwright, Vercel, Xcode WKWebView shell.

---

## Phase 0 — Stabilize WIP

### Tasks

- [ ] **0.1** Confirm `combo-fever.js`, `star-streak.js`, `star-spawn.js` are the single source of truth for fever/streak/cluster math consumed by `flight-engine.js`.
- [ ] **0.2** Land economy soft first ranks + `estimateUpgradeTreeCost` tests.
- [ ] **0.3** Green: `npm test`, hangar-focused Playwright, `npm run build`, `verify:bundle-budget`.
- [ ] **0.4** If ship scripts touched: `build:ios` + `verify:ios-parity`.
- [ ] **0.5** Commit with message covering modularization + economy only. Update `progress.md`.

### Files (expected)

- `src/game/combo-fever.js`, `star-streak.js`, `star-spawn.js`
- `src/game/economy.js`, `src/flight-engine.js`, `src/upgrades.js` (if needed)
- `test/*`, `e2e/smoke.spec.js`, `progress.md`

---

## Phase 1 — Feel Max

### Tasks

- [ ] **1.1** Fever enter/exit feedback (VFX/audio/HUD); honor reduced motion.
- [ ] **1.2** Near-miss tier juice (3 / 6 / fever).
- [ ] **1.3** Star-streak meter + break feedback; optional Gold Rush telegraph.
- [ ] **1.4** Guardian save moment + Ink ready/rank feedback.
- [ ] **1.5** Run-summary CTA polish if not already shipped.
- [ ] **1.6** Unit + Playwright live-upgrade proof; visual inspect max-upgrade Classic frames.
- [ ] **1.7** Commit + progress note.

### Guardrails

- Do not change collision radii or boss passage sizes “for juice.”
- Do not add new upgrade IDs in this phase.

---

## Phase 2 — Architecture Max

### Tasks

- [ ] **2.1** Inventory `flight-engine.js` sections; list extract order (spawn → powers → weapon → boss runtime → zone/weather → plane install).
- [ ] **2.2** Extract first pure-ish module with parity tests (prefer spawn or powers).
- [ ] **2.3** Extract second module; keep `bootFlightEngine` / contract stable.
- [ ] **2.4** Ensure extractions remain in deferred chunk; re-check bundle budget.
- [ ] **2.5** Full unit suite + affected Playwright smoke.
- [ ] **2.6** Commit per extraction if large; update progress with LOC trend.

### Guardrails

- Behavior-preserving only. If behavior changes, stop and fix before more extracts.
- No new modes.

---

## Phase 3 — Meta Max

### Tasks

- [ ] **3.1** Hangar recommended early-path UI (non-binding).
- [ ] **3.2** Surface synergies (existing gold + at most 1–2 new cosmetic synergies).
- [ ] **3.3** Prestige cosmetic milestones (P3/P5/P10) + claim path + art.
- [ ] **3.4** Achievement/mission extensions (fever, bosses, journey, clean runs) — still 3 daily missions.
- [ ] **3.5** Economy re-check with `estimateUpgradeTreeCost` / normal-run earnings if any cap or price changes.
- [ ] **3.6** Hangar Playwright contracts + unit tests for claims/purchases.
- [ ] **3.7** Commit + progress.

### Guardrails

- Additive saves only.
- No second currency.
- No stat-bearing planes.

---

## Phase 4 — Content Max

### Tasks

- [ ] **4.1** Zone 6 definition in `zones.js` + lighting/fog + hazard bias.
- [ ] **4.2** Generate and inspect sky/ground art; integrate stable paths; iOS sync.
- [ ] **4.3** Optional obstacle/prop pack via existing flyer pipeline.
- [ ] **4.4** **Gate:** Journey chapter 2 only if approved — reuse postcard/mastery patterns.
- [ ] **4.5** **Gate:** Third boss only if approved — amend scope guard, full director + tests + art.
- [ ] **4.6** Journey/zone Playwright + unit fairness tests.
- [ ] **4.7** Commit + progress.

### Guardrails

- Fair corridors and recovery spacing.
- Art contract: paper-diorama, no text/logos, transparent cutouts.

---

## Phase 5 — Ship Max

### Tasks

- [ ] **5.1** Full `npm test` + full Playwright matrix.
- [ ] **5.2** Production build + bundle budget.
- [ ] **5.3** iOS generate + parity + simulator (device if available).
- [ ] **5.4** Self-review: no debug/TODO leakage; `git diff --check`.
- [ ] **5.5** Merge/push; production deploy; production smoke.
- [ ] **5.6** Update README feature list + final `progress.md` entry.

---

## Always-on commands

```bash
npm test
npm run build && npm run verify:bundle-budget
# when shipping assets/JS:
npm run build:ios && npm run verify:ios-parity
# phase end:
npm run test:e2e
```

---

## Open decisions (ask before Phase 4+)

1. Journey chapter 2 — yes/no?
2. Third boss — yes/no, and which theme?
3. Post-prestige upgrade ranks (+1 cap on a few upgrades) — yes/no?
