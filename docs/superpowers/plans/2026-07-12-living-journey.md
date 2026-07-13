# Living Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete four-flight Living Journey with route choices, pilots, a rival finale, persistent rewards, and a postcard album while preserving all existing game modes and iOS parity.

**Architecture:** Add a pure `journey.js` domain module and a versioned `journey-storage.js` persistence boundary. Existing Three.js gameplay receives Journey configuration through the current run-start path; DOM rendering remains in focused Journey UI functions invoked from `main.js`.

**Tech Stack:** Vanilla JavaScript, Three.js, Vite, Vitest, Playwright, Swift/WKWebView, XcodeGen.

## Global Constraints

- Browser and iOS must execute identical Journey domain, presentation, and gameplay code.
- Existing stars remain the only spendable plane-upgrade currency; stamps are collectible unlock progress.
- Journey state must be deterministic from its persisted seed and retry must never reroll a route.
- Corrupt Journey data may reset Journey only; it must preserve existing settings, stars, upgrades, missions, and records.
- Reward application must be idempotent by journey and step identifier.
- First release is one four-flight journey, two pilots, one rival, four route-choice pairs, one finale, and one postcard set.
- Existing Classic, Daily, Tutorial, Time Attack, Co-op, and Hot-seat behavior remains available.
- Every implementation task follows red-green-refactor and runs focused tests before continuing.

---

### Task 1: Journey Domain and Deterministic Routes

**Files:**
- Create: `src/journey.js`
- Create: `test/journey.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `PILOTS`, `JOURNEY_STEPS`, `createJourney(seed, now)`, `getRouteChoices(journey)`, `selectJourneyRoute(journey, routeId)`, `resolveJourneyFlight(journey, outcome)`, and `buildRunConfiguration(journey)`.
- `resolveJourneyFlight` consumes `{ completed, distance, stars, nearMisses, rivalBeaten }` and returns a new immutable Journey snapshot.

- [ ] **Step 1: Ignore visual-companion session artifacts**

Add `.superpowers/` to `.gitignore`, leaving the existing `.claude/` directory untouched.

- [ ] **Step 2: Write failing deterministic-domain tests**

Cover identical choices for identical seeds, distinct safe/risky cards, fixed retry selection, four-step advancement, crash reward rules, Navigator availability, Daredevil stamp lock, and postcard construction after step four.

- [ ] **Step 3: Verify the domain tests fail**

Run: `npx vitest run test/journey.test.js`
Expected: FAIL because `src/journey.js` does not exist.

- [ ] **Step 4: Implement the pure domain**

Use plain serializable objects. Route definitions contain `id`, `label`, `zone`, `modifier`, `risk`, `rewardMultiplier`, and `stampId`. Journey snapshots contain `version`, `id`, `seed`, `createdAt`, `stepIndex`, `pilotId`, `selectedRouteId`, `completedRouteIds`, `earnedStampIds`, `mastery`, `status`, and optional `postcard`.

- [ ] **Step 5: Verify the domain tests pass**

Run: `npx vitest run test/journey.test.js`
Expected: all Journey domain tests pass.

### Task 2: Versioned Persistence and Recovery

**Files:**
- Create: `src/journey-storage.js`
- Create: `test/journey-storage.test.js`

**Interfaces:**
- Consumes: Journey snapshots from `src/journey.js`.
- Produces: `JOURNEY_STORAGE_KEY`, `loadJourney(storage)`, `saveJourney(storage, journey)`, `clearJourney(storage)`, and `applyJourneyRewardOnce(storage, reward)`.

- [ ] **Step 1: Write failing persistence tests**

Test valid round trips, malformed JSON, unknown versions, invalid step bounds, unknown pilots, missing route content, and duplicate reward identifiers.

- [ ] **Step 2: Verify the persistence tests fail**

Run: `npx vitest run test/journey-storage.test.js`
Expected: FAIL because the persistence module does not exist.

- [ ] **Step 3: Implement validation and idempotency**

Store Journey under `paper-plane-run-journey-v1` and reward receipts under `paper-plane-run-journey-receipts-v1`. Return `{ journey, recovered }` from `loadJourney`; recovery returns `journey: null` and never removes unrelated keys.

- [ ] **Step 4: Verify persistence tests pass**

Run: `npx vitest run test/journey-storage.test.js`
Expected: all persistence tests pass.

### Task 3: Journey Map and Route-Choice Interface

**Files:**
- Create: `src/journey-ui.js`
- Create: `test/journey-ui.test.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: Journey snapshots and route cards from `src/journey.js`.
- Produces: `renderJourneyMap(root, model, handlers)`, `renderRouteChoices(root, cards, onSelect)`, `renderJourneyProgress(root, model)`, and `showJourneyRecoveryToast()`.

