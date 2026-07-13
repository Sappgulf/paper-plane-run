# Task 7 — Runtime proof and feedback for upgrades

Status: DONE_WITH_CONCERNS

## Delivered

- Added `src/game/upgrade-runtime.js`, a pure runtime contract for control response, sink recovery, cruise speed, spawn thresholds, magnet pull, shield duration, collision/near-miss fairness, boost safety, guardian charges, weapon readiness, and trail feedback.
- Rewired the flight loop to consume those helpers for upgrade math. Wide Wings retains the shared `0.7` plane collision radius while only widening the visual plane and near-miss envelope.
- Added deterministic baseline-versus-max coverage for all eleven upgrades, including keyboard/stick/pointer/touch/tilt/custom response paths and seeded luck samples.
- Added visible runtime feedback: shield seconds, guardian charges (promoted to mobile primary HUD only while available), magnet-pull indicator, Turbo Fold safety cue, and Ink Blast ready/recharge state.
- Added max-upgrade desktop/mobile browser proof states and text-state assertions.
- Added deterministic browser integration against the live flight loop: a seeded Journey star-trail fixture calls the real `spawnChunk`, fixed-radius near/hit fixtures cross the real collision path, and Ink Blast input crosses the real fire/cooldown update path.
- Cached upgrade effects at engine boot and refreshed them at run reset, then passed/reused the cached effects through spawning, controls, powers, collision feedback, guardian saves, weapon feedback, and text-state. A browser assertion verifies flight ticks do not reread upgrade storage.
- Updated text-state to report the active settings sensitivity and actual Daily/Journey `starMul`, removed per-frame magnet feedback from the live region, shared one shield base-duration constant, and disabled shield/phase JS flicker under reduced motion.

## Evidence

- RED: `npm test -- --run test/upgradeRuntime.test.js` failed as expected with `Cannot find module '../src/game/upgrade-runtime.js'` before production code existed.
- GREEN: `npm test -- --run test/upgradeRuntime.test.js test/upgrades.test.js` passed: 2 files, 40 tests.
- Browser: `CAPTURE_TASK7_PROOF=1 npx playwright test e2e/smoke.spec.js --grep "max upgrades expose deterministic"` passed: desktop and mobile, 2 tests in 25.1s, with no captured console errors.
- Production build: `npm run build` passed earlier in this Task 7 pass. Vite retained its existing >500 kB deferred-flight-engine warning.
- Required web-game client comparison completed with baseline/max text-state artifacts. Baseline reports handling `42`, sink `2.4`, shield `8s`, collision radius `0.7`, no guardian or weapon. Max reports handling `58.8`, sink `1.44`, shield `14.4s`, magnet catch radius `4.15`, plane scale `1.44`, unchanged collision radius `0.7`, Turbo safety `1.35s` / `0.60x`, guardian `2`, and Ink Blast ready at `0.38s` cooldown. The final client run produced no `errors-*.json` artifact.
- Inspected clean post-fix desktop/mobile shield and boost screenshots. Feedback remains readable; the mobile HUD shows guardian and shield/boost state without the unrelated seasonal startup toast.
- Review-fix RED: `npm test -- --run test/upgradeRuntime.test.js` failed with runtime follow `0.366666...` versus expected `0.275`, proving the snapshot still ignored the active `0.75` sensitivity before the fix. The first live browser run likewise failed on the same hardcoded value before the live fixtures and text-state plumbing were completed.
- Review-fix focused unit: `npm test -- --run test/upgradeRuntime.test.js` passed all 6 upgrade-runtime tests after the fix.
- Review-fix focused browser integration: `npx playwright test e2e/smoke.spec.js --project=desktop --grep "max upgrades expose|live flight loop wires|reuse cached upgrade effects|reduced motion keeps"` covers max feedback/accessibility, actual Journey multiplier plus seeded spawning, safe-versus-hit collision outcomes, Ink Blast fire/recharge, zero per-frame upgrade-storage reads, and stable reduced-motion shield/phase feedback.
- Full unit: `npm test` passed 30 files and 152 tests.
- Bundle budget: `npm run verify:bundle-budget` passed at 79,415 initial bytes and 747,218 total bytes against the 819,200-byte limits.

## Concerns

- Per the user’s final instruction, the required web-game client was not rerun after these review fixes. Its baseline/max text-state and inspected desktop/mobile visual proof remain from the prior Task 7 pass, so this report does not claim exact-final canvas proof for the review-fix commit.
- Exact-final iOS build/parity and a broader all-project Playwright run were not requested or rerun. The review-fix browser lane is focused and desktop-only; prior max-upgrade proof remains desktop/mobile.

## Cleanup

- Generated `output/task-7-*` proof artifacts are transient and intentionally excluded from the commit.
- Ignored Playwright failure traces from the RED review-fix runs were removed before commit.
