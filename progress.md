# Paper Plane Run — Living Journey Expansion

Original prompt: “1-3! Use skills needed, imagegen, computer! Build, test and polish! When finished push and commit! Then deploy to vercel!” Direction approved: “Balanced hybrid!” Final authorization: “I approve get it done!”

## 2026-08-30 — Round 7: full-sweep audit fixes across engine, shell, meta, and iOS

- **Audit:** four parallel code audits (flight engine + game modules, shell/UI/CSS, meta/economy, iOS wrapper + build scripts) surfaced ~50 concrete issues; fixed the high-value set below.
- **Flight engine:** `bossActive` could pin true forever — the un-cleared gate cleanup lived inside the collision dz window *and* behind the invuln gate, so a gate slipped past under Phase/invuln silently disabled every future boss gate and mini-gauntlet and pinned music intensity. Expiry now resolves before the `canCollide` gate. Buildings/decor geometries (fresh BoxGeometries per spawn) are now disposed on removal (WeakSet-guarded), stopping long-session GPU-buffer growth. `showMenu` resets distance/tier/twist/boss/zone state so the menu attract spawner no longer inherits a dead run's midnight-zone Tier-N hazards. Journey `gust` encounters set their banner text and scale by `difficulty.windForce`. Combo float hide-timer race fixed with a tracked timeout. Confetti reduced-motion now gates at a single choke point in `spawnConfetti`. `showPowerBanner` stops short banners clobbering long ones. Thread-the-gap payouts now haptic like their gauntlet sibling. The promised gauntlet lane now renders as a translucent additive ribbon at the lane x.
- **Perf:** haptics flag cached (was `localStorage` read+parse per event on near-miss chains; invalidated via a new `paperplane:settings-changed` event dispatched from `saveSettings`). `updateGroundLife` skips matrix recompose for `motion:'none'` species until scrolled and skips entirely when hidden. Hot-path allocations hoisted: shot-removal Set, distance milestones, `endlessTierAt` tier probe before `resolveTier`, magnet-pull scratch args, reused edge-candidate slots. `pool.js` hardened (Set-based, double-release guard) for future mesh reuse.
- **Shell/UI:** Hangar leaderboard Daily/Weekly/Global/Time Attack tabs were dead — wired with a generation-token guard against stale async renders. Mission badge span added so claimable missions surface on the Hangar pill. Journey/postcard writes now route through `safeSetItem`. Mute button gets `aria-pressed` + label swap; pause dialog moves/restores focus; Escape closes install-hint/postcard-detail (with focus restore); music toggle row added in Settings (the `toggleMusic` API existed with no UI). Engine-start failure no longer yanks the user out of a panel they navigated to during the wait. Reduced-motion coverage extended to combo pulse/New Best/next-zone animations; 44px coarse-pointer targets for claim/upgrade-chip/hangar-tab; `#ar-btn` hidden in markup until the engine boots. Dead `renderJourneyChapterPicker` + CSS removed. Postcard reveal now plays the mission-complete fanfare.
- **Meta:** Chapter 2 completions now credit Navigator mastery (`sunset`/`midnight` were dropped). Achievement tiers can't be claimed below their threshold. Equipped-but-unowned plane IDs reset to classic instead of granting free ownership. Mastery save survives unknown future versions (was deleted on any version mismatch). Challenge-share step byte overflow past ~56 km fixed with a versioned u16 encoding + legacy decode path. Harbor shortcut-gate objective target now matches the real gate count (3). Seasonal skins' dead `cost: 999` → `0`; missions' unwritten `claimStars` field removed. New `missions-streak` tests pin streak reset/continuation and 7/14-day bonus payouts with fake timers.
- **iOS + build:** ~15 MB of macOS duplicate-copy junk (`" 2"`/`" 3"` files) and `.vite/` metadata removed from the app bundle; sync/parity scripts now prune and refuse junk. Parity also rejects files absent from both build trees. `postprocess-ios` regexes are global and fail on leftover `crossorigin`. `WeakScriptMessageHandler` proxy breaks the retain cycle that leaked the whole WKWebView (plus observers) on every SwiftUI re-creation; audio session set to `.ambient`; backgrounding pauses media playback; navigation policy allows only `paper-plane://`. Service-worker generator is idempotent; bundle budget walks the critical-path import graph.
- Verification: 71 Vitest files / 439 tests (up from 70/425); production build PASS; bundle budget PASS (108,833 initial / 848,407 total vs 921,600); iOS build + parity 85 files byte-exact with zero strays. Full Playwright matrix not completable this session — host load 20–51 (iCloud sync storm + unrelated xctest); partial runs reached 58/94 with zero failures, and the single failure seen (frame-health "warming" poll timeout) reproduced identically on the unmodified tree under the same load, confirming it is environmental rather than a regression.