- [ ] **Step 1: Write failing UI rendering tests**

Assert four map stops, current-step state, two route cards, text-and-icon risk communication, pilot/rival/stamp summary, and safe button callbacks.

- [ ] **Step 2: Verify UI tests fail**

Run: `npx vitest run test/journey-ui.test.js`
Expected: FAIL because Journey UI functions do not exist.

- [ ] **Step 3: Add Journey DOM surfaces**

Add `journey-btn`, `journey-panel`, `journey-map`, `journey-route-choices`, and `journey-progress` elements. Journey becomes the dominant main-menu action; Classic remains a visible secondary action.

- [ ] **Step 4: Implement responsive rendering**

Render cards side by side above 700px and stacked below 700px. Preserve safe areas, reduced motion, large touch targets, and color-independent risk labels.

- [ ] **Step 5: Wire creation, resume, selection, and saving**

On Journey entry, resume valid state or create one with a generated integer seed. Save immediately after creation and route selection. A selected route starts through the shared game-start function.

- [ ] **Step 6: Verify UI and existing menu tests pass**

Run: `npx vitest run test/journey-ui.test.js test/firstFlight.test.js test/settings.test.js`
Expected: all focused tests pass.

### Task 4: Gameplay Modifiers and Pilot Side-Grades

**Files:**
- Create: `src/journey-modifiers.js`
- Create: `test/journey-modifiers.test.js`
- Modify: `src/main.js`
- Modify: `src/zones.js`

**Interfaces:**
- Consumes: `buildRunConfiguration(journey)`.
- Produces: `applyJourneyModifier(base, config)`, `getPilotEffect(pilotId, telemetry)`, and `getJourneyRewardMultiplier(config)`.

- [ ] **Step 1: Write failing modifier tests**

Cover crosswind, moving formation, low visibility, star trail, shortcut gates, capped Daredevil near-miss momentum, and Navigator shortcut metadata.

- [ ] **Step 2: Verify modifier tests fail**

Run: `npx vitest run test/journey-modifiers.test.js`
Expected: FAIL because modifier functions do not exist.

- [ ] **Step 3: Implement configuration-only modifiers**

Modifiers adjust existing spawn, wind, fog, star, and gate parameters. They do not create a second animation loop or bypass difficulty settings.

- [ ] **Step 4: Feed Journey through the shared run start**

Extend the existing `startGame` path to accept an optional Journey run configuration. Existing callers receive unchanged defaults.

- [ ] **Step 5: Resolve and persist outcomes**

On crash or completion, pass run telemetry to `resolveJourneyFlight`, apply rewards once, save, and render Journey progress after the immediate run result.

- [ ] **Step 6: Verify modifiers and mode regressions**

Run: `npx vitest run test/journey-modifiers.test.js test/firstFlight.test.js test/pause.test.js test/twists.test.js`
Expected: all focused tests pass.

### Task 5: Rival, Finale, and Journey HUD

**Files:**
- Create: `src/journey-rival.js`
- Create: `test/journey-rival.test.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `createRivalState(config)`, `sampleRivalPosition(state, distance)`, `getRivalDelta(state, playerDistance)`, and `getRivalCallout(state, milestone)`.

- [ ] **Step 1: Write failing rival tests**

Assert deterministic samples, stable delta calculation, milestone-only callouts, reduced-motion metadata, and finale completion criteria.

- [ ] **Step 2: Verify rival tests fail**

Run: `npx vitest run test/journey-rival.test.js`
Expected: FAIL because rival functions do not exist.

- [ ] **Step 3: Implement the Red Dart rival**

Render a distinct ghost plane from deterministic samples. Use one signature lateral interference pattern in the finale and reuse existing boss-gate infrastructure for its final stage.

- [ ] **Step 4: Add low-chrome Journey HUD**

Add a compact route label, rival delta, and timed paper-note callout. Hide them outside Journey and suppress callout animation under reduced motion.

- [ ] **Step 5: Verify rival tests and render build**

Run: `npx vitest run test/journey-rival.test.js && npm run build`
Expected: tests pass and Vite build exits zero.

### Task 6: Postcard Rewards, Pilot Mastery, and Album

**Files:**
- Create: `src/journey-postcards.js`
- Create: `test/journey-postcards.test.js`
- Modify: `src/journey-ui.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `buildPostcard(journey, summary)`, `loadPostcardAlbum(storage)`, `savePostcardOnce(storage, postcard)`, and `renderPostcardAlbum(root, postcards)`.

