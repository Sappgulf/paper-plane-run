# Paper Plane Run — Living Journey Expansion

Original prompt: “1-3! Use skills needed, imagegen, computer! Build, test and polish! When finished push and commit! Then deploy to vercel!” Direction approved: “Balanced hybrid!” Final authorization: “I approve get it done!”

## 2026-10-29 — Tuck input and feedback

- Track Space and Enter separately on the focused Tuck button, clearing its keyboard holds when focus leaves. This prevents a stuck dive and preserves another held key. Added a distinct held-state color for immediate flight feedback.
- The targeted keyboard regression failed before the fix and passed after it, including against the production bundle. The affected development browser pass had 29 passes, 14 skips and a startup timeout; the pause test passed on an isolated rerun. A dedicated iPhone 16 Pro simulator built and ran the updated app. Web and iOS builds and asset parity passed.
- The host stalled while starting the full unit suite; the 10 directly affected Tuck unit tests passed on isolated retry.

## 2026-10-29 — Two-finger flight and tutorial polish

- Keep a Tuck held until its own pointer ends, even when a steering finger is lifted; keyboard button holds remain independent and pause/blur reset the inputs. The tutorial now names the selected steering control and presents touch-specific Tuck guidance.
- Center the tutorial entrance animation and report the displayed lesson in the text game state. Captured and inspected a tutorial flight on a dedicated iPhone 16 Pro simulator, including the Tuck lesson and pause/resume.
- Verified 754 unit tests; the affected development browser suite had 43 passes, 13 skips and two local-server interruptions, both passing on isolated rerun. The production phone suite had 8 passes and 4 development-only skips, including a real two-contact gesture. Web bundle budget and iOS parity passed; a signed iPhone Release build compiled.

## 2026-10-29 — Live leaderboard and touch audit

- Verified real Classic flights on the production web app and the iPhone simulator: both submitted and displayed their exact scores on the Global board. Removed only the two disposable test scores and their tickets. Fixed the loading message persisting above fetched scores.
- Kept tutorial guidance clear of the resting touch controls, made pause guidance appropriate for touch, and sized editable touch fields to prevent iOS focus zoom and cropped menus.
- Verification: 753 unit tests passed; seven additional isolated Redis integration tests passed. The development browser matrix had 123 passes, 41 intentional skips and two dev-server interruptions; both interrupted cases passed on isolated rerun. Five new touch-navigation tests passed separately. The production browser matrix passed 59 tests with 117 intentional skips. The web bundle budget and iOS web parity passed, and the iPhone 18 Pro simulator build launched and exercised a real flight.
- Practical score validation rejects malformed and grossly implausible submissions but cannot prove honest play. The iOS simulator build is not a signed App Store distribution.

## 2026-10-29 — Persistent leaderboard

- Replaced instance-local boards with Upstash Redis; all-time, daily and weekly scores are isolated by difficulty and the run's starting UTC period. A one-use run ticket, current route seed, integer bounds, conservative elapsed-time limits and a shared per-IP rate limit reject malformed and grossly implausible submissions. They do not prove honest play.
- Identical retries are idempotent, including recovery from partial writes. The app reports online submission status and falls back to device scores for daily and weekly reads when the service is unavailable.
- Verified the complete unit suite, real Redis persistence across processes, concurrent and partial retries, ranking, rate limits and week boundaries; an isolated flight-to-Redis browser test; desktop/mobile save, failure and UTC-boundary flows; production bundle, budget and iOS web parity. The free Redis plan has automatic upgrades and eviction disabled. Old instance-local scores cannot be migrated; existing native installations need an updated bundle.

## 2026-10-29 — Release audit and flight feedback

- Cleared magnet feedback when a flight ends or returns to the menu; the menu regression failed before the fix and passed on desktop and mobile afterward.
- Clarified that Journey cards launch their routes, corrected their button semantics, and labeled the leaderboard's device and temporary online sources. The online leaderboard still needs durable shared storage and score validation.
- Updated Vite and Vitest to patched compatible versions; `npm audit` reports zero vulnerabilities. The production Journey smoke test now runs instead of skipping its production branch.
- Verified 748 unit tests, web build and bundle budget, iOS bundle parity, and an iPhone 18 Pro simulator build and launch. The development browser matrix had 111 passes, 39 intentional skips and two failures; both failures passed individually (one module-load timeout, one artifact collision from a concurrent rerun). Production menu, Journey and leaderboard checks passed 5 with 1 viewport skip.
- GitHub Actions jobs are blocked by the account billing lock; they did not run. The global leaderboard remains best-effort serverless memory, not a durable or authoritative shared board.

## 2026-10-20 — Flat street decals stopped standing up as cream walls

Direction: "Another round." The art item the notes had carried for several rounds was a blank cream wall beside the road in the City view. It was never identified, and the earlier attempt to name it was wrong.

- **Root cause:** the flat ground decals (City street seams, Harbor wave caps and tide marks, and every other flat species) were rotated with Euler's default XYZ order: `rotation.set(-π/2, yaw, 0)`. XYZ applies the yaw before the tilt, so any decal with a yaw leaned, and some stood nearly upright. The City street seam stood up as the windowless cream slab beside the road.
- **Fix:** flat decals use the YXZ order, which tilts first and then yaws about the world up axis. The fix covers both placement paths in `src/flight-engine.js`, the moving one and the static one. Road and car placement set XYZ explicitly, so nothing else changes.
- **Test:** `test/ground-decal-orientation.test.js` checks that a flat decal's normal stays vertical for 64 yaw values under YXZ, and documents that XYZ tilts it.
- **Checked:** City and Harbor frames at 1280×720. The seams and wave caps now lie on the road and the water.
- **How it was found:** a visibility bisection in the deterministic capture harness. Hiding the ground-life families removed the slab, and hiding the street-seams family alone removed it too.
- **Ruled out on the way:** the vista house (its windows were added and then reverted, since the slab was not the house), the rooftop pennants, the crates, the buildings, the sprites, the sky dome and the landscape ridges.

Verification:
- Vitest: 102 files, 748 tests passed (was 101 files, 745 tests).
- Dev Playwright lane (150 tests): 111 passed, 39 skipped, 0 failed. It ran on two workers, because three workers stalled on the six-landscape test under load.
- Production Playwright lane (`npm run test:e2e:prod`): 49 passed, 101 skipped (dev-hook suites), 0 failed.
- Production build and bundle budget: 947,634 of 983,040 total bytes, initial 150,160 of 163,840. PASS.
- iOS web bundle: `build:ios` ok, `verify:ios-parity` 26 files match exactly.
- Frame rate on the City fixture: 60 fps on both the previous commit and this one, so the decal change adds no rendering cost.

## 2026-10-20 — Hawks stoop: a telegraphed lock, a committed dive, and a lane the gap cannot close

Direction: "another round! Then push commit and deploy." The stoop was the open proposal from the last round, so this round builds it under the same rules: the gap guarantee holds, every warning has a visible tell, and nothing is judged without a probe.

- **Hawk stoop** (`src/game/hawk-stoop.js`, wired into `animateHazards`). A hawk that spots the plane from beyond 72 m rears up, locks onto the lane the plane is in, and stoops at it. The beats are timed by distance ahead, not by the clock: the lock begins at 72 m, the stoop at 30 m, and the hawk is on its lane as it crosses the plane. A hawk first seen closer than 72 m never stoops.
- **Telegraph:** the lock is the first beat. The hawk's ground shadow slides to the lane it will hit, which puts a cue on the street. Its sprite rears up by up to 35 % and settles as it dives, its warning ring grows, and a paper rustle plays. The sprite only grows far from the plane, so the enlarged art never sits inside the hit envelope.
- **Fairness:** the lane comes from `stoopLockX`, the same gap clamp as every other hazard motion, applied to the hawk's full envelope (pattern drift and shiver included). A stoop can reach a plane that has left the gap. It cannot close a gap the plane is flying through. A property test sweeps gap centres, anchors and plane positions.
- **Hawks no longer lean.** The dive lean now belongs to biplanes only, because a stoop replaces it for hawks and the two lateral clamps cannot stack.
- **Judgment calls:** the lock starts at 72 m, not earlier. At 60 m a hawk is a sprite a few pixels tall, so the stoop (30 m) is the clear beat and the lock is the subtle first beat. The ground shadow marks the lane, which keeps the early beat readable on the street.
- **Dev fixtures:** `#test-hawk-stoop` puts the plane outside the gap, and `#test-hawk-stoop-gap` puts it inside. Both fixtures pause the real-time loop, so a test that is still booting cannot carry the hawk past its lock.
- **Tests:** 13 unit tests in `test/hawk-stoop.test.js` and 2 browser tests in `e2e/gameplay.spec.js`.

Probes (DEV build, the same 21,600-frame runs as the last round):
- Autopilot, six seeds: four deaths, with two seeds flying to the frame cap. One death was by a hawk, against none in the last round. The mean went from 20.9 km (origin) to 19.3 km (last round) to 22.2 km (this round). The spread between seeds is far larger than any of those shifts, so I read them as noise.
- Hands-off, six seeds: identical to origin on every seed, with the same two hawk deaths. The hands-off plane sits near the gap centre, where the lean was already clamped to zero, and most of its hawks spawn inside the arming distance.

Verification:
- Vitest: 101 files, 745 tests passed (was 100 files, 732 tests).
- Dev Playwright lane (150 tests): 111 passed, 39 skipped, 0 failed, including the two new hawk tests on desktop.
- Production Playwright lane (`npm run test:e2e:prod`): 49 passed, 101 skipped (dev-hook suites), 0 failed.
- Production build and bundle budget: 947,592 of 983,040 total bytes, initial 150,160 of 163,840. PASS.
- iOS web bundle: `build:ios` ok, `verify:ios-parity` 26 files match exactly.

## 2026-10-20 — Enemies that telegraph: ground shadows, flinches, dive leans, and loaded boss gates

Direction: “get all of the gameplay better than ever, like AAA gameplay … flight engine upgrades, enemies … assets, test it … push, commit and deploy.” This round took the enemies, the bosses and the sky's readability, plus an asset and layout QA pass. The flight model was reviewed and left alone (see the judgment calls below).