## 2026-08-25 — Round 6: fever identity, boss-pressure music, near-miss badges

- **Fever identity:** while a fever burst runs, the paper plane itself burns gold — pulsing warm emissive on the body plus orange accent glow that resets cleanly when it ends. Combo float text now includes the paid meters (`NEAR MISS x3 · +3.75m`), and near-miss distance pays **double during fever** so the burst economy matches its visuals.
- **Boss pressure music:** any active, un-cleared gate within 40m pins the adaptive music bed wide open next to fever — approaches audibly escalate.
- Verified: fever fixture screenshot confirms golden plane + 1.5× chip + rainbow burst; Vitest suite green; full desktop gameplay e2e green.

## 2026-08-25 — Round 5: flight dynamics, torn-paper crash burst, skill missions

- **Flight — camera carving:** the chase camera now leans subtly into bank and pitch (`velX/velY → lookAt offsets`, clamped) so turns and dives read as carving air instead of a fixed rig — zero gameplay impact, pure feel.
- **Crash — torn-paper burst:** the old two-burst crash pop becomes a staggered 30-shard torn-paper cloud in a new `aero` palette (paper creams + one ink fleck), layering the tumble, hit-stop and camera punch into a proper paper explosion. Win finishes keep their chime.
- **Gameplay — missions for the new mechanics:** two new daily mission templates — "Clear N hazard gauntlets" and "Thread N tower gaps" — fed by `runStats.gauntlets/threads` counters wired into both reward paths and the run-summary stats.
- **Crash-card layout fix:** game-over action buttons shared a grid row with the polaroid and column-stretched into giant buttons; both action rows now `align-self: start`.
- Verification: 70 Vitest files / 425 tests (new `missionSkills` coverage); full desktop gameplay e2e passes; build PASS, bundle 107,184 initial / 845,342 total.

## 2026-08-25 — Round 4: visual audit via SuperDesign + art rebalance

- **Visual audit with the design skill:** ran SuperDesign init (repo → `.superdesign/init/` + `design-system.md`), created the menu project, produced a pixel-perfect reproduction draft plus two named direction drafts (Tidy Menu / Hero Edition) — all three live on superdesign.dev. Screenshot-audited every surface headlessly (desktop + mobile menu, hangar, flight, boss, game-over, journey).
- **The loud-ground fix:** zone ground art was a saturated multicolor quilt that fought hazards. All six `ground-*.jpg` retoned with PIL (desaturate ~50% toward paper cream, warm channel shift, gentle contrast) — the paper-city layout stays, the saturation drops. Building texture deepened (autocontrast + window contrast) and building tints richened so towers read as cut paper instead of white ghosts.
- **Plane readability:** deeper fold accents (`0xd96f4e` + slight warm emissive) so the plane silhouette holds against pale skies.
- **Sky depth:** bigger, more numerous cushion clouds (12 / 16 low-power) parallaxing at 0.35×.
- **Menu tidy (superdesign direction A):** the orphaned Pilot name field moved INTO the settings grid as a full-width third field (soft inset, evenly matched Difficulty/Controls columns), hints tightened, card translucency nudged so the paper-craft backdrop glows through.
- **Audit tooling notes:** the old `#test-*` flight fixtures call `clearEntities()`, which deletes clouds — fixture screenshots were misleading; a no-fixture real-flight probe now drives the true view.
- Verification: 69 Vitest / 423 tests; menu-boot + full gameplay e2e pass; build PASS; bundle 107,184 initial / 844,751 total.

## 2026-08-25 — Round 3: real gameplay test pass, thread double-pay fix, new gameplay e2e suite