- [ ] **Step 1: Write failing postcard and mastery tests**

Cover route path, totals, rival result, stamps, completion date, pilot identity, perfect-stamp flourish, Daredevil unlock, and duplicate-save prevention.

- [ ] **Step 2: Verify postcard tests fail**

Run: `npx vitest run test/journey-postcards.test.js`
Expected: FAIL because postcard functions do not exist.

- [ ] **Step 3: Implement postcard construction and album storage**

Use `paper-plane-run-postcards-v1`. A postcard ID derives from journey ID and completion timestamp; saving the same ID twice is a no-op.

- [ ] **Step 4: Add postcard reveal and Hangar album**

Show a completed postcard after the finale and add a Postcards tab to the Hangar. Keep crash polaroids labeled as single-run photos and Journey postcards as four-flight records.

- [ ] **Step 5: Implement pilot selection and mastery display**

Navigator is available immediately. Daredevil unlocks at the specified stamp threshold. Locked pilot UI explains the requirement and never consumes stamps.

- [ ] **Step 6: Verify postcard and Hangar tests**

Run: `npx vitest run test/journey-postcards.test.js test/upgrades.test.js test/skins.test.js`
Expected: all focused tests pass.

### Task 7: Analytics, Browser Journey Smoke, and Accessibility

**Files:**
- Modify: `src/analytics.js`
- Modify: `e2e/smoke.spec.js`
- Modify: `src/style.css`
- Modify: `README.md`

**Interfaces:**
- Emits: `journey_started`, `journey_route_offered`, `journey_route_selected`, `journey_flight_completed`, `journey_flight_crashed`, `journey_rival_beaten`, `journey_postcard_completed`, and `journey_restarted`.

- [ ] **Step 1: Add failing Playwright Journey flows**

Test desktop and mobile entry, route selection, flight start, retry stability, reload persistence, Hangar postcard navigation, and unaffected Classic start.

- [ ] **Step 2: Run Journey smoke to verify failure**

Run: `npx playwright test e2e/smoke.spec.js --grep Journey`
Expected: FAIL until the complete UI flow exists.

- [ ] **Step 3: Add non-blocking analytics and accessibility polish**

Emit content identifiers and aggregate outcomes only. Add accessible names, focus handling, reduced-motion behavior, safe-area spacing, and text equivalents for risk/reward.

- [ ] **Step 4: Update product documentation**

Document Journey, pilots, rivals, stamps, postcards, route choices, and the shared browser/iOS release contract in `README.md`.

- [ ] **Step 5: Run complete browser verification**

Run: `npm test && npm run build && npm run test:e2e`
Expected: unit suite passes, Vite build succeeds, and all applicable Playwright tests pass.

### Task 8: iOS Parity, Simulator Playtest, Release, and Phone Install

**Files:**
- Modify only if verification exposes a platform-specific defect: `ios/PaperPlaneRun/Sources/GameView.swift`

**Interfaces:**
- Consumes the same Vite Journey bundle; no separate native Journey implementation is permitted.

- [ ] **Step 1: Build and verify the iOS payload**

Run: `npm run ios:generate && npm run verify:ios-parity`
Expected: Xcode project generation succeeds and every bundled file matches.

- [ ] **Step 2: Build and launch the simulator app**

Use the iPhone 17 Pro simulator through XcodeBuildMCP. Confirm Journey map, route selection, flight, result, Hangar, pilot selection, and postcard album with screenshots.

- [ ] **Step 3: Run final repository verification**

Run: `git diff --check && npm test && npm run build && npm run build:ios && npm run verify:ios-parity && npm run test:e2e`
Expected: zero failures; Vite's existing bundle-size warning may remain informational.

- [ ] **Step 4: Produce a signed physical-device Release build**

Build scheme `PaperPlaneRun` for Austin's paired iPhone using the existing wildcard provisioning profile and automatic signing. Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Commit and push the verified source**

Commit the implementation and plan with a message describing Living Journey, then push `main` to `origin`. Confirm local and remote SHAs match.

- [ ] **Step 6: Deploy the pushed source to Vercel**

Create a Vercel preview deployment and confirm its state is `Ready`. Production promotion requires an explicit production request.

- [ ] **Step 7: Fresh-install the signed app**

Uninstall `com.sappgulf.paperplanerun`, install the signed Release `.app`, launch it, confirm version/build, and confirm the PaperPlaneRun process is running on Austin's iPhone.