- **Ground shadows under airborne hazards** (`src/game/hazard-shadow.js`, `hazardShadows` in `src/flight-engine.js`). One instanced mesh with 48 slots draws a soft blob beneath every bird and scissors below the 13 m ceiling. It spreads as the flyer climbs, so its height reads from the street, and it switches off with the other secondary effects at `low` quality.
- **Near-miss flinch** (birds only). A flyer the plane squeezes past jolts sideways for 0.7 s and flaps faster. The jolt moves the card's local offset, so the hit envelope and the lethal ring stay put.
- **Dive lean** (`src/game/dive-lean.js`). Biplanes and hawks on the dive pattern drift toward the plane's lane during the lower half of each dip. The lean is capped by the wave's own gap through the existing `clampAmplitudeToGap`, so a diver never closes the gap it was spawned beside. A property test sweeps gap centres, anchors, plane positions and dive depths.
- **Boss gates load before they strike** (`src/game/boss-choreography.js`). Warning: blades, jaws, press heads and fans sit open and slow. Pressure: they close in with the meter. Final pass: a 0.35 s snap, then the closed pose. Every press is clamped at the passage lip, blade tilt is capped at ±0.18 rad, and reduced motion holds one still pose.
- **Launch menu fits on short screens.** On main, the launch card at 1280×720 ran 22 px past the fold, so Flight Guide was off screen. On the touch project, landscape 844×390 and 320×568 pushed Hangar and Flight Guide below the fold too. A short-desktop rule and tighter touch-regime gaps fix all four sizes on both projects, with a seeded returning-player journey present.
- **Flight Guide focus test.** It failed once in the full dev lane: a tap was lost while the dev server was still transforming modules. The open now retries until the dialog answers. It passed three of three alone before the change and two of two after.
- **Stale boss clear expectation.** `smoke.spec.js` expected 5★ after a scissors clear. The center-thread bounty (+2★, added 10-19) makes 7★ correct for the dead-centre fixture, so the test now says why.
- **Tests:** 27 new unit tests (8 hazard-shadow, 12 boss-choreography, 7 dive-lean) and 2 new browser tests in `e2e/gameplay.spec.js` (shadows, boss pose ordering).

Judgment calls and what I did not do:
- Flight handling (banking, glide, tuck, skim) is unchanged. In the probes every death was on screen when it happened, which is what the forensics round was for, and the skim band did not dominate as a strategy.
- I dropped a telegraphed hawk stoop (a committed lunge at the plane) as too risky to tune without a playtest. The dive lean covers the "enemies react to you" idea inside the fairness rules.
- Boss passages, pacing and the star economy are unchanged apart from the test correction above.

Probes (DEV build, a scratch Playwright harness kept outside the repo, the same six seeds and 21,600 frames on both sides): autopilot mean 20,896 m → 19,312 m (median 15,665 → 16,929 m), which sits inside the seed-to-seed spread; hands-off mean 2,893 → 2,878 m, with one seed changed. All 11 deaths were on screen when they happened. Six seeds is a small sample and the autopilot is not a human player, so treat these as regression checks rather than balance evidence.

Verification:
- Vitest: 100 files, 732 tests passed (was 97 files, 705 tests).
- Dev Playwright lane (146 tests): 108 passed, 37 skipped, 1 failed before the Flight Guide retry. The retry and the two comment fixes landed after that run; the flight guide test then passed on both projects.
- Production Playwright lane (`npm run test:e2e:prod`): 49 passed, 97 skipped (dev-hook suites), 0 failed.
- Production build and bundle budget: 945,298 of 983,040 total bytes, initial 150,160 of 163,840. PASS.
- iOS web bundle: `build:ios` ok, `verify:ios-parity` 26 files match exactly.
- Asset check: the production build served without a failed request or console error on desktop and phone-sized flights.

## 2026-10-19 — Round: gates that read, an opening that never starves, and the protections pinned

Direction: “another round!” Four subagents ran in parallel (gate meshes, opening pacing, seasonal art, e2e coverage); the pacing wiring and verification ran inline.