- **Actually played every mode headlessly.** New `e2e/gameplay.spec.js` (6 desktop tests) drives the live engine through: an altitude-tier climb with golden-star verification, a gauntlet tripwire payout (+banner +monotonic wallet), a tagged-vs-control thread-gap proof, duplicate-orb refresh, boot-and-fly for daily / weekly / time attack / co-op / hot-seat (including pause→menu exit), and sustained-steering classic + tutorial completion. Shared helpers extracted to `e2e/smoke-helpers.js` so both suites drive identically.
- **Real bug found & fixed — thread-the-gap paid twice per gap:** each of the two tagged towers resolved its own payout, cashing +40 instead of +20. Both towers now share one corridor object whose `paid` flag guards the reward (spawnChunk builds it once per gap).
- **Testability contract extended:** `render_game_to_text` now exposes `lastReward` ('thread'/'gauntlet'), `power {kind,timeLeft}`, `banners {zone,action}`, and a `golden` flag on visible stars. Four deterministic DEV fixtures added (`#test-tier-climb`, `#test-gauntlet-payoff`, `#test-thread-gap?nothread`, `#test-power-refresh`), all with the spawn pump fully parked (`nextSpawnZ=1e9` — the old `220` still spawned because the pump decrements below its threshold on frame one).
- **Menu-exit polish:** quitting mid-gust or mid-bullet-time no longer strands wind streaks or the slow-mo vignette behind the menu (`showMenu` clears both).
- **e2e lessons baked into the spec:** hash-only navigations reuse the running engine (distinct queries force reloads); the boot deep-link cleanup wipes `location.search` before fixtures run, so the thread control flag is read at module top beside the other dev params; endless gauntlets legitimately recur every 250m, so assertions check payouts and monotonic stars rather than vanishing entities.
- Verification: 69 Vitest files / 423 tests passed; FULL Playwright matrix on a quiet tree — 94 specs, **64 passed / 30 viewport-gated skips / 0 failed**; production build PASS; bundle budget 107,184 initial / 844,713 total vs 921,600; iOS parity re-synced byte-exact.

## 2026-08-25 — Round 2: thread-the-gap, Golden Hour twist, music + milestone juice

- **Thread-the-gap bonus:** when both side towers rise close enough that their inner faces leave a tight slot (≤5 units), spawnChunk marks the pair with the corridor bounds (capped at the shorter rooftop). A clean pass between them pays +20m with a whoosh and route confetti — wall clearance is honored so scraping doesn't pay (`game/thread-gap.js`, pure + tested).
- **Golden Hour daily twist:** new deterministic daily modifier — stars pay double meters (spawn counts untouched), joining the rotation alongside Tailwind/Star Rush/etc.
- **Fever music lift:** the adaptive music bed now pins to full intensity while Fever is active, so the score burst sounds like one; boss-free otherwise unchanged.
- **Milestone celebrations:** 500m/1000m crossings pop gold confetti and an in-world `${m}m!` callout instead of silently advancing analytics.
- Verification: 68 Vitest files / 423 tests passed; boot + silhouette e2e pass on desktop/mobile; bundle budget PASS (107,184 initial / 844,407 total); iOS parity 86 files byte-exact.

## 2026-08-25 — Gameplay + juice upgrade pass

- **Gauntlet payoff:** mini-gauntlets announced "lane open" but surviving paid nothing. An invisible tripwire marker now resolves behind the last hazard: holding the advertised lane banks +3★ / +50m with hit-stop, gold confetti, and a banner (pure rules in `game/gauntlet-reward.js`). Passing wide stays free — the lane promise is honest, only in-lane pays.
- **Power refresh economy:** catching a duplicate orb used to wipe the active power's remaining timer via `clearPower()`. Same-kind pickups now top the timer back to full and pay +25m; switching kinds still replaces (one slot keeps HUD/physics toys sane) but refunds +12m (`game/power-pickup.js`).
- **True bullet-time:** slow-mo was four disconnected number tweaks on cruise speed. It now dilates world scroll and the hazard motion clock (`hazardClock`, ×0.62) so hazards genuinely hang while controls stay full-rate, plus a cool `#slow-fx` vignette (reduced-motion aware). Boss directors step on scaled dt, so phases read in slow motion too.
- **Star value rides risk:** star pickup paid flat +18m regardless of fever/skim. The meter bonus now multiplies by fever (×1.5) and skim tier (+8%/tier) — same risk systems the score factor uses (`game/star-value.js`).
- **Golden tier stars:** every altitude-tier climb drops a 3-star golden arc along the reserved lane (5★ each, double meters, bigger self-lit art, star-streak chime, hit-stop) so deep runs get a visible payday. Scissor-squadron chance also scales +2%/tier.
- **Wind made visible:** gusts were an invisible HUD shove. Pooled streak motes now stream across the field in the push direction, ambient dust leans with the gust, both gated off for reduced-motion/low-power.
- **Confetti pool + palettes:** bursts allocated 10 fresh meshes+materials each and fired constantly. Now a persistent 96-piece ring buffer with per-event palettes — classic near-miss, gold currency (stars/streaks/gauntlet), rainbow fever, blue-violet route saves/boss clears/crash-wins.
- **Plane model polish:** authored keel fold (underside crease, accent color) per silhouette — cosmetic only, collision radius unchanged — plus slightly richer upgrade-trail points.
- Verification: 68 Vitest files / 418 tests passed; boot/silhouette/engine e2e specs pass (desktop+mobile); production build PASS, bundle budget 107,088 initial / 843,433 total vs 921,600 limit; iOS parity 86 files byte-exact after `build:ios` re-sync.

## 2026-08-22 — Verification pass: real crash fixes, corner-button UX, flake-proof boot

