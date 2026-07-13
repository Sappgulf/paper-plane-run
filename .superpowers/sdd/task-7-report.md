# Task 7 — Runtime proof and feedback for upgrades

Status: DONE_WITH_CONCERNS

## Delivered

- Added `src/game/upgrade-runtime.js`, a pure runtime contract for control response, sink recovery, cruise speed, spawn thresholds, magnet pull, shield duration, collision/near-miss fairness, boost safety, guardian charges, weapon readiness, and trail feedback.
- Rewired the flight loop to consume those helpers for upgrade math. Wide Wings retains the shared `0.7` plane collision radius while only widening the visual plane and near-miss envelope.
- Added deterministic baseline-versus-max coverage for all eleven upgrades, including keyboard/stick/pointer/touch/tilt/custom response paths and seeded luck samples.
- Added visible runtime feedback: shield seconds, guardian charges (promoted to mobile primary HUD only while available), magnet-pull indicator, Turbo Fold safety cue, and Ink Blast ready/recharge state.
- Added max-upgrade desktop/mobile browser proof states and text-state assertions.

## Evidence

- RED: `npm test -- --run test/upgradeRuntime.test.js` failed as expected with `Cannot find module '../src/game/upgrade-runtime.js'` before production code existed.
- GREEN: `npm test -- --run test/upgradeRuntime.test.js test/upgrades.test.js` passed: 2 files, 40 tests.
- Browser: `CAPTURE_TASK7_PROOF=1 npx playwright test e2e/smoke.spec.js --grep "max upgrades expose deterministic"` passed: desktop and mobile, 2 tests in 25.1s, with no captured console errors.
- Production build: `npm run build` passed earlier in this Task 7 pass. Vite retained its existing >500 kB deferred-flight-engine warning.
- Required web-game client comparison completed with baseline/max text-state artifacts. Baseline reports handling `42`, sink `2.4`, shield `8s`, collision radius `0.7`, no guardian or weapon. Max reports handling `58.8`, sink `1.44`, shield `14.4s`, magnet catch radius `4.15`, plane scale `1.44`, unchanged collision radius `0.7`, Turbo safety `1.35s` / `0.60x`, guardian `2`, and Ink Blast ready at `0.38s` cooldown. The final client run produced no `errors-*.json` artifact.
- Inspected clean post-fix desktop/mobile shield and boost screenshots. Feedback remains readable; the mobile HUD shows guardian and shield/boost state without the unrelated seasonal startup toast.

## Concerns

- Per the user’s stop instruction, I did not run the remaining full-suite, bundle-budget, iOS build, or iOS-parity lanes after the final small proof-fixture/CSS changes. The report therefore does not claim a full release verification.
- The latest web-game client canvas captures were generated and their text state inspected, but were not re-opened for a second visual review after the interruption. The corresponding full-page desktop/mobile Playwright screenshots were inspected.

## Cleanup

- Generated `output/task-7-*` proof artifacts are transient and intentionally excluded from the commit.