- **Boss gate meshes read at a glance now** (twice-deferred item, `src/flight-engine.js`): every gate ring is two-tone cut paper — a lit band and a shaded inner rim tiling the old single band — plus a hard ink outline parked just behind the face, sized so it never enters the hole (inner edge 0.945·scale vs hole edge 0.9·scale). Scissors blades lost their white-stick look (deeper stock, wider fold, an ink base strap and a world-tilted ink edge tracing the taper); wind fans recut in a stronger blue with doubled ink offsets and ink-backed debris; stapler jaws went navy with an ink band along the teeth; punch heads got an ink rim tube and ink-backed confetti. Passage dimensions, timing and collision untouched (e2e-pinned 4.8×4.4 re-verified live in the capture probe). Screenshots: `output/gate-{scissors,wind,stapler,punch}-{portrait,desktop}.png`.
- **The opening can no longer starve** (the 0–85% by-seed swing in empty sky over the first 240m). Root cause: the `distance < 90` early-calm gate turns off hazard picking for every chunk spawned in the band, leaving only the blind ~10% mixed-flyer coin — a seed that misses ~10 draws opens dead for up to 310m while another opens busy. `pacing.js` gained two pure APIs: `planOpeningPresence` (a scheduled flier in [45,80]m, repeat slots ≥ [70,115]·gap, and the gate's final chunk takes a straddled slot so the opening block can never finish empty; past the gate, a famine guard fires when the sky has been hazard-free for 55m) and `getOpenChunkWeight` (the flat 0.42 open share drains toward 0.04 only during a famine, so mid-run empty pockets can't compound). Wired into `spawnChunk` with `lastHazardDistance`/`lastOpeningHazardDistance` tracked per run (reset in `resetGame`); Journey legs and the tutorial stay authored. Measured over 720 seeds × 3 difficulties: every 240m window in the first 500m keeps ≥3 flier-chunks and never >24 (shipped max 17); worst-case opening calm collapsed 310m → 78m; presence mass 1.144× of shipped.
- **Seasonal and leftover art:** the Halloween bat is re-cut into the dove family (swept membrane wings with the dove's scallop notches, round ear bumps, folded body with crease); the snowflake and heart re-cuts were verified good and left; wasp wings lost their horn comma for slim straight swept blades; the stapler emblem's mouth is now a hard navy shadow sheet with a tripled amber staple, so it reads at 44px. Galleries: `output/seasonal-{before,after}.png`, `output/stapler-sizes-{before,after}.png`.
- **The new protections are pinned in e2e** (four tests in `e2e/gameplay.spec.js`, three consecutive green runs each): the boss hole chevron lights on a portrait phone when the hole leaves the frustum (it is correctly mobile-only — the landscape frustum at the gate plane is ~74 units wide, so desktop never arms it); the camera pullback eases to the boss and back to exactly −8 with no boss; a hazard centred behind the plane is a pass (`?collision=tail`) while dead-centre still kills (`?collision=hit`); tucking under the ground-warning band forces the release cue and clears it on release. Two suite hardenings came out of it: `waitForGameText` survives Vite's mid-boot reload, and fixture boots re-navigate until the fixture is live (`openFixture`/`withEnvRetries` in `e2e/smoke-helpers.js`) — the engine scrubs `?query`/`#hash` after first boot, which could otherwise strand a test on a plain menu.
- **Fixture correction:** `#test-upgrade-live-spawn` boots at 120m now — its 32 pre-spawned chunks were spawned at frozen distance 0, where the early gate legitimately spawns nothing under the new scheduler; the diorama now stands for the pacing regime it tests.
- Not done: banner exit-fade remains skipped (banner-stack ResizeObserver jitter risk out of proportion); the media-scoped adaptive cta blocks stay; opening-calm tuning beyond the drought bound is deliberately conservative.
- Verification: Vitest 675 tests passed (93 files, 8 new pacing seed-sweep tests); production build passed; bundle budget 927,499 of 983,040; iOS web parity 24 files; native Debug build succeeded; Playwright development lane 105 passed / 35 intentional skips / 0 failed; production lane 49 passed / 91 intentional skips / 0 failed.

## 2026-10-19 — Death forensics: the invisible killers found and fixed; enemies and bosses re-cut

Direction: “im still crashing into nothing test gameplay front to back, improve flight engine, figure out whats crashing me that i cant see, fix enemies including bosses they look like shit … spawn 4 sub agents … when finished push and commit and deploy to vercel.” Four subagents ran (diagnostics, enemy/boss art, story/meta, engine fixes); verification and shipping ran inline.

- **The data** (68 probe runs — 8 seeds × easy/normal/hard × hands-off/autopilot/dipper, plus daily/weekly; `output/death-probe.mjs` + `death-probe-results.json`): 41 deaths, and **46.3% had an invisible or unreactable killer**. The big one: **39% of all deaths were boss-gate kills with the entire gate assembly off-screen** — the portrait half-frustum at the gate plane is ±3.8–4.0 world units while the safe passage is ±4.75–5.35, so the hole the player must fly is wider than the screen the camera shows. Second: flyer flash-kills — a scissors killed with 1 visible frame at 65 m/s, and one kill at zGap −0.78, i.e. the hazard's centre already *behind* the plane's. Third: a tuck-dive through the skim band hit the deck in under a second from the warning height.
- **Forensics instrumentation** (DEV-only, `src/flight-engine.js`): every death path now records `window.__paperDeathCause` — the ground death records plane speed/bank/tuck/skim state; flyer and boss records gain `killedOnScreen` (frustum test at the kill frame), `planeSpeed`, `fogFar` and `distance`.
- **Engine fixes:**
  - **Boss approach camera pullback:** while a gate is ahead the chase camera eases to 1.55× its follow distance (both the camZ target and the `cameraFlightDistance` clamp — the clamp dominates on portrait) plus a 1.4-unit lift, at the same easing idiom the rig already uses. No-boss flight is byte-identical. Measured on portrait: killer gate containment improved from |ndc.x| 1.31–2.55 to 1.05–1.85.
  - **Boss hole chevron:** the gate hole now flags the screen edge through the existing edge-threat elements when its projection sits outside the frustum (from 0.92 NDC), shaded by proximity, outranking any far bird on that edge; it hides once the gate is committed or cleared. Verified on the phone viewport: plane drifted to screen-left → right chevron at 0.74 opacity while the ring edge entered the pulled-back frame.
  - **Flyer kill window:** the lethal test now requires the hazard ahead of or just at the plane (`dz > -0.3`, window mirrored from the boss) — a hazard already behind the centre can no longer end a run, and the frame-step math at 74 m/s cannot skip the window. Near-miss window unchanged.
  - **Speed-scaled spawn depth:** `flyerSpawnZ()` clamps every flyer placement to at least `speed × 0.45` ahead of the plane and never past the fog-readability depth, wired into all seven flyer placement sites.
  - **Tuck ground cue:** tucking below 4 units forces the release cue styling and plays the telegraph ping once (re-armed after), so a deep tuck near the deck cannot miss the warning.
  - `configureDevUpgradeProof` no longer wipes stored ranks when no `?upgrade-proof=` param was given (probe-hostile only, DEV-only).
- **Enemies and bosses re-cut** (player verdict: “look like shit” — agreed, the before-shots show a moustache-shaped bird, a head-on H of a biplane, a torch-shaped wasp, a moth-shaped dragonfly, a steering-wheel wind boss, a blob punch): bird is now a gliding dove with head, beak, folded body, scalloped wings and fanned tail; biplane is the iconic side view with stacked wings, struts, nose and prop; wasp has head, antennae, striped abdomen and stinger; dragonfly four X-wings, pin body, round eyes; the hawk gained a hooked beak. Every hazard facet now carries fibre grain (deterministic per piece). Boss emblems: wind is a proper curved-vane turbine, the stapler's head overhangs its anvil leaving an open mouth with the amber staple firing, the punch is a real twin-press hole punch with a swung lever, and the badge plate gained a heavy ink frame, hard offset shadow, folded corner and grain; the in-world top badge grew 3.7 → 5 units. Scissors left as-is (it already read). Before/after galleries in `output/art-{before,after}-{hazards,bosses}.png`.
- **Story:** three lines fixed in `src/journey-story.js` — the storm arrival no longer says “Through” when the safe route went around, the scrapyard risky route no longer steals the finale's stapler-jaws beat (it flies fog and open scissors instead), plus an Oxford comma. All 44 authored lines swept: no duplicates, no placeholders, no phantom mechanics.
- **Boost and upgrades verified in flight** (probe numbers): boost sustains a **1.17–1.20× speed hold for ~3.2s** after a 0.45s ramp and 0.8s drain — 37/39 grants confirmed, avg +11.2 m/s. All 11 observable upgrades verified end-to-end (gust shove 0.55×, warning 1.2→2.1s, fog 1.36×, skim +3★/tier, near miss +3m, combo 2.05→2.80s, gate 5★→11★, fever 8→5 threshold, streak 2.2→3.4s, wealth +49% stars, luck +36%/+38%).
- **Fun/read observations (not tuned):** hands-off runs average 867m and die exclusively at boss rings — the rings are the only mandatory skill check, which the pullback + chevron now make readable. Opening density swings hard by seed (0–85% empty sky in the first 240m) — a future tuning candidate, not changed.
- Not done: the boss gate *meshes* (hoop, posts) are still pale against bright skies — the bigger badges and chevron carry the read; a mesh-tone pass is the next candidate. Seasonal bird re-cuts (bat/snowflake/heart) untouched.
- Verification: Vitest 667 tests passed (93 files); production build passed; bundle budget 925,658 of 983,040; iOS web parity 24 files; native Debug build succeeded; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 49 passed / 83 intentional skips / 0 failed. Death-probe re-run after the fixes: flyer never-visible deaths 0, median flyer read time 60 frames (~1s), median death distance 1888m.

## 2026-10-18 — Budget raised to 960 KiB, then a flight/art/menus polish sweep

Direction: “upgrade budget, then lets improve everything in the game further, flight, assets etc, all menus.”

- **Budget:** total JavaScript raised 900 → 960 KiB (983,040 bytes) with the rationale in the script: at 20 upgrades, four trees and two Journey chapters the old limit left under 2KB — a hard stop, not a working budget. 960 KiB uncompressed is still ~275 KB gzipped on the lazy engine chunk. The critical-path budget stays at 160 KiB; the menu must keep painting fast. This round spent ~2.5 KB of the new room.
- **Flight feel** (all in `src/flight-engine.js`, found by a parallel survey):
  - The tuck now lights the wingtip wisps: the check tested `tuckState?.diving`, a field that does not exist, so the trail documented as “active at tuck dive” never fired. It tests `tuckState.phase === 'tucking'` now.
  - A gust lands with feeling: when the telegraph expires the push now plays the unused `audio.paperPush()`, fires `Haptic.wind()` again, and gives the camera a small punch (`shake ≥ 0.08`).
  - The telegraph is physical: during the whole warning the streak pool drifts faintly in the push direction (`pendingWindForce × 0.3`), so “Gust pushing left…” is visible before it is true.
  - A blown-tuck *save* is no longer silent: the SAVED branch (clean === false) plays a soft tone and a tap haptic; the clean branch keeps its full payout fanfare.
  - Bosses announce correctly: the wind boss keeps its whoosh; scissors, stapler and the Punch get the harsher `audio.bossWarning()` their commit phase already used.
  - Gust streaks are paper flecks now — a hard-edged triangle shard instead of a box bar — and the shared material fades in and out over ~0.15 s instead of popping (pool-wide fade; one material, no clones).
- **Assets** (art rule: fibre grain + fold crease + hard shadows):
  - Building walls carry a fold crease across the wall plane (between window rows, never across glass) and a dark 2px ink plinth under the skirt highlight — `paper:wall:<zone>` in `src/game/paper-world-art.js`.
  - Vista houses show windows on the ±x faces the camera actually passes at x = ±44, not just the −z face (`src/paper-vista-models.js`).
  - Mountains, ridges and vistas ride one shared paper-grain texture (128² canvas, planar UVs projected onto the un-UV'd terrain geometry) — the largest colour planes on screen follow the grain rule for exactly one texture, inside the scene-cost caps (`src/paper-landscape-renderer.js`).
  - Cars break the front-to-back glass stripe with front/rear pillar strips and a stock-colour fold seam across the hood (`src/paper-car-models.js`).
- **Menus** (44px touch contract + purge):
  - Flight corner buttons (pause/mute) reach 44px on coarse pointers even in phone landscape, where the clamp used to floor at 32px.
  - Difficulty and control buttons are honestly 44px on touch now: the later 40px override was bumped and the two setup rows pay for it out of the actions grid's row gaps, so the menu column height stays put. “menu actions fit” gained a coarse-pointer height assertion on the touch project.
  - The death-screen polaroid lost its blurred shadow for a hard `3px 4px 0` ink offset — the last blurred shadow on a game-over card.
  - The service-worker update banner button is a 44px target.
  - Dead theme layers purged after verifying each supersession in the cascade (flight → screens → journey → adaptive → club): the menu card's blurred `backdrop-filter` and blurred shadow, the first cta-main paint block (its layout properties stay; club.css re-paints), the first `.tab.active`, the first `.u-buy` paint (its `min-height` floor stays live), the adaptive focus-ring block and orphaned `--focus-ink`, and the skin-card focus ring. Two media-scoped adaptive cta blocks were left alone — provably dead but too cheap to be worth the risk.
- **Style tree:** Fan Mail (+1m per near miss per rank) and Patient Fold (combo holds +0.25s per rank) landed in the previous commit on a clean tree, then this sweep ran on top; the redesign Style-filter count is now 4.
- Verification: Vitest 667 tests passed (93 files); production build passed; bundle budget 922,378 of 983,040; iOS web parity 24 files; native Debug build succeeded; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 49 passed / 83 intentional skips / 0 failed. Screenshots inspected: city, harbor, sunset scenes, mid-flight with the boss ring, menu at 1280 / 320 / 844×390.

## 2026-10-18 — Fog Lens and Skim Purse, and the boss-gate payout proven in flight

- **Fog Lens** (Survive, 3 ranks, 12 / 22 / 38★) draws foggy skies back 12% farther per rank. The zone/twist fog expression moved into one `zoneFogFar()` helper read by every fog reset, and the Journey visibility pocket multiplies by the same `fogDistanceMul` (`src/flight-engine.js`). Thick fog stays thick (`fogIsThick()` threshold unchanged, and the pocket at max rank still draws in under 150), so hazard warning rings keep working; the hazard spawn band already derives from `fog.far`, so fairness holds as the readable world grows.
- **Skim Purse** (Score, 3 ranks, 14 / 26 / 44★) banks one extra star per rank at every skim tier-up. The payout math lives in the pure module — `advanceGroundSkim` takes `tierBonusStars` and folds it into `bankedStars` and the banner (`src/game/ground-skim.js`) — and the flight passes the purse rank through (`updateGroundSkim` in `src/flight-engine.js`). The run summary's Banked figure rides the same number.
- **Trees:** the catalog is now 20 upgrades and 69 ranks. Survive holds 18 ranks and Score 27.
- **Balance guard:** the first ranks of all 20 upgrades total 289★, about 41 normal runs at 7★ a run; the guard now allows 42 (was 40), with the reason in the test.
- **In-flight verification, closing last round's open item:** Gate Bounty's extra stars were never verified in flight. The boss-pass fixture run with Gate Bounty 3 now clears the scissors gate at 11★ with the banner `✂️ Boss cleared · +11★` (control run: 5★). A new dev fixture `#test-upgrade-live-skim` holds the plane inside the skim band with the spawn pump parked; the control run banks exactly the tier (1★, 2★, 3★) and the purse-max run banks tier + 3 (4★, 5★, 6★). Fog Lens measured in flight: zone fog 320 → 435 at rank 3. The debug surface gained a `fogFar` field (`render_game_to_text`).
- **e2e lesson, recorded in the spec:** hash-only navigations reuse the running engine, so a fixture hop that only changes the hash silently drives the previous fixture. The new in-flight proofs pass a distinct query on every hop (`?proof=…`).
- Not done: the Style tree still holds only Wide Wings and Paper Trail; cloud tint and the unidentified cream wall remain open. Bundle headroom after this round is 1,743 bytes — the next JavaScript addition needs the same decision as before.
- Verification: Vitest 663 tests passed (93 files, 6 new); production build passed; bundle budget 919,857 of 921,600 total bytes; iOS web parity 24 files; native Debug build succeeded with the synced bundle; Playwright development lane 100 passed / 31 intentional skips with one tutorial flake that passed twice on rerun (load flake under full-lane machine load, the documented pattern); production lane 49 passed / 83 intentional skips / 0 failed. Subagent tooling was unavailable this round (expired API key), so the survey and implementation ran inline.

## 2026-10-15 — Gust Reader and Gate Bounty

- **Gust Reader** (Survive, 3 ranks, 12 / 22 / 38★) holds the gust telegraph longer: +0.3 s per rank, so a maxed warning lasts 2.1 s instead of 1.2 s. The push itself is unchanged (`gustWarningSeconds` in `src/game/wind.js`, read where the gust is armed in `src/flight-engine.js`).
- **Gate Bounty** (Score, 3 ranks, 16 / 30 / 52★) adds 2★ per rank to every boss gate clear. A maxed gate pays 11★ instead of 5★ (`getGateClearStars` in `src/game/boss-director.js`).
- **Trees:** the catalog is now 18 upgrades and 63 ranks. Survive holds 15 ranks and Score holds 24. Style stays at two upgrades.
- **Balance guard:** the first ranks of all 18 upgrades now total 263★, about 38 normal runs at 7★ a run. The test guard allowed 35 runs, so it now allows 40, with the reason in the test. This is a product call. If the first ranks should be cheaper, the price table is the place to change.
- **Scope guard:** the approved catalog list in `test/scopeGuard.test.js` now includes both new ids.
- **Checked in the browser:** the dev build measured the telegraph at 1.2 s with no ranks and 2.1 s at rank 3. Both upgrades bought at rank 1 and took 28★ from the wallet (400 to 372).
- **Checked in the simulator:** on the iPhone 16 Pro, the Hangar shows 18 cards and the new tree totals. The Gust Reader card renders at phone width.
- **Not verified in flight:** Gate Bounty's extra stars. A boss gate sits about 500 m into a run, and the payout is covered by the unit test and the runtime contract only.
- Verification: Vitest 649 tests passed (92 files); production build passed; iOS build passed; bundle budget 919,216 of 921,600 total bytes; iOS web parity 24 files. Playwright development lane: the first full run had four failures. Two were the Hangar card contract list, which still had 16 entries; the list and the stored test ranks now include both new upgrades. The other two (the flight guide and the menu fit check) passed 6 of 6 on rerun, both projects, after the simulator build had loaded the machine. Production lane: 63 passed / 69 intentional skips / 0 failed.

## 2026-10-14 — Banners stay readable in flight, and the death screen names the dive

- **Simulator test:** the iPhone 18 Pro simulator accepted screenshots but never routed taps into the web view, so the earlier note that flights could not be started there still stands for that device. A new simulator, "Paper Plane iPhone 16 Pro" on iOS 27.0, matches Austin's phone and takes taps. A flight ran on it, and the Hangar, the Journey map and the death screen all worked.
- **Banner collision:** the tier card ("Tier 1 · Headwind …") is a notification, and it sat in the same band as the banner stack. The card is above the stack, so it covered the boss cue ("Fly the glowing ring — hold GO!"), and it could cover a gust warning too. This was seen on the simulator at 1128 m. The card now sits below the stack: a `ResizeObserver` publishes the stack's height as `--banner-stack-h`, and the in-flight rule in `src/ui/flight.css` offsets from it (`src/flight-engine.js`).
- **Singular counts:** the death screen and route-complete card read "1 Gauntlets cleared", "1 Power pickups" and "1 Gaps threaded". Each highlight now has a singular and a plural, chosen by count (`src/game/flight-debrief.js`).
- **Dive at a gate:** a death at a boss gate used the same advice whether or not the plane was tucking. When a dive was held at death, the advice now says to release Tuck before the gate, because a dive can drop the plane out of the outlined opening (`src/game/flight-debrief.js`). The simulated death at 1128 m came right after a tuck, with the plane diving on screen before the crash.
- **Not verified in the simulator:** no tier card or challenge notice came up in the simulator run, so the observer path has not been seen on device. The layout was checked in the browser by setting the two variables to the values the observers publish.
- **Not done:** gameplay balance was not changed. The simulator runs were too slow to judge difficulty, since each tool call adds several seconds of game time.
- Verification: Vitest 642 tests passed (92 files, 2 new for the boss dive advice and singular counts); production build passed; bundle budget 918,338 of 921,600 total bytes; iOS web parity 24 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed.

## 2026-10-14 — Gust telegraph, wind near the walls, and a tutorial wind lesson

- **Gust warning:** the warning lasted 0.45 s and the banner did not say which way the push would go. It now lasts 1.2 s and reads `💨 Gust coming, pushing left…`, then `💨 Gust pushing left!` once the push lands (`src/flight-engine.js`).
- **Banner priority:** the gust banner ranked below the gauntlet and zone names, so a warning could be hidden behind them. It now ranks above both, below boss gates and guardian saves (`src/game/flight-banners.js`).
- **Walls:** a gust used to shove the plane into a wall, where nothing could be dodged. The outward share of a push now fades out from 10 to 13 units from centre, removing up to 70% at the wall. Inward pushes are unchanged (`src/game/wind.js`).
- **Tutorial:** the Tutorial card promised "Learn to ride the wind", but the tutorial had no wind lesson. A "Ride the wind" lesson now sits at 270 m, and the lessons keep 60 m spacing (`src/game/tutorial-lessons.js`). A scripted gust in the tutorial was tried and removed: a sideways shove stops a straight climb from collecting the rings, so the tutorial could not finish.
- Verification: Vitest 640 tests passed (92 files, 3 new for wind easing and direction); production build passed; bundle budget 918,018 of 921,600 total bytes; iOS web parity 24 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed. The e2e tutorial test now expects the Ride the wind lesson.
- Not done: the native app was not rebuilt in Xcode this round, so it needs a rebuild to pick up these changes.

## 2026-10-14 — iOS launch shows the loading card at once

- **Cause of the blank launch:** `GameViewController.viewDidLoad` ran the audio session and the first `WKWebView` setup on the main thread before returning. The loading card was added first, but it could not paint until that work finished, so the screen stayed plain blue for several seconds.
- **Fix:** the card is still built in `viewDidLoad`, and the rest of the setup moves to `startGameSession()` one run-loop turn later (`ios/PaperPlaneRun/Sources/GameView.swift`).
- **Simulator timing, iPhone 18 Pro:** the loading card paints about 2 s after launch, and the menu appears at about 7 s. Before this change the menu appeared at about 10 s, and the card never showed.
- **Not reproduced:** the simulator logged one WebP decode error (`initImage failed err=-50`) during startup. Every shipped WebP decodes with both libwebp and ImageIO, and the menu images render, so I could not tie the error to anything on screen.
- **Limitation:** taps from the simulator automation tool do not reach the web view on either the previous or the current build, so a flight started from the iOS app is not verified here. The web lanes cover the flight path.
- **Not done:** a physical-device test, since none is connected.

- **Plane traits:** each silhouette flies differently (`PLANE_TRAITS` in `src/plane-models.js`). Dart snaps (handling +10%, sink +4%), Glider glides (sink −10%, speed −2%), Stunt pays more from a flare (+12%), and Classic is the balanced baseline. The equipped plane scales the run's upgrade effects when the run starts (`refreshUpgradeEffects` in `src/flight-engine.js`), so the same upgrades feel different on each plane. The Planes tab caption names the trait, for example "Classic Fold · Balanced".
- **Live preview:** the Planes-tab model sits on a cut-paper plate with a hard shadow, and the camera is closer, so the plane fills the card.
- **iOS cold start:** the menu waited on the Nunito stylesheet, and the page's `load` event held back on that request on a slow network. The font now loads after `load` (`src/main.js`). In the iOS simulator the first menu frame moved from about 21 s to about 10 s after launch. The remaining delay is WebKit and simulator startup. The native loading card still does not appear in the simulator, so that remains open.
- **iOS rebuild:** `npm run build:ios` regenerated the bundled web app (parity 24 files), and the Debug simulator build succeeded and launched.
- Verification: Vitest 635 tests passed (91 files, 3 new for plane traits); production build passed; bundle budget 917,646 of 921,600 total bytes; iOS web parity 24 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed.
- Not done: the loading card in the iOS simulator, and a test on a physical device, since none is connected.

## 2026-10-14 — Cut-paper plane portraits and upgrade rank counts

- **Plane portraits:** the Hangar portraits were one photograph per skin, which broke the cut-paper rule the flight follows. Each portrait is now drawn from its plane's own flight silhouette (`src/game/plane-portrait.js`): a lit and a shaded wing face split by the fold, accent creases, a hard offset shadow and an ink edge. The seventeen photo files moved to `docs/retired-art/planes/`, and the service worker no longer precaches one of them.
- **Upgrade tree counts:** each spend-tree chip shows ranks owned over ranks available, such as `HANDLE 0/18` (`upgradeChipParts` in `src/main.js`). The count sits in an `aria-hidden` span, so button names do not change for assistive tech or tests.
- **Not in this round:** the Live flight model preview on the Planes tab is unchanged, and no plane stats or upgrade effects changed.
- Verification: Vitest 632 tests passed (90 files, 3 new for the portrait drawer); production build passed; bundle budget 916,510 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed, after one portrait assertion moved to the drawn image; production lane 63 passed / 69 intentional skips / 0 failed.

## 2026-10-14 — Fewer enemies, updrafts and boost; boss badges, mountains and ground props

- **Enemies:** every chunk used to carry a hazard. On Normal, about 39% of chunks are now open (`OPEN_CHUNK_WEIGHT` in `pickHazardType`), so birds and scissors appear in about 40% fewer chunks. Flocks are smaller (1 + up to 1.1 instead of 1.6, scaled by the ramp), and the mixed-flyer roll fell from 18% + 10% per ramp to 10% + 6%.
- **Updrafts:** the chance per chunk fell from 0.42 to 0.22, and columns must be at least 140 m apart (`UPDRAFT_MIN_SPACING`).
- **Boost:** boost is 1 of every 11 power orbs (was 1 of 6), and two boosts must be at least 280 m apart (`BOOST_SPAWN_SPACING`). Both spacing counters reset with each run in `resetGame`.
- **Boss badges:** the emblems have heavier ink and larger silhouettes, and they sit on a pale paper plate with an ink edge, so they read against the sky (`drawBossEmblem` in `src/game/boss-art.js`).
- **Mountains:** each peak has a lit face and two shaded folds split by hard creases, and peak heights vary more, from 0.6 to 1.3 of base (`src/paper-landscape-renderer.js`, `src/game/paper-landscape.js`).
- **Ground props:** three props in the city, harbor and midnight zones changed colour so they no longer match a vehicle or another species in the same zone (`src/game/ground-life.js`).
- **Not in this round:** plane models and upgrades are unchanged. They are the next candidates.
- Verification: Vitest 629 tests passed (89 files); production build passed; bundle budget 914,309 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed.

## 2026-10-14 — Lateral threat cues, clothesline sheets removed, cloud creases

- **Hazards you cannot see:** a phone's view is narrow, so a bird or scissors in an outer lane can slide out of the frame and hit you while it is off-screen. A chevron now shows on the edge a threat is entering from, for birds and scissors within 28 units ahead, shaded by how close it is (`updateEdgeThreats` in `src/flight-engine.js`, styles in `src/ui/flight.css`). In a gameplay probe on the final build, the cue was on screen for 5–12 half-second steps per portrait run and 0–2 per desktop run. Hitboxes and the camera are unchanged, so this is an awareness fix, not a change to the lanes.
- **Blank colour sheets:** the clotheslines the ground decor spawned were three blank colour sheets each, with no art and no collision. They are removed, together with their factory (`maybeSpawnGroundDecor`).
- **Clouds:** each cloud has a fold crease in its shade colour, so it reads as folded paper rather than a blank silhouette.
- **Dev:** `resolve.dedupe: ['three']` in `vite.config.js` removes the duplicate three.js instance warning. RoomEnvironment imported three by its raw path, so dev pre-bundling loaded a second copy.
- **Correction:** the previous entry said the blank cream wall beside the road was a route building. That was wrong. It is still unidentified and unchanged.
- **Probe limits:** the scripted bot died mostly at boss gates, where it could not read the gate in advance. Across the gate deaths, the plane was outside the passage and the passage matched the visible hole, and the probe did not reproduce a hazard that was never visible. So the cue is a mitigation, not a proven fix for every case.
- Verification: Vitest 629 tests passed (89 files); production build passed; bundle budget 913,972 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed.

## 2026-10-14 — Gust Guard, Thermal Sense, and visual polish

- **Two new upgrades:** Gust Guard (Survive tree) cuts wind-gust push by 15% per level, down to 45% at rank three. Thermal Sense (Handle tree) raises updraft lift by 12% per level, up to 36% at rank three. Each costs 12–44 stars across three ranks. They reach the flight through `windPushMul` and `updraftStrengthMul` (`src/upgrades.js`, `src/flight-engine.js`). The catalog is now 16 upgrades, and the scope guard, spend trees, and contract tests were updated to match.
- **Boss badges:** the top emblem is 3.7 units instead of 2.9 (`getBossBadgeLayout` in `src/game/boss-art.js`), so the stapler's cream body and navy base read from gate distance.
- **Vista houses:** the city and sunset house vistas sit at ±44 units instead of ±36, and are 4–6.4 units wide and 5–9 tall instead of 5–8 wide and 7–14 tall. Near the camera they show windows instead of blank cream walls (`src/game/paper-landscape.js`).
- Verification: Vitest 629 tests passed (89 files); production build passed; bundle budget 913,495 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed, after four upgrade-count assertions moved from 14 to 16 cards; production lane 63 passed / 69 intentional skips / 0 failed.
- Still open: a blank cream wall beside the road on the right of the city view comes from a route building (`createBuilding`), not a vista, and is unchanged. The cream clouds are unchanged. The iOS app needs a rebuild to pick these up.

## 2026-10-14 — Fair boost, gauntlet sheet and random confetti removed

- **Boost is a surge, not a jump:** the speed bonus used to land almost at once, +18 on top of a ×1.22 cruise. On a normal run that put the world at about 52 against a 28 base, and it dropped sharply at the end. The bonus now eases in over 0.45s, holds at +7 with a 1.1× cruise multiplier (about 38 against 28 at the start of a normal run), and drains over the last 0.8s (`getBoostSurge` in `src/game/power-pickup.js`). A same-kind refresh keeps the surge up, so grabbing a second boost never dips the speed.
- **No free lift:** boost no longer kicks the plane up 3 units/s. Updrafts remain the only free height in the run.
- **Boost spawns less:** about one power orb in six is boost, down from roughly 45% (the old forced 18% roll plus an even third of the rest). Shield and magnet split the remainder evenly (`POWER_SPAWN_WEIGHTS` and `pickPowerSpawnKind`). Turbo Fold's grace and smaller crash target are unchanged.
- **Gauntlet sheet removed:** each gauntlet stood an amber 26×18 colour panel in the air ahead of the gap. It had no art and no collision, so it read as a blank sheet you could fly through. The gap banner and the invisible payout tripwire remain.
- **Random boost confetti removed:** boost sprayed confetti at random along its trail, eight times a second. Event bursts (pickups, near misses, clears, fever) are unchanged.
- Verification: Vitest 625 tests passed (89 files; 8 new for spawn odds and the surge envelope); production build passed; bundle budget 912,783 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed. The gauntlet fixture was stepped in the browser and the lane sheet is gone from the frame.
- Still open: the cream cloud shapes in the sky and the event confetti from pickups, near misses and clears are unchanged.

## 2026-10-14 — Fog warnings, menu rhythm, and iOS parity

- **Hazards hidden by fog:** the daily "Foggy Morning" twist, the low-visibility Journey route, and the storm and midnight visibility pockets all shorten draw distance to roughly 90–175 units. Birds and scissors were invisible until close, and their warning ring only appeared inside 36 units, or not at all when secondary effects were off (Low Power Mode, thermal or memory pressure, low quality). The rings are now always attached, ignore fog, and appear as a hazard enters a thick-fog band (`fogIsThick` in `src/flight-engine.js`). A crash under thick fog says "hidden by the fog". Normal fog is unchanged. A DEV fixture, `#test-fog-warning`, shows the case.
- **Ghost replay:** the ghost plane is visual only. It is never registered as a collider, so it cannot end a run.
- **Menu rhythm:** every gap between menu items is 10px on both axes. Mode pills share one height, with captions reserving two lines. Difficulty and control buttons are equal columns with equal gaps, and selected buttons no longer shift off their row. The game-over actions are one centred column of equal-width buttons. The Hangar pill keeps its row layout.
- **iOS parity:** the install shortcut no longer shows inside the app, because the WebView counts as the installed shell (`src/native-shell.js`, `src/main.js`). Flights post a `screenAwake` message, so the native shell keeps the screen on during play, and the home indicator steps back during play (`ios/PaperPlaneRun/Sources/GameView.swift`). The app was built and run on the iPhone 18 Pro simulator through a Classic flight.
- Verification so far: Vitest 617 tests passed; iOS web parity 41 files; native Debug build succeeded and ran a full Classic flight on the simulator.

## 2026-10-14 — Ground props: street pennants and decal patches

- **Street flags:** the city's rooftop-flag species floated as blank white panels 3.4 units up. They are now short paper pennants on poles standing on the pavement, and the sway is reduced so the poles don't swing like masts (`GROUND_LIFE_GEOMETRY.flag` in `src/flight-engine.js`, species data in `src/game/ground-life.js`).
- **Decal patches:** the city, harbor and aurora decals were near-white and read as blank plates on pale pavement. They are warm tan, mid blue and light blue now, in the same family as the lot and water colours.
- Verification: Vitest 617 tests passed; production build passed; bundle budget 912,405 of 921,600 total bytes; iOS web parity 41 files; Playwright development lane 101 passed / 31 intentional skips / 0 failed; production lane 63 passed / 69 intentional skips / 0 failed. Street and harbor views were inspected.
- Still open: the close-range house vistas are large cream slabs, the sky and clouds are unchanged, and the car and pedestrian models are unchanged.

## 2026-10-14 — Full QA pass: paper bosses, enemies, ground, pickups, menus, and shipped art

- **Bosses:** the scissors, stapler and wind gates are cut paper. The hoop is a flat tinted ring with a hard ink offset instead of a glowing torus. Blades, jaws and fan blades are extruded paper cuts with ink offsets, and the stapler jaws have teeth facing the slot. The three emblems are drawn on canvas as `paper:boss:<id>` textures in the enemy style. The old boss WebPs moved to `docs/retired-art/bosses/`.
- **Enemies:** the seven flyers are redrawn as folded paper in each zone's accent: two facets split by a fold, a hard offset shadow and a thin ink edge. The biplane reads as a biplane now; it was four bars. The WebP sprites were never loaded at runtime, so they moved to `docs/retired-art/obstacles/`. `FLYER_DEFS` carries `sprite: 'paper'` in their place.
- **Ground:** road, kerb, block and park textures carry hard offset shadows, fold creases and fibre grain, and parks are scalloped cut shapes. The flat decal bands were 55% translucent and are opaque cut paper now.
- **Updrafts:** the translucent green smear is solid mint chevrons with ink offsets and a fold each. They are alpha-tested, so the route still shows between rows.
- **Pickups:** stars and power icons split along a fold into a lit half and a shaded half, with fibre grain. Labels sit on a hard offset card.
- **Flight:** wingtip wisps are paper flecks (hard-edged triangles) instead of round dots.
- **Menus:** one cut-paper layer over the menu, Hangar, Journey and the cards: 2px ink edges, hard offset shadows, a visible `:focus-visible` ring, and 44px touch minimums on coarse pointers. Short touch screens and 320px phones tighten the stack, so every primary action stays on screen. The spec `menu actions fit` enforces this. Settings checkbox rows now read box-then-label.
- **Shipped art:** 18 files were never displayed (zone JPEGs replaced by procedural art, unused power-up and pickup WebPs) and are removed. Retired and unused sprites moved to `docs/retired-art/` with `git mv`, and the iOS icon source moved to `ios/source/logo.jpg`. The service worker precaches the menu illustration the first screen paints, not the logo. `test/shipped-art.test.js` fails if a file in `public/assets` is unreferenced, or if a referenced file is missing.
- **Naming and seasons:** the pilot field is labelled "Callsign" and its grey placeholder still shows the default name. Spring boosted a retired flyer and changed nothing; season weights are a tested `SEASONAL_FLYER_BIAS` table.
- **Engine:** removed the unreachable JPEG desaturation path from `loadTex`.
- Verification: Vitest 89 files / 617 tests passed. Production build passed, and the bundle budget passed at 912,314 of 921,600 total bytes (the initial entry is 132,723 of 163,840). The budget is now tight, so the next JavaScript addition needs a decision. iOS web bundle parity matched 41 files exactly. Playwright development lane: 101 passed, 31 intentional viewport and platform skips, 0 failed. Production lane: 63 passed, 69 intentional skips, 0 failed. Screenshots were inspected for zones, enemies, bosses, pickups, updrafts and menus at 1280, 390 and 320 wide.
- Not changed: the global leaderboard is still in-memory per warm serverless instance and resets on a cold start. Fixing it needs a storage backend and credentials. The sky and clouds are unchanged, and the ground change is a subtle upgrade rather than a repaint.

## 2026-10-02 — Flight onboarding, accessible controls, and release verification

- Added paper field notes, six persistent tutorial lessons across a 420m practice route, readable updrafts, a low-height Tuck release cue, and route/distance/star totals on the pause card. Refined paper/coral controls and compact layouts at 320×568, 390×844, and 844×390.
- Fixed engine shortcuts starting a flight while typing a pilot name or activating a menu button. Dialogs contain keyboard focus, Escape closes them, and resume restores playfield focus. Fresh runs clear held input, Tuck, bank, and dive state; covered menus and paused flights reuse the last rendered frame.
- Replaced unreachable Ink Blast missions with deterministic current objectives without losing completed rewards or other mission progress. Added attainable Gauntlet Runner awards and logbook totals credited at each actual gauntlet payout; earned Sharpshooter history remains available as a legacy award.
- Updated compatible Vite/Playwright releases, retained Three.js/Vitest, and integrated the latest remote gameplay, camera, gamepad, visual, and native-shell improvements. Production loader regressions now match hashed chunks; fixture checks stay in the development suite and CI runs both browser lanes.
- Verified integrated release: 84 Vitest files / 545 tests passed; development browsers 75 passed / 31 intentional skips; production browsers 51 passed / 55 intentional skips. Production build and final bundle budgets passed (123,528 initial / 874,623 total bytes); iOS build and parity matched 75 files exactly. npm audit reported zero vulnerabilities; Endor review remains unavailable without credentials.
- Xcode Debug build, install, and launch passed on iPhone 18 Pro simulator. Native playtesting verified guide, tutorial completion, touch steering, replay, and pause totals. Browser screenshots and deterministic flight state were inspected; release artifacts are kept in ignored `output/`.
- Deployment excludes local test output, native build files, and the user's untracked `.claude` folder.
- Live production smoke found escaped template expressions in the altitude tooltip. Replaced the placeholders with computed sink rates and added a rendered-title assertion to the desktop/mobile pause lane. Final focused development and production checks each passed 2/2; all 545 unit tests passed again after the fix. Live tutorial completion, replay, pause totals, service-worker restart, phone layout, and leaderboard GET were verified.
- Follow-up CI audit: GitHub's checks never started because the account is locked by a billing issue (run `37046066808`, check annotation). Independently reproduced the workflow's missing `ios-dist` prerequisite from a clean Git archive. Added `build:ios` before parity; the clean source build and 75-file comparison passed on Node 22. Hosted CI remains unverified until the account billing lock is resolved; production is ready and healthy.

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

## 2026-10-19 — Boss-gate mesh contrast pass (flight-engine only)

- Third pass at the twice-deferred wash-out complaint, this time on the in-world gate MESHES (the paper EMBLEMS were already re-cut): the pastel hoop tones (0xb8f3c8/0xbfdbfe/0xfde68a/0xfbcfe8), pale cream blades and pale steel jaws/fans/heads all sat in the same value register as the bright skies.
- Safe ring rebuilt as two-tone cut paper in `createSafePortalRing` (src/flight-engine.js:2333): lit outer band (1.05/0.05 torus) + shaded inner rim (0.95/0.05) tiling the old 0.9–1.1 band exactly, plus a hard ink outline torus (band ×1.05, parked behind the face) that only peeks past the outer edge — its inner edge stays under the band so the flyable opening is untouched. Per-boss lit/shade pairs now read against the sky (scissors 0x7fd8a4/0x2e8b62, wind 0x5ea7dd/0x2a6396, stapler 0xf6c453/0xb87a1c, punch 0xf191bd/0xc4538a); the hole stays the brightest region.
- Scissors blades (src/flight-engine.js:1883): stock deepened 0xfff4dd→0xe6d5b4, fold crease widened and darkened, ink offset strengthened, plus a dark base strap (scissorsBaseGeo) and a world-tilted ink strip tracing the tapered outer edge (length/tilt from (0.33·bladeW, 0.94·bladeH), half breaking past the silhouette) so the tall panels read as inked paper posts top to bottom.
- Stapler jaws + punch heads (src/flight-engine.js:2437): pale steel 0x9dbcd3→0x6e91aa, stronger ink offsets, and an ink band along the jaw teeth line / an ink rim tube around each punch disc.
- Wind gate (src/flight-engine.js:2485): blades recut in the city near tone 0x7ea6cc with a deeper hub 0x55809f, stronger ink offsets per blade, and ink-backed debris scraps.
- Passage dims/hole/timing/collision untouched (e2e pins verified live: passage {halfWidth:4.8, halfHeight:4.4} in every probe run); all new decorative geometry sits outside the collision envelope (blade edge worst-case x ≈ 5.4 > 4.8 even at full bob tilt).
- Visual proof: output/gate-{scissors,wind,stapler,punch}-{portrait,desktop}.png (8 shots via output/gate-capture.mjs against the dev server, no boss-pass) — rings, posts, jaws, fans and punch heads all read at a glance.
- Verification: `node --check` clean; `npx vitest run test/bossDirector.test.js test/bossArt.test.js test/gap-weave.test.js` 33/33 green. Playwright e2e not run (ports reserved); boss e2e contract (passage dims, phases, shapeCue) untouched by this diff.

## 2026-10-19 — Full audit, PWA/iOS hardening, early-pacing fix, repo cleanup

- Four parallel read-only audits (web shell/UI, game engine, iOS wrapper/pipeline, build/test/deploy) found no P0s; shipped the verified P1/P2s that mattered.
- **PWA/update correctness:** first install no longer reloads the page when `clients.claim()` fires (the old `controllerchange` handler reloaded every first visit, potentially mid-run); only an explicit "Restart to update" reloads. The update banner is hidden when a flight starts and returns on the menu. The blocking shell now fails install if entry JS/CSS cannot cache, while WARM art stays best-effort and inside `waitUntil`.
- **Storage robustness:** added `safeStorage`/`safeGetItem`/`safeRemoveItem` with a memory fallback; removed every unguarded boot-time `localStorage`/`sessionStorage` read in the shell, engine, audio and Journey modules. Quota-full-but-readable storage keeps using persisted saves.
- **Accessibility/UX:** restored pinch-zoom (removed `user-scalable=no`), first-run reduced-motion follows the OS preference, mute state has one source of truth across HUD/keyboard/gamepad/pause, panels move focus to their heading, plane/upgrade actions restore focus after re-render, install/postcard dialogs close and restore focus on Escape, leaderboard scope buttons expose `aria-pressed`, Journey CTA no longer masks its progress copy, and the remote board has a timeout + distinct loading/error states. Nunito is now self-hosted (variable WOFF2 + OFL license) instead of injected from Google Fonts after load, so the brand font works offline in iOS, no third-party font request leaves the page, and the CSP needs no Google exception.
- **Share links:** new canonical share base (`share-url.js`). Ghost/postcard/editor links now always point at `https://paper-plane-run.vercel.app/...` instead of `paper-plane://`; iOS gets native `shareText`/`sharePhoto`/`copyText` bridges, and photo save opens the iOS share sheet (Save Image) instead of a dead `<a download>`.
- **iOS:** implemented `WKUIDelegate` alert/confirm/prompt (Journey restart previously always cancelled), reset the idle timer on resign/failure, send a native pause signal on resign-active, added `LSRequiresIPhoneOS` + `ITSAppUsesNonExemptEncryption=false`, removed the unused camera permission, bumped to 1.0.1 (2), and surfaced signing style/CI steps.
- **Gameplay:** boss gates now use a swept z-crossing test (fast frames can no longer tunnel through the 2.1-unit slice) and pay out before the invuln gate; gauntlet tripwire moved beyond the last hazard (it previously paid on entering the lane); challenge links adopt their recorded mode/difficulty after the shell strips `?c=`; gamepad Start/Select now starts, retries and un-pauses (poll moved out of the playing-only path); mini-gauntlet uses the real tier; flyer/scissor card geometry+materials are cached instead of allocated per spawn; boss gates release GPU resources; preview resizing uses a cached box + `ResizeObserver`.
- **Early pacing:** `spawnChunk` decisions now use the arrival distance (`distance + z`). Pre-populated chunks previously all saw `distance = 0`, which made the first ~200m calm/star-telegraphed and pushed the 45–80m opening guarantee late. The pacing simulator mirrors the same mapping and still passes the presence floor/cap/variance bounds (longest empty visible run: smoothed 0m vs shipped 285m over the seed set).
- **Build/deploy:** Vercel immutable caching for hashed `/assets/*.js|css`, tightened CSP (no unused Google Fonts allowances), SW manifest filters Finder duplicate junk, CI gained a macOS xcodegen + simulator compile job and audits all deps, Node engine pin, `ios:generate` runs parity, README verification order fixed, generated `output/`/`.superpowers/` untracked, duplicate Xcode project and broken Git refs removed, unused starter assets/dead star-placement module deleted.
- **Verification:** 93 Vitest files / 661 tests green; production build + bundle budget PASS (145,959 initial / 929,804 total); iOS build + byte-exact parity (23 files); unsigned simulator build succeeded and the app launched on iPhone 18 Pro; focused desktop/mobile Playwright lanes passed (menu, Hangar, Journey HUD, pause/focus/resume, tutorial, gauntlet, boss cue, hazard fairness, stars, leaderboard, first flight, production preview).

## 2026-10-19 — Flight/gameplay quality pass

- **Fair building hitboxes:** buildings were tested with one square envelope sized by the longer side, so rectangular roofs shoved the plane well outside their visible corners. Added `game/building-hitbox.js` (half-width/half-depth + plane padding, boost-aware) and stored real `halfW`/`halfD` on every building entity, including tutorial routes and the custom-route editor. Square buildings keep exactly the old footprint.
- **Center-thread boss skill reward:** a genuinely centered line through a boss gate now pays +2★ on top of Gate Bounty, logs `boss_center_thread`, and changes the clear callout to `CENTER THREAD`. Edge-grazing passes still clear normally; precision is measured against the raw passage, not the edge grace.
- **Endless tier escalation now reaches real spawns:** `getSpawnStep()` in pacing applies difficulty gap and the endless-tier spacing scale, and both the pre-populate and live pumps use it. Previously only the unused chunk helper applied tier spacing, so tiers 1–8 never tightened the actual waves.
- **Collision math extracted and pinned:** boss-gate pass detection now uses the tested `crossedPassLine` sweep; building envelope and gate crossing each have dedicated unit suites (normal, tunneling, off-line, junk-input cases).
- **Frame/perf cleanup:** cached combo/streak fill and gap-trail DOM nodes instead of querying every frame; reused the edge-threat NDC vector instead of cloning per hazard; reduced-motion now suppresses the death-state camera shake too.
- **Resource ownership fixed:** tutorial rings (glow material + geometry), tutorial/layout buildings, and boss emblem canvas textures are released on removal; `clearEntities` uses the same disposer so a restart mid-boss frees gate materials. Invalidation is per-release rather than a permanent WeakSet, so a re-used/re-uploaded shared material is freed again next time instead of leaking after the first boss.
- **Custom-route/tutorial building placement:** buildings no longer set their mesh Y to 0 after `createBuilding` already centered them at half-height, so routes show full-height buildings instead of half-buried ones.
- **Verification:** 95 Vitest files / 678 tests green; production build + bundle budget PASS (145,680 initial / 931,349 total); focused desktop Playwright green for gauntlet, thread reward, boss gate, max-upgrade runtime, max-upgrade feedback, endless tiers, hazard fairness, stars, ground skim, first flight, and production preview smoke.

## 2026-10-19 — Ink Blast weapons, armored enemies, and open-air collision fix

- **Open-air collision fix:** lethal warning rings now use the actual damage radius (`game/hazard-readability.js`) and never shrink below it at close range. The old ring shrank to 0.85× while the hit envelope reached 1.06–1.96 units, so a visually clean pass could kill outside the ring. Dive threats also pulse the ring larger while descending. Regression tests pin the close-range, distance-growth, dive, and junk-input cases.
- **Ink Blast weapons tree (3 new upgrades, 25 total):** `weapon` (4 ranks) unlocks auto-firing wing pods; `salvo` (2) adds darts per volley and cone width; `pierce` (2) adds pass-through and armor damage. Salvo requires Ink Blast Lv1, Piercer requires Lv2, enforced in `buyUpgrade` and shown as disabled Hangar cards.
- **Plane upgrades after purchase:** armament pods are real geometry on the flight model and Hangar live preview — one pod per wing at low ranks, twin pods at rank 3+, one barrel per dart, ink tips with Piercer. They rebuild after purchase and follow the current skin materials.
- **Weapon runtime:** pure `game/weapon-runtime.js` handles cooldown/range/damage/darts/pierce, forward-cone target selection, homing, point + swept dart collision. Low-framerate frames can no longer tunnel darts through flyers. Auto-fire ignores bosses/buildings and has a 10m minimum range so steering stays primary. Pops pay +1★ and feed the existing “popped” lifetime counter.
- **Enemies:** biplanes and hawks are now armored (2 HP) with a brass inner ring and hit-flash; normal flyers stay one-hit. Dive rings telegraph before the drop. Ink pops show a paper burst, audio/haptic feedback, and a run-debrief “Ink pops” highlight.
- **HUD/feedback:** new Ink cooldown chip with ready/seconds and fill, included in the HUD budget, plus firing pulse and +1★ pop ribbon.
- **Tests:** new weapon-runtime (13), hazard-readability (4), armored-roster, prerequisite, upgrade-contract, runtime-snapshot, and Ink Blast browser fixture coverage.
- **Verification:** 97 Vitest files / 705 tests green; build + budget PASS (150,160 initial / 941,802 total bytes); focused desktop+mobile Playwright green for Ink Blast, Hangar contracts, max upgrades, mobile HUD budget, hazard fairness, boss gates, and all six landscape captures.

## 2026-10-29 — Endless hazard variety and Hangar search clarity

- Endless flights now rotate the hazard mix every 900 m after the tier cap, keeping capped difficulty, safe-gap behavior and tier-climb rewards unchanged. Hazard descriptions now match the actual weighting.
- Hangar search and tree filters distinguish a maxed subset and empty results from a fully maxed collection. Added boundary, spawn-pump and desktop/mobile search regression coverage.
- Verification: 756 unit tests passed (7 skipped); final bundle and 26-file iOS parity checks passed. The full browser run recorded 142 passes, 54 skips and two desktop failures; both failures passed in isolated reruns. The first trace showed an extra page load, and the second collected too few hazard samples on that run. Dedicated iPhone simulator: inspected Hangar search and a Classic flight with pause and return to menu. Signed iPhone build 1.0.1 (5) succeeded.

## 2026-10-29 — Launch, impact and hazard details

- Replaced the tiny unfold pop with a brief automatic forward throw; it is a visual-only transition and does not delay control or alter collision coordinates. Reduced motion starts at the normal pose. A player-controlled slingshot remains a possible future interaction.
- Crash motion now reaches the ground sooner, stops tumbling on impact and adds a scale-aware squash and paper burst. Reduced motion avoids the spin and limits sideways movement. Added eye and hinge details to the bird, hawk and scissors artwork without changing collision silhouettes.
- Verification: 758 unit tests passed (7 skipped). A focused desktop/mobile browser run passed 15 tests with 5 intentional skips; artwork and launch/crash unit checks passed again after the last art correction. On the dedicated simulator, tutorial flight, a Tuck crash, the result and retry were observed. The final web build, bundle budget and 26-file iOS parity passed; signed iOS build 1.0.1 (6) verified.


## 2026-10-29 — Interactive slingshot launch

- Added a pull-and-release ready stage with elastic bands, touch/mouse capture, keyboard and controller release, cancellation, pause/background handling and accessible activation. Flight clocks, hazards and online sessions begin on release. Daily/Weekly refresh their period if the ready stage crosses its UTC boundary.
- Native simulator testing exposed a WKWebView drag problem; explicit touch tracking fixed it. Retry now resets altitude/Tuck HUD before waiting at the launcher, and the ready stage avoids continuous WebGL rendering.
- Final verification: 758 unit tests passed (7 skipped); all 8 production desktop/mobile launcher tests passed. Earlier mode/Hangar touch-navigation checks passed, with desktop-only skips. Dedicated QA simulator: short pull, pause/resume, full touch release into flight, crash and retry with clean HUD observed. Builds, bundle budget, 26-file iOS parity and signed iPhone build 1.0.1 (7) passed.
- The Documents checkout had cloud-file read stalls, so final builds/tests used an identical temporary source checkout with freshly installed lockfile dependencies.


## 2026-10-29 — In-world launch, workshop bosses and folded-paper impact

- The slingshot now grabs the actual 3D plane in the open scene, with projected elastic bands, a tension meter and a modest power-dependent starting boost. Launch protection and route notices begin on release so they cannot cover the ready heading. The plane remains visible throughout the opening throw.
- Reworked enemy paper stocks and cut details: cream/coral birds, copper hawks, navy/coral biplanes, translucent-looking insect wings, balloon seams and steel scissors. Subtle bird/insect flutter respects reduced motion; collision silhouettes remain unchanged.
- All four bosses have physical workshop frames with distinct material colors. The opening commits at the final approach and remains fixed while steering; phase banners describe the actual boss phase. Tests verify the decorative frame never covers the authored passage.
- Crashes crease the wings, compress the fuselage and scatter 18 pooled folded-paper fragments using the equipped skin colors, then settle before results. Reduced motion avoids the fragments and spin.
- Final verification: 761 unit tests passed, 7 skipped (104 files passed, 1 skipped). Focused desktop/mobile browser regression: 33 passed, 7 intentional skips, covering all four bosses, opening visibility, crash/reduced motion, launcher input/cancellation, modes, Hangar and touch navigation. This was a targeted regression, not the entire browser suite.
- Dedicated QA simulator: actual pull/release, practice flight, crash, results/retry, pause/return and a Classic flight clearing the first boss with CENTER THREAD were observed. Final portrait launch layout was inspected after moving the protection banner. Other simulators were left untouched.
- Production build and bundle budget passed (151,089 initial / 959,092 total bytes); 26-file iOS parity and signed Release build 1.0.1 (8) passed. Source/build/test work used the temporary Git checkout because the Documents checkout still has cloud-file read stalls.


## 2026-10-29 — Flight encounters and complete menu audit

- Bosses now use predictable approach lines that mirror on subsequent circuits, with distinct difficulty tracking. A dedicated encounter strip shows the workshop, range, commitment and center bonus; a dashed gold target visualizes the existing precision reward. Final lift assistance follows the actual locked opening. Journey keeps its authored lines.
- Birds, hawks, wasps and dragonflies now use cached, hinged paper wings cut from the original texture. Their silhouettes and collision radii remain bounded; reduced motion holds a stable fold.
- Refined the paper menu hierarchy, Hangar navigation, upgrade filters and purchase framing. Real touch panning reaches clipped tabs/filters; group changes reveal the selected tab. Purchases preserve focus on the new rank without stealing later search input. The field guide stays inside the menu safe area. Journey exposes its first route before optional pilot setup and uses a journal spread on wide screens.
- Hands-on testing found and fixed `undefinedm` in the saved best record, misleading affordability estimates, stale Tutorial/Tuck instructions during impact, and custom courses flying forever after the editor finish line. Custom routes now end cleanly using actual world travel, remain excluded from distance leaderboards, and reset correctly on retry. Imported courses can extend beyond 200m.
- Verification: 769 unit tests passed, 7 skipped (105 files passed, 1 skipped). Full browser run: 146 passed, 54 intentional skips, 20 failures; all 20 failures passed after corrections and fresh reruns. New menu/logbook/touch/custom-finish/impact regression cases: 13 passed, 1 intentional skip across the initial run and two corrective reruns. This is 179 distinct browser cases passing and 55 skipped across runs, not a single uninterrupted green suite. Tests now actually release the launcher before asserting airborne behavior. The endless-flight bot follows boss openings.
- Inspected 24 desktop/phone menu and Hangar captures: no page errors or document overflow. Used the supplied web-game client for boss/enemy captures and inspected rendered art. Dedicated QA simulator: inspected every Hangar section; purchased an upgrade, claimed mission/award rewards, checked saved Device Board scores and settings persistence; exercised Classic, Daily, Weekly, Tutorial, Journey, editor/share, pause/resume/menu, real pull/release, Tuck impact and retry. Recorded and inspected a native crash video. Three Journey routes completed with their stamp/objective/mastery results. Native vertical scrolling was not independently proven by the automation, so it is not counted as verified.
- Final web build and bundle budget passed (151,746 initial / 966,459 total JavaScript bytes); all 26 iOS web files matched exactly. Signed Release build 1.0.1 (9) succeeded.


## 2026-10-29 — Journey scroll restoration (work in progress)

- Reproduced a long Journey page reopening at its former scroll position (438px) after returning to the menu. `openJourney()` now resets the panel to the top before focus. Added a real-touch mobile regression for Journey and Hangar panning and reopening.
- The first version of the regression failed before the fix and passed afterward; focused unit checks passed 21 tests and the focused browser run passed 18 with 2 skips. Web build/bundle budget and 26-file iOS parity passed; the dedicated simulator built and launched the changed app.
- Native gesture verification remains incomplete: Xcode simulator remote automation timed out repeatedly and Device Hub could not deliver clicks even after restarting the dedicated simulator. Austin’s iPhone was unavailable to devicectl. The requested complete native playthrough, further gameplay/boss/enemy work, commit, production deployment, and phone installation remain outstanding. Do not treat the previous release's playthrough as verification of this change.
- Follow-up: Device Hub interaction resumed after raising the QA window. On the completed Journey page, a vertical drag and the Xcode scroll gesture produced no visible movement, so native vertical scrolling is still unresolved; a successful gesture tool response did not prove that content moved. The updated browser regression passed real-touch swipes down and up, return to top after reopening, and Hangar panning.


## 2026-10-29 — Native scrolling verification and route distance

- A simulator mirror sent a true native swipe: Journey scrolled to its bottom controls, returned to the menu, and reopened at the top. Hangar vertical scrolling and horizontal tabs also moved. The earlier Device Hub gesture did not reproduce real touch scrolling.
- On Easy, a 200m custom course previously finished at a displayed 170m because the score multiplier affected the label. The HUD and result now show actual course travel, capped at the authored finish; score calculations remain unchanged. The dedicated simulator displayed a 200m clean finish. Boss guidance now says to hold the line to earn the center bonus.
- Verification: 21 focused unit tests passed; 18 desktop/mobile browser cases passed, 2 intentionally skipped. The simulator completed all four Chapter 2 routes and its postcard, and tested real pull/release, scrolling, Hangar/editor and a custom finish. Web bundle budget and all 26 iOS asset parity checks passed. Build 1.0.1 (10) built for simulator and signed iPhone. Coverage is focused; not every mode and button was replayed in this pass.


## 2026-10-30 — Route editor control and keyboard access

- Flying objects in the route editor now use the player's chosen low (6m), middle (10m), or high (14m) height instead of a random value. The map labels flying-item heights; buildings remain on the ground. Canvas placement now follows the same inset distance grid used for drawing.
- Added a visible keyboard cursor and arrow/Enter/Space placement, with focus styling. Kept the iPhone Play route action above secondary controls so it is visible without scrolling. The existing share-code format is unchanged.
- Full unit suite: 770 passed, 7 skipped. The new editor flow passed desktop and mobile before the final action reorder, and the mobile test passed again after it. A dedicated iPhone simulator built and launched the final bundle; native controls selected 14m, placed a labelled star, launched the course, collected that star and reached the 200m clean finish. Web bundle budget and 26-file iOS parity passed. Signed iPhone build 1.0.1 (11) succeeded.
- The attempted 238-case browser suite was interrupted after startup failures under host load. Scissors, wind and stapler boss workshops passed in isolation; the Punch workshop and route-replay cases passed in subsequent isolated reruns. Do not treat the interrupted suite as a full pass. Further end-to-end play across every mode and renewed enemy/boss asset work remain open.
- Final editor verification after responsive layout adjustments: desktop and mobile placement-to-flight regression both passed; the Play action is fully visible in each tested viewport. The final native course placed and collected a 14m star and completed at 200m; a separate Classic flight reached 1,838m, ended on a bird and showed online submission. The full browser suite was attempted but interrupted after a timeout under load; 4 cases had passed, one timed out and 232 did not run. No claim of full-suite success.

## 2026-10-30 — Visible flight and physical launch

- User reported an empty 350m arrival and weak slingshot. Reproduced the plane being hidden by invulnerability and staying hidden when the run ended; a targeted regression failed against the prior behavior. The plane now remains visible during protection with a subtle light pulse, and endings restore visibility defensively.
- Fixed the slingshot anchors to stay in place while the actual plane moves under the pull, added band recoil and matched the release animation to the pulled position; launch power now provides a stronger short-lived forward speed boost. Keyboard, controller, cancellation and reduced motion remain supported.
- A dedicated simulator recording showed the plane at the 350m finish but revealed a stale boss banner and boost ribbon; endings now clear both. A dark Journey launch also exposed poor heading contrast, which has been adjusted.
- Verification: 770 unit tests passed (7 skipped); 24 targeted desktop/mobile browser cases passed, covering launch, flight visibility, pickups, boost, reduced motion, crash and arrival. The final iOS simulator build performed an actual pull-and-release and completed a 350m Journey with a visible shielded plane. An earlier native recording confirmed the plane is visible at route completion. Final web bundle budget and 26-file iOS parity passed. Signed iPhone build 1.0.1 (12) succeeded with exact asset parity; physical installation and production release verification remain pending.

## 2026-10-29 — Enemy warnings and boss feedback

- Dedicated iPhone QA simulator: a Classic run ended at 344m on scissors after an approach that was difficult to read. Investigation found that collision-warning rings were attached to a nested billboard but the animation looked for them on the parent; moving them exposed a scoped-variable bug, and the original torus orientation was edge-on to the camera. A mobile regression failed on the original code.
- Warnings now belong to the hazard, face the camera, keep at least the collision-envelope radius, and share a stable opacity even when distant hazards are hidden. Armored flyers have a thinner inner gold ring. The flight focus cue names the actual enemy or obstacle and uses a readable label.
- Boss instructions are cleared after a gate resolves, and a completed encounter cannot announce another warning while it retires. A focused regression failed with the old behavior.
- During native replay, a star lesson hid an imminent biplane warning. In-path threats now override the star lesson; distant/off-lane hazards do not. Marker projections now use the current camera and boss markers target the passage center, not the gate base. Regressions failed before each fix and passed afterward.
- A Desk Showdown simulator run spawned the generic scissors boss ahead of its authored stapler encounter. Journey now uses only its authored encounter timeline; Classic, Daily and Weekly retain their periodic bosses and gauntlets. Both Journey finales passed desktop/mobile regressions.
- Final verification: 773 unit tests passed (7 skipped); the 44-case browser matrix passed 38 with 6 intentional skips, and an additional gameplay/camera selection passed 4 with 4 skips. An attempted full 246-case run was interrupted after 30 passes and 1 skip to fix new simulator findings; it is not a full-suite pass. On the dedicated simulator, all four Chapter 2 routes and postcard completed, the finale showed Staple Press, the gate marker aligned, and Daily, Weekly, Tutorial, Tuck, pause/resume, global board, settings and Hangar scrolling were exercised. Web bundle budget and all 26 iOS files matched.
- Signed iPhone build 1.0.1 (13) succeeded, with bundled assets matching the verified iOS build. Production deployment and physical installation are pending at this entry; broader full-suite coverage remains open.

## 2026-10-29 — Journey shortcut encounters
- Reproduced impossible shortcut objectives: city and storm had no gates, sunset had one for a two-gate target, and harbor claimed three from two events.
- Scheduled two real gates on each non-finale shortcut route, queue overlapping scripted gates, and defer route completion until crossed gate encounters resolve. Preserve the native app's saved data; build version 14.
- Unit suite: 777 passed, 7 skipped. Focused desktop/mobile Journey and finale browser tests: 10 passed. Dedicated iPhone simulator: pulled and released the plane on the Sunset shortcut, saw the second gate after 350 m, and reached Route complete with objective 2/2 and the next stage unlocked. Signed device build and iOS bundled asset parity passed.
- Additional launch, crash, boss, menu, and touch-scroll browser checks: 33 passed, 7 skipped. Production touch launch, flight, pause and resume passed without page errors. The signed build installed and launched on the paired iPhone as 1.0.1 (14). GitHub Actions jobs could not start because the account is locked due to billing.

## 2026-10-29 — Red Dart race and sky-watch guide
- The rival objective previously claimed victory for every completed rival route and showed distance to the destination rather than a competitor. The race now compares the player's 500m crossing against a difficulty-scaled rival, keeps the result stable while boss gates resolve, and allows the route to complete after a loss. The route-goal card reports the actual lead and the visible rival moves with the race state without filling the camera.
- Generated a paper-craft hawk, biplane, and wasp concept image for the illustrated flight guide. The original prompt and provenance are in `docs/art/sky-watch-enemies.md`; in-flight hazard art and collision geometry remain unchanged.
- Dedicated simulator: completed Midnight Desk, Stapler Alley and the risky finale to its postcard; checked race HUD, guide image and touch scrolling, a real upgrade purchase, Classic (3315m, online score submitted), and Daily/Weekly/Tutorial launch and pause. The signed 1.0.1 (15) build installed and launched on the physical iPhone with iOS web parity.
- Unit: 780 passed, 7 skipped. Focused desktop/mobile Journey, enemy and guide browser checks: 22 passed; arrival regression: 2 passed. Full 266-case browser run: 210 passed and 56 skipped after updating the arrival test's stale finish timing assumption.

## 2026-10-29 — Flight threats, controls and ground
- Redrew the active flyer silhouettes and built distinct scissors, fan, stapler and punch surrounds while preserving each boss's elliptical collision opening. Narrowed the boss instruction card and added physical registration tabs outside the passage.
- Added a manual Ink Blast button with shared auto-fire cooldown, a visible Tuck charge, pointer capture, and a fix for untargeted darts steering toward the origin. Collision-warning rings are thinner, lose the redundant glow, and appear around approaching hazards in the flight corridor; armored enemies use an arc instead of another full ring.
- Added an image-generated Paper City ground illustration beneath the existing street layout, with a procedural fallback; enriched harbor and sunset ground plates. Image provenance and prompt are in `docs/art/paper-city-ground-v2.md`.
- Unit tests: 783 passed, 7 skipped. Focused control, boss and warning regressions passed on desktop and mobile. The dedicated simulator launched by pull-and-release, showed the new ground and scissors gate, exercised Ink and Tuck, and reached 2,326 m with a normal results screen. Web bundle budget and 28-file iOS parity passed; a signed build 1.0.1 (16) passed signature and bundled-asset checks. Full browser run and release actions remain in progress.
- Full browser run: 211 passed, 56 skipped, one fog-warning fixture failed because its nearby bird began outside the warning corridor. The fixture now freezes with a known in-path bird; all 18 repeated desktop/mobile warning checks passed. The fixture-only change left the production bundle hashes unchanged.

## 2026-10-29 — Journey routes and landscape refinement
- Seeded Journey lane variation now preserves the authored lane choices rather than collapsing lanes at the corridor edges. Formation and rooftop beats select their authored flight line and distinct flyer/scissor patterns; moving hazards retain their own wave's gap and collision radius when clamping motion.
- Added a generated Golden Fold ground illustration with mirrored wrapping and procedural fallback; refined Aurora and Midnight ground plates. Prompt and provenance are in `docs/art/golden-fold-ground-v1.md`.
- 785 unit tests passed, 7 skipped; final targeted desktop/mobile run passed 22 cases. Dedicated simulator completed Golden Fold with 2/2 gates, flew Midnight, and launched the final build in Classic; screenshot-reviewed Golden Fold and Aurora. Bundle budget and 29-file iOS parity passed. Full mode-by-mode native playthrough remains open.