- **Crash fix:** `createWindTunnelGate` referenced an undefined `halfHeight` (only `halfWidth` was declared after the boss-fairness rebuild). Every wind-boss spawn killed the engine — in the browser this surfaced as `EngineLifecycleError: halfHeight is not defined` at boot, which broke the wind boss encounter and made the e2e boss lane unreliable. Declared the value from `userData` like its twins.
- **Plane preview stale-hover fix:** after purchasing/equipping a plane, re-rendered card grid sat under a stationary cursor; browsers re-fire `pointerenter` for those cards and the preview reverted to the card under the pointer (e.g. buy Coral → preview says Classic Cream). Added a short post-render hover lock plus a moving-pointer guard (`lastPointerMoveAt`), so the equipped plane wins after purchase and genuine mouse/touch browsing still previews cards. Focus previews untouched for keyboard accessibility.
- **Corner-button UI/UX:** Desk AR 📷 was shown on main menus and the install shortcut ⬇️ stayed visible mid-flight, crowding the mobile top row over the logo card. AR is now flight-only; install hides during flight and re-shows on menus only when PWA-eligible (`data-install-eligible`). Matched a boot `syncPauseUi()` so states apply without waiting for an interaction.
- **Dev-boot race:** the service worker (which claims and reloads the page once on first install, killing the module graph mid-load) now registers only in production builds (`import.meta.env.PROD`); dev/e2e boots are single load, offline/PWA behavior unchanged on the deployed site.
- **Shell boot marker:** `html[data-shell=ready]` set when the shell finishes top-level wiring — gives tests (and future perf probes) a deterministic boot signal; `openApp` waits for it, retrying across the first-visit SW reload.
- **E2E suite health:** fixed stale expectations vs. the intentional economy/boss changes (mint 18★/coral 32★, passages 4.0×3.7, warning 1.5s/pressure 1.5s timings), scoped the upgrade-card lookup by `u-title` (Gold Rush's "stacks with Lucky Scrap" text made `hasText` match two cards), made game-over/boss flows engine-aware (`waitForGameText`), moved hangar-nav clicks to the suite's force-tap pattern, and added a corner-button state regression test. Global Playwright timeout 45s → 90s; heavy WebGL tests stay `test.slow()`.
- Verification: 51 Vitest files / 256 tests passed; full Playwright 47 passed, 15 viewport-gated skips, 0 failed; production build + bundle budget PASS (94,312 initial / 789,954 total bytes vs 819,200 limit); iOS parity 114 files byte-exact.
- **Rebased onto an upstream main advance** (`160cf19` + the Weekly Fold / aim-mode physics series): kept the wind-boss crash fix, corner-button UX, shell boot marker, and dev-SW gate while adopting upstream's stronger synchronous preview epoch/lock system (their `data-plane-id` sets immediately, focused-intent + pointer-gate locks) and `data-upgrade-id` e2e selectors; reconciled boss passages (now 4.8×4.4 normal) and ghost-share game-over copy. Full re-verification on the merged tree: 64 Vitest files / 406 tests; full Playwright 58 passed, 24 viewport-gated skips, 0 failed; bundle budget PASS (837,279 total / 921,600); iOS parity 86 files byte-exact.



## 2026-07-18 — Imagine boss emblems

- Generated paper-diorama scissors / wind / stapler emblems; cut to real alpha webp+png.
- Badges placed top + left + right of the open portal (never covering the hole).
- Wind ring interiors kept transparent; badge materials use alphaTest for clean edges.

## 2026-07-18 — Boss portal rebuild (playable + fixed assets)

Root causes: full-face art overlays (stapler white plate) blocked the hole; fixed-size ring ≠ collision; blades/fans/jaws sat inside the flyable space.

- Open rectangular portal sized to the real passage on all three bosses.
- Art is a small badge above the hole; scissors/wind/stapler badges cut to alpha.
- Side hazards only (blades/fans outside, stapler jaws top/bottom); debris never enters the hole.
- Wider passages, mid-band lanes (8/10/12), slower approach, edge grace, longer recovery/invuln.
- Headlines tell players to “fly the glowing ring.”

## 2026-07-18 — Chapter 2 + Stapler boss + boss fairness

- **Boss fairness:** longer warning/pressure windows; larger easy/normal/hard passages (hard ≥ 3.2 half-width); slower approach band; farther hazard clear; longer post-clear recovery + invuln.
- **Third boss · Stapler Gate:** cycles with scissors/wind; procedural jaws + art overlay; journey midnight/chapter-2 finale uses stapler.
- **Journey Chapter 2 · Desk After Dark:** sunset → midnight → stapler alley → desk showdown; unlock on Chapter 1 complete; v3 journey storage + migration; sunset/midnight postcard art.
- Verification: unit suite green; build/budget/iOS parity; production deploy.

## 2026-07-17 — Max Everything P0–P5

Design: `docs/superpowers/specs/2026-07-17-max-everything-design.md`
Plan: `docs/superpowers/plans/2026-07-17-max-everything.md`

### P0 Stabilize
- Landed pure modules: `combo-fever`, `star-streak`, `star-spawn` wired into flight loop + live upgrade fixtures.
- Soft first ranks for fever/streak/wealth; `estimateUpgradeTreeCost` covered.

### P1 Feel Max
- Near-miss tier float/HUD/confetti (`near-miss-feedback`), stronger fever enter juice, star-streak break banner.
- Guardian save flash + weapon ready pulse.

### P2 Architecture
- Extracted pure runtimes: `weapon-runtime`, `guardian-runtime`, `near-miss-feedback`, `upgrade-path` (spawn already modular).

### P3 Meta Max
- Hangar early-path banner + recommended card highlight.
- Prestige cosmetics: Ink Veil (P3), Starcrest (P5), Paper Legend (P10).
- Fever Pitch achievement + daily fever mission template.
- Fever+streak dual-max synergy (+0.35s fever duration).

### P4 Content Max
- Zone 6 **Midnight Origami** @ 1700m with generated sky/ground art.
- (Third boss / Journey chapter 2 left gated per design.)

### P5 Ship
- Full verification, commit, push, Vercel production deploy.

## 2026-07-16

### Upgrades proof, economy, modularization (items 1–5)

- Fever Focus / Steady Hands / Gold Rush extracted to pure modules (`combo-fever`, `star-streak`, `star-spawn`) and wired into the flight loop with HUD/text-state feedback.
- Live Playwright fixtures: `#test-upgrade-live-fever`, `#test-upgrade-live-streak`; max-upgrade text state asserts fever/streak/wealth.
- Economy: softened first ranks for fever/streak/wealth; `estimateUpgradeTreeCost` + early-path tests for the 14-upgrade tree.
- Scope guard tests: no new modes/bosses/currencies.
- Ship proof: vitest, build, budget, iOS parity, production deploy.

### Rebase + Hangar/HUD clarity (theme A)

- Rebased `codex/polish-passes-1-3` onto `origin/main` (safe storage, new Fever/Steady/Gold upgrades, bird density, building corridors, wind telegraph).
- Combined fairness: passage lanes + center-building corridor safety both retained.
- Hangar Progress/Meta filter (9 tabs preserved), denser mobile HUD (tertiary chips), run-summary CTA + **Spend ★ in Hangar** game-over path.
- Verification: 220 Vitest; production build + bundle budget PASS; iOS parity 102 files; focused Playwright hangar/gameover desktop lane green.

## 2026-07-13

- Approved design and implementation plan are committed on `main` at `3833219` and `8372527`.
- Created isolated worktree branch `codex/living-journey-expansion`.
- Baseline: `npm install` found 0 vulnerabilities; 22 test files and 64 tests pass.
- In progress: deterministic authored-plus-seeded encounters and Journey v2 migration.
- Remaining: mastery, runtime encounter adapters, objective/result UI, generated destination artwork, postcard album, browser automation, iOS parity, simulator/device proof, merge/push/deploy/fresh install.

### Implementation and browser proof

- `222e08f` deterministic authored-plus-seeded encounter director.
- `8500f11` Journey v2 migration and idempotent Milo/Pip mastery.
- `4cde544` runtime encounters, objective telemetry/HUD, pilot side-grades, and immutable outcomes.
- `7e75bb3` mastery-aware pilot and result UI.
- `53d0a34` four inspected ImageGen paper-diorama destination artworks and stable registry.
- `86f928b` postcard migration, reveal, detail, album, and share fallback.
- Browser proof: `output/web-game-proof/{city,harbor,storm,aurora}/shot-0.png` with matching `state-0.json`; all scenarios reported `mode: journey`, active objectives, triggered encounters, and no console-error artifacts.
- Computer Use proof: desktop Journey map/mastery cards, Aurora reveal, and scrollable postcard detail inspected in Chrome. Fixed raw internal cosmetic/route IDs after the first visual pass.
- Defect caught by text-state testing: dev-only invulnerability was briefly inserted in normal start; moved into hash-only test setup before release verification.
- Current proof baseline before iOS: 25 Vitest files / 89 tests passed; production Vite build passed; iOS parity previously matched 68 files after artwork integration.
- Final Playwright matrix: 17 passed across desktop and mobile, with 5 viewport-inapplicable cases intentionally skipped.
- iOS bundle regenerated and verified: 68 bundled files match the generated iOS distribution exactly.
- iPhone 17 Pro simulator: Xcode Debug build succeeded; fresh simulator install launched the full menu; Computer Use opened Living Journey, selected Paper City, and visually confirmed active gameplay with objective HUD, distance, power-up, obstacles, and touch controls.
- Generic physical-iOS Release build succeeded with automatic signing, the Apple Development identity, and the team provisioning profile.
- Physical device discovery currently sees Austin's iPhone 16 Pro but reports it unavailable; signed build and install will be retried at the final device lane.
- Remaining: merge/push, Vercel production deploy, physical iPhone fresh install.

### Balanced game polish — Task 2 takeover

- Preserved the inherited uncommitted lifecycle extraction on `codex/balanced-game-polish`; Task 1 remains at `4adbfc0` with its report at `a592fac`.
- Focused loader/first-flight/pause baseline: 3 files and 11 tests pass.
- Current split builds as a 66,899-byte initial entry and a 656,794-byte deferred flight-engine chunk; bundle budget passes at 723,693 total bytes.
- Full Playwright takeover baseline: 18 passed, 7 skipped, 1 mobile Journey deterministic-state failure. The test navigates to a hash-only URL after starting a run, so the browser can retain the live document instead of booting the intended test state; desktop happened to reach an encounter before crashing.
- Completed shell/engine listener ownership, failed-preload retry semantics, deterministic browser navigation, and the required verification matrix.
- Targeted lifecycle/Journey Playwright after the fix: 4 passed, 2 project-specific skips. Delayed preload used one engine request; aborted preload recovered on request two.
- Temporary web-game client proof: three inspected Classic-flight frames reached 14m, 28m, and 40m with leftward movement, matching text state, and no console errors; generated artifacts were removed after inspection.
- Final verification: 27 Vitest files / 94 tests; full Playwright 19 passed / 7 viewport skips; iOS parity 70 files; bundle budget 70,273 initial / 724,470 total bytes. No known code TODOs remain for Task 2.

### Balanced game polish — Task 2 review fixes

- Added a tested runtime seam for latest-layout selection and live settings/AR synchronization.
- Engine import failures remain retryable, while boot failures are tagged as reload-required and reuse one rejected promise so partial initialization cannot run twice in-page.
- Restored `journey_restarted` analytics in the shell and added browser regressions for current custom layouts, post-preload low-power/colorblind updates, AR permission rollback, and restart analytics.
- Focused Vitest is green at 2 files / 8 tests; production build succeeds. Playwright and final verification are pending.
- First affected Playwright run: 4 passed and the AR case failed only because `check()` requires the checkbox to remain checked; the app correctly rolled it back before Playwright's post-click assertion. The test now uses a plain click before asserting false state.
- Corrected affected Playwright lane: 5 passed. Full verification is green at 28 Vitest files / 100 tests and 22 Playwright passes / 10 viewport skips.
- Web-game client proof inspected three Classic-flight frames at 14m, 27m, and 41m; state tracked the plane moving right, runtime settings matched the visuals, and no console-error artifact was produced.
- A final focused browser rerun hit the default 45s timeout after WebGL startup/clicks consumed ~44s; the trace snapshot showed both settings correctly checked. Marked the heavier AR/WebGL smoke `test.slow()` and queued the exact lane again.
- The next serialized run cleared settings/AR but the two-play custom-layout smoke likewise exhausted 45s under current host load; marked that WebGL-heavy regression `test.slow()` as well.
- A subsequent rerun showed even the inherited delayed/retry HUD assertions exceeding their explicit 15s under sustained host load; extended those two WebGL startup assertions to 45s and marked them slow without changing behavior assertions.
- Final exact affected desktop lane passed all 5 tests in 52.8s after the timeout hardening.

### Balanced game polish — final proof and ship gate

- Final Vitest: 34 files and 175 tests passed.
- Final Playwright: 40 passed, 14 intentionally skipped by viewport, 0 failed in 6.5 minutes. Covered menu/Hangar navigation, exact upgrades, purchases and claims, desktop/mobile Plane Collection, deferred-engine retry, settings/AR rollback, custom routes, live upgrades, both readable boss phases, reduced motion, Journey, postcards, pause/resume, retry, mobile HUD, scrolling, and control persistence.
- Production build passed. Bundle budget passed at 80,356 bytes initial and 751,975 bytes total against the 819,200-byte limits.
- iOS bundle regenerated; all 102 bundled files matched the iOS distribution byte-for-byte.
- Representative proof in `output/web-game-proof/balanced-polish/` was inspected at original resolution: desktop/mobile Plane Collection, max shield/boost feedback, iOS menu, Journey map, and Journey routes.
- XcodeBuildMCP built, installed, and launched the exact final app on iPhone 17 Pro simulator with no build warnings or errors. The in-app simulator browser was used to tap from the menu into Living Journey and scroll its route surface.
- The signed final iOS 27 build succeeded with automatic signing, installed on Austin's paired iPhone 16 Pro, and launched as `com.sappgulf.paperplanerun`.
- Self-review found no TODO/debug leakage. Full branch `git diff --check` passes after removing two terminal whitespace defects.
- Remaining ship actions: commit proof, fast-forward `main`, push, production deploy, and production smoke.

### Balanced game polish — Task 5 silhouettes and preview

- Geometry RED failed on the required missing `src/plane-models.js` module; the extracted registry is now green at 4 tests across Classic Fold, Dart, Glider, and Stunt Fold.
- All four families expose positive normalized dimensions and the same `0.7` collision radius, with no runtime stat fields. The model builder retains `wingL`, `wingR`, `shieldBubble`, and `upgradeTrail` names.
- The live-preview browser RED failed on the absent preview surface. The deferred engine now owns the Three.js preview renderer, while the shell passes only a canvas and skin ID; portrait cards use the generated WebP assets.
- Focused plane/skin verification passes 2 files and 19 tests. Desktop/mobile visual inspection and the full verification matrix remain pending.
- Desktop/mobile Plane Collection capture rerun passed 2 tests in 35.3s. Both screenshots were inspected at original resolution: the equipped Coral Dart live model, generated portrait cards, refreshed wallet/status, and responsive mobile layout are all visible without preview clipping.
- The web-game client produced three inspected Classic-flight frames at 14m, 27m, and 38m; text state reports `classic`, collision radius `0.7`, and matching rightward movement with no console-error artifact.
- Final affected collection lane passed 4 desktop/mobile tests in 33.9s after marking the new WebGL-backed Hangar flows slow and excluding only optional `fonts.gstatic.com` resource errors from runtime-console assertions.
- Full Vitest is green at 29 files / 119 tests. The final full Playwright rerun was interrupted before its summary; fresh exact-diff iOS/build/budget verification remains a documented Task 5 concern.

## 2026-07-14 — Two new upgrades and Combo Fever polish

- Added `Fever Focus` (id `fever`, max 3, 18/34/58★) and `Steady Hands` (id `streak`, max 3, 14/26/44★) to the upgrade tree, wired end-to-end: `src/upgrades.js` formulas, `src/game/economy.js` cost table, `src/game/upgrade-runtime.js` shared `getFeverTuning`/`getStreakTuning` helpers (also expose the previously inline `FEVER_COMBO_THRESHOLD`/`FEVER_DURATION`/star-streak-window constants), and `src/flight-engine.js` runtime consumption in `registerNearMiss`/`triggerFever`/`registerStarStreak`.
- Fever Focus lowers the near-miss combo count needed to trigger Combo Fever (floored at 4) and extends Fever's score-multiplier duration. Steady Hands extends the star-streak pickup window before the chain resets.
- Gameplay polish: the combo HUD now shows a `🔥N` countdown once the player is within 3 near-misses of triggering Fever, so the payoff is legible in the moment instead of a surprise.
- Test coverage extended in place: `test/upgrades.test.js` (contract labels/values/effects), `test/upgradeRuntime.test.js` (runtime snapshot assertions + a dedicated Fever Focus floor test), and `e2e/smoke.spec.js` (both Hangar contract-card and prestige-cap-requires-everything-maxed lanes now include the two new upgrades).
- Verification: `npm test` 34 files / 180 tests passed; `npm run build` and `npm run build:ios` succeeded; `npm run verify:ios-parity` matched all 102 files; Playwright Hangar lanes re-verified against the exact new upgrade contracts.

## 2026-07-14 — Gold Rush upgrade (star cluster odds)

- Added `Gold Rush` (id `wealth`, max 3, 16/30/50★, icon 💰) to the upgrade tree: raises the base star-cluster spawn chance (`doubleStarChance` in `getSpawnRates`, `src/game/upgrade-runtime.js`) independently of and stacking with Lucky Scrap's multiplier, so it's a genuinely new economic lever rather than a reskin of Luck.
- Wired through `src/upgrades.js` formulas/effects, `src/game/economy.js` cost table, both `getSpawnRates` call sites in `src/game/upgrade-runtime.js`/`src/flight-engine.js`, and the usual contract tests (`test/upgrades.test.js`, `test/upgradeRuntime.test.js` including a dedicated stacking test, `e2e/smoke.spec.js` Hangar contract-card and prestige-cap lanes).
- Verification: `npm test` 34 files / 183 tests passed; `npm run build` and `npm run build:ios` succeeded; `npm run verify:ios-parity` matched all 102 files; Playwright Hangar upgrade-card lane re-verified against the new contract.

## 2026-07-30 — Visual + gameplay pass

- Read the requested frontend, browser, web-game, and game-foundations skills; retained the existing Three.js runtime and its pure simulation helpers.
- Baseline IAB inspection: menu is visually strong but vertically crowded at 1280×720; live Paper City flight has pale sky/ground contrast and a restrained HUD while the plane/hazards remain readable.
- Baseline deterministic client: `output/web-game/shot-0.png` through `shot-2.png` with matching `state-0.json` through `state-2.json`; state advanced classic flight from 5m to 29m with hazards/stars/power-ups present and no game-state errors.
- Generated visual direction concept: `/Users/austinbeatty/.codex/generated_images/019fb5cb-1158-79e2-bda1-eb27973bb835/exec-9ed3b51a-cad9-4d0b-bedb-4c6e6cfa2fcd.png`.
- Design spec: `docs/superpowers/specs/2026-07-30-paper-plane-visual-game-pass.md`.
- Implemented the visual pass: brighter Paper City contrast, warm paper tokens, coral journey CTA, compact short-desktop/mobile menu layouts, responsive route strip, and a projected focus ring that calls out the nearest hazard/pickup.
- Added route/focus DOM surfaces in `index.html`; non-playing states now hide them immediately so crash summaries and the main menu stay clean.
- Accepted concept and latest desktop/mobile implementation screenshots were inspected at original/high resolution. Native viewport checks covered 1280×720 and 390×844; mobile has no horizontal overflow and the Pilot field remains inside the viewport.
- IAB flow verified: menu → Journey → safe route → live flight → keyboard input → crash summary → main menu, plus Hangar → Planes → main menu → Classic. IAB showed the route/focus HUD during flight and no route/focus layer on the crash summary.
- Deterministic web-game client and native Playwright visual smoke passed with hazards, stars, power-ups, distance advance, movement, route/focus visibility, and mobile joystick coverage.
- Verification: Vitest 51 files / 250 tests passed; production build passed; bundle budget passed at 89,724 initial / 783,507 total bytes; iOS build and parity passed with 114 matching files.
- Full Playwright matrix completed at 42 passed / 15 intentional skips / 3 desktop failures under two-worker WebGL load. The Hangar purchase and Plane Collection failures pass when isolated; the boss lane exposed and fixed a real Wind-gate `halfHeight` lookup bug, while its stale passage/timing assertions were synchronized to the canonical `4.0 × 3.7`, `1.5s + 1.5s` director contract. The three affected desktop lanes then passed together serialized (3/3).
- Final gates after the boss fix: Vitest 51 files / 250 tests, production build, bundle budget at 89,724 initial / 783,522 total bytes, iOS build, and 114-file iOS parity all pass.
- Removed the temporary `scripts/visual_pass_smoke.py` harness; the permanent Vitest, Playwright, and web-game clients remain unchanged.

## 2026-07-30 — Asset, route, feedback, and runtime split pass

- Generated and integrated two paper-craft assets: `public/assets/paper-world-backdrop.png` for menu/Journey/game-over surfaces and `public/assets/zone-stamp-sheet.png` for code-addressable Journey reward stamps.
- Added `src/game/zone-stamps.js` with stable zone-to-sprite mapping, route-risk copy, and stamp labels; added unit coverage for Chapter 1 and Chapter 2 fallback palettes.
- Journey route cards now show zone stamps; the live route strip shows the current zone, `SCENIC`/`SHORTCUT` risk multiplier, pending/earned stamp state, zone accent, and the route progress bar. The route strip is synchronously hydrated at flight start so lazy engine startup never exposes an empty label.
- Added a feedback ribbon and impact pulses for near-misses, star pickups, powers, shortcut forks, boss warnings, gate clears, zone transitions, and crash/route-complete states; added dedicated Web Audio cues for shortcut gates, gate clears, boss warnings, and zone transitions.
- Split Three.js into a cacheable `three-runtime` chunk with Vite 8/Rolldown code splitting. Production output is now a 91,071-byte initial entry, 122,760-byte flight-engine chunk, and 572,030-byte Three runtime; total JS remains 785,868 bytes under the 819,200-byte budget.
- Verification: Vitest 52 files / 253 tests passed; production build and bundle budget passed; iOS build/parity passed with 117 matching files; the new Journey browser contract passed on desktop and mobile, and the corrected serialized desktop menu/Journey lane passed 2/2. A full two-worker Playwright run completed 45 passed / 15 intentional skips; its two desktop failures were the pre-adjustment seeded-objective assertion and the known concurrent startup race, both cleared by the serialized affected rerun after the final test fix.
