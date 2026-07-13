# Living Journey Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Living Journey with deterministic multi-stage encounters, idempotent pilot mastery, generated destination artwork, and interactive postcards while keeping browser and iOS behavior identical.

**Architecture:** A pure encounter director produces a deterministic timeline consumed by the existing Three.js runtime. One immutable run outcome resolves Journey progression, mastery receipts, cosmetics, and postcard metadata; DOM presentation reads those records without calculating rewards. Stable artwork IDs resolve to optimized files bundled by both Vite targets.

**Tech Stack:** Vanilla JavaScript, Three.js, Vite, Vitest, Playwright, OpenAI Image API, Swift/WKWebView, XcodeGen.

## Global Constraints

- Use the balanced-hybrid tone: authored arrival, escalation, and signature stages with seeded lane and timing variation.
- Classic, Daily, Tutorial, Time Attack, Co-op, and Hot-seat retain their current rules.
- Stars remain the only spendable upgrade currency; mastery rewards are cosmetic or informational.
- The active Journey migrates from version 1 to version 2 without losing progress.
- Reward and mastery resolution is idempotent by stable run receipt.
- The center and lower-middle flight corridor stay clear of persistent UI.
- Generated artwork contains no typography, logos, or watermarks and uses stable runtime paths.
- Browser and iOS execute the identical Journey domain, gameplay, UI, and artwork bundle.
- Preserve the user-owned untracked `.claude/` directory.

---

### Task 1: Deterministic Encounter Director

**Files:**
- Create: `src/journey-encounters.js`
- Create: `test/journey-encounters.test.js`
- Modify: `src/journey.js`
- Modify: `test/journey.test.js`

**Interfaces:**
- Consumes: Journey run configuration from `buildRunConfiguration(journey)`.
- Produces: `ENCOUNTER_STAGES`, `OBJECTIVES`, `buildEncounterTimeline(config)`, `getEncounterEventsAtDistance(timeline, previousDistance, distance)`, and `resolveJourneyObjective(objective, telemetry)`.

- [ ] **Step 1: Write failing encounter tests**

```js
it('builds ordered deterministic arrival, escalation, and signature events', () => {
  const config = { seed: 42, zone: 'harbor', modifier: 'shortcut-gates', routeId: 'harbor-risky', finale: false }
  const a = buildEncounterTimeline(config)
  const b = buildEncounterTimeline(config)
  expect(a).toEqual(b)
  expect(a.events.map((event) => event.stage)).toEqual(expect.arrayContaining(['arrival', 'escalation', 'signature']))
  expect(a.events.every((event, index) => index === 0 || event.distance >= a.events[index - 1].distance)).toBe(true)
})

it('resolves shortcut objectives at the exact required gate count', () => {
  const objective = { id: 'gate-run', kind: 'shortcut-gates', target: 3 }
  expect(resolveJourneyObjective(objective, { shortcutGatesCleared: 2 }).completed).toBe(false)
  expect(resolveJourneyObjective(objective, { shortcutGatesCleared: 3 }).completed).toBe(true)
})
```

- [ ] **Step 2: Verify the encounter tests fail**

Run: `npx vitest run test/journey-encounters.test.js`  
Expected: FAIL because `src/journey-encounters.js` does not exist.

- [ ] **Step 3: Implement the encounter director**

Define constrained event records with this shape:

```js
{
  id: `${config.routeId}:arrival:0`,
  stage: 'arrival',
  distance: 55,
  type: 'formation',
  lanes: [-1, 0, 1],
  params: { direction: 1, speed: 2.4 },
}
```

Use a local seeded hash derived from `config.seed`, stage index, and variant index. Harbor produces gust and gate events, Storm produces visibility and reveal events, City produces formation and rooftop-gap events, and Aurora produces rival and boss-gate events. Clamp event distances to `40...460`, lane values to `-1...1`, and objective targets to reachable values.

- [ ] **Step 4: Extend Journey run configuration**

Add `attemptId`, `objective`, and `encounterSeed` to `buildRunConfiguration`. The attempt ID is `${journey.id}:${route.id}:${journey.attemptNumber || 1}`. Add `attemptNumber: 1` to new version-2 Journeys and increment it only after a crash is resolved.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run test/journey-encounters.test.js test/journey.test.js`  
Expected: both files pass with deterministic timelines, retry stability, and four destination mappings.

- [ ] **Step 6: Commit the encounter domain**

```bash
git add src/journey.js src/journey-encounters.js test/journey.test.js test/journey-encounters.test.js
git commit -m "feat: add deterministic Journey encounters"
```

### Task 2: Journey v2 Migration and Pilot Mastery

**Files:**
- Create: `src/journey-mastery.js`
- Create: `src/journey-mastery-storage.js`
- Create: `test/journey-mastery.test.js`
- Modify: `src/journey-storage.js`
- Modify: `test/journey-storage.test.js`

**Interfaces:**
- Consumes: `{ receiptId, pilotId, completed, risky, rivalBeaten, shieldUsed, nearMisses, shortcutGatesCleared, destinationId }`.
- Produces: `MASTERY_VERSION`, `PILOT_MASTERY`, `createMasteryState()`, `resolveMasteryOutcome(state, outcome)`, `getPilotMasteryView(state, pilotId)`, `loadMastery(storage)`, and `saveMastery(storage, state)`.

- [ ] **Step 1: Write failing migration and mastery tests**

```js
it('migrates a valid v1 Journey without losing progress', () => {
  localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ ...createJourney(7, 1000), version: 1, stepIndex: 2 }))
  const result = loadJourney(localStorage)
  expect(result.journey.version).toBe(2)
  expect(result.journey.stepIndex).toBe(2)
  expect(result.journey.attemptNumber).toBe(1)
})

it('applies one mastery receipt once', () => {
  const outcome = { receiptId: 'j:r:1', pilotId: 'daredevil', nearMisses: 8, risky: true }
  const once = resolveMasteryOutcome(createMasteryState(), outcome)
  const twice = resolveMasteryOutcome(once, outcome)
  expect(twice).toEqual(once)
  expect(getPilotMasteryView(once, 'daredevil').level).toBe(1)
})
```

- [ ] **Step 2: Verify the new tests fail**

Run: `npx vitest run test/journey-storage.test.js test/journey-mastery.test.js`  
Expected: FAIL because version-2 migration and mastery modules are absent.

- [ ] **Step 3: Implement scoped Journey migration**

Set `JOURNEY_VERSION = 2`. Normalize version-1 records by preserving existing fields and adding:

```js
{
  version: 2,
  attemptNumber: 1,
  lastOutcomeReceiptId: null,
}
```

Reject unknown future versions. Remove only the Journey key when recovery fails.

- [ ] **Step 4: Implement pure mastery resolution**

Store mastery counters per pilot and a capped list of 300 receipt IDs. Unlock exact cosmetic IDs:

```js
['milo-portrait-route-reader', 'milo-map-trail', 'milo-compass-border']
['pip-portrait-close-call', 'pip-ember-trail', 'pip-foil-border']
```

Levels derive from the approved thresholds; cosmetics are recomputed from counters so stored state cannot claim an impossible unlock.

- [ ] **Step 5: Implement mastery persistence**

Use `paper-plane-run-journey-mastery-v1`. Invalid mastery resets only this key and returns `{ mastery: createMasteryState(), recovered: true }`.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run test/journey-storage.test.js test/journey-mastery.test.js test/journey.test.js`  
Expected: all pass, including duplicate-receipt and corrupt-storage cases.

- [ ] **Step 7: Commit migration and mastery**

```bash
git add src/journey.js src/journey-storage.js src/journey-mastery.js src/journey-mastery-storage.js test/journey.test.js test/journey-storage.test.js test/journey-mastery.test.js
git commit -m "feat: add Journey mastery progression"
```

### Task 3: Runtime Encounters and Objective Telemetry

**Files:**
- Modify: `src/main.js`
- Modify: `src/journey-modifiers.js`
- Modify: `test/journey-modifiers.test.js`
- Modify: `index.html`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `buildEncounterTimeline(journeyRunConfig)` and event records from Task 1.
- Produces: runtime `journeyTelemetry`, encounter execution, objective HUD, and one immutable outcome submitted during finalization.

- [ ] **Step 1: Add failing modifier contract tests**

Assert moving formations expose motion parameters, low visibility exposes pocket timing, and shortcut routes expose required and bonus gate counts. Run `npx vitest run test/journey-modifiers.test.js` and confirm failure before changing implementation.

- [ ] **Step 2: Add runtime state boundaries**

At reset, initialize:

```js
journeyTimeline = journeyRunConfig ? buildEncounterTimeline(journeyRunConfig) : null
journeyTelemetry = {
  nearMisses: 0,
  shortcutGatesCleared: 0,
  shortcutGatesTotal: 0,
  shieldUsed: false,
  collectedJourneyStars: 0,
  rivalBeaten: false,
  completedEventIds: [],
}
journeyPreviousDistance = 0
```

Classic and non-Journey runs keep these values null.

- [ ] **Step 3: Adapt encounter events to existing spawners**

Dispatch events once when distance crosses their trigger. Reuse `spawnMiniGauntlet`, boss gates, wind state, entities, and star spawning. Add only focused adapters for moving formation motion, visibility pockets, and shortcut-gate completion.

- [ ] **Step 4: Add objective HUD**

Add `#journey-objective-hud` beside the primary HUD edge cluster. It shows one line such as `Gates 2/3` and is hidden outside Journey. Do not add mastery, route history, or postcard information during flight.

- [ ] **Step 5: Resolve one immutable run outcome**

During finalization construct:

```js
const journeyOutcome = {
  receiptId: journeyRunConfig.attemptId,
  pilotId: journeyRunConfig.pilotId,
  routeId: journeyRunConfig.routeId,
  destinationId: journeyRunConfig.zone,
  completed: crashReason === 'Journey route complete!',
  risky: journeyRunConfig.risk === 'risky',
  distance: d,
  stars,
  ...journeyTelemetry,
}
```

Resolve the objective, Journey progression, mastery, and rewards from this object and save all records before revealing results.

- [ ] **Step 6: Add Daredevil and Navigator runtime side-grades**

Navigator renders gate-order previews and formation entry direction. Daredevil adds at most `12%` cruise momentum after qualifying near-miss chains and resets the bonus when the chain expires.

- [ ] **Step 7: Verify build and regression tests**

Run: `npx vitest run test/journey-encounters.test.js test/journey-modifiers.test.js test/journey-mastery.test.js test/firstFlight.test.js test/pause.test.js test/twists.test.js && npm run build`  
Expected: all focused tests and Vite build pass.

- [ ] **Step 8: Commit runtime encounters**

```bash
git add src/main.js src/journey-modifiers.js test/journey-modifiers.test.js index.html src/style.css
git commit -m "feat: bring Journey encounters into flight"
```

### Task 4: Mastery and Journey Results UI

**Files:**
- Modify: `src/journey-ui.js`
- Modify: `test/journey-ui.test.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `getPilotMasteryView`, objective result, and mastery delta from final outcome.
- Produces: `renderPilotMastery`, `renderJourneyResultProgress`, pilot goal copy, and transient mastery unlock notifications.

- [ ] **Step 1: Write failing UI tests**

Test that pilot cards show level and next goal, locked rewards are explained, completion results show objective and mastery delta, and risk is communicated with text and icons.

- [ ] **Step 2: Verify UI tests fail**

Run: `npx vitest run test/journey-ui.test.js`  
Expected: FAIL because mastery renderers and copy are absent.

- [ ] **Step 3: Implement mastery rendering**

Extend pilot cards with `Level N`, a compact progress meter, next-goal copy, and next cosmetic label. Keep pilot selection as the card's primary action and use semantic progress attributes.

- [ ] **Step 4: Implement result progress**

Add a Journey-only result block below the immediate score containing stamp, objective outcome, mastery delta, and newly unlocked cosmetic. Hide it for every other mode and on Journey crashes with no mastery progress.

- [ ] **Step 5: Add responsive and reduced-motion polish**

At compact heights, mastery details collapse below the selected pilot. Unlock animation uses one paper-stamp motion; reduced motion uses color/outline state change with no transform.

- [ ] **Step 6: Run focused tests and build**

Run: `npx vitest run test/journey-ui.test.js test/settings.test.js && npm run build`  
Expected: tests and build pass.

- [ ] **Step 7: Commit mastery UI**

```bash
git add src/journey-ui.js test/journey-ui.test.js src/main.js index.html src/style.css
git commit -m "feat: show Journey pilot mastery"
```

### Task 5: Generate and Integrate Destination Artwork

**Files:**
- Create: `public/assets/journey/city-postcard.webp`
- Create: `public/assets/journey/harbor-postcard.webp`
- Create: `public/assets/journey/storm-postcard.webp`
- Create: `public/assets/journey/aurora-postcard.webp`
- Create: `src/journey-art.js`
- Create: `test/journey-art.test.js`

**Interfaces:**
- Produces: `JOURNEY_ART`, `getJourneyArtwork(destinationId)`, four optimized `1536x1024` source-aspect WebP assets, and CSS-safe stable paths.

- [ ] **Step 1: Confirm ImageGen environment and batch contract**

Check `OPENAI_API_KEY` without printing it and read the ImageGen CLI reference. Create `tmp/imagegen/journey-postcards.jsonl` with four `stylized-concept` jobs. Every prompt specifies handcrafted layered paper diorama, destination subject, warm tactile materials, wide composition with central subject safety, no people, no typography, no logo, and no watermark.

- [ ] **Step 2: Generate the four source images in one batch**

Run the bundled `scripts/image_gen.py` batch command with `gpt-image-1.5`, landscape size, high quality, and output under `output/imagegen/journey-postcards/`. Delete the temporary JSONL after generation.

- [ ] **Step 3: Inspect every generated image**

Open all four files. Reject and regenerate any image containing text, inconsistent rendering style, weak destination distinction, cropped focal subjects, or muddy mobile silhouettes.

- [ ] **Step 4: Optimize stable runtime assets**

Use the bundled image runtime or existing image utilities to center-crop each selected source to `1536x1024`, convert to WebP at visually lossless quality, and write the four stable filenames under `public/assets/journey/`.

- [ ] **Step 5: Write artwork registry tests and implementation**

```js
it.each(['city', 'harbor', 'storm', 'aurora'])('resolves %s artwork to a bundled stable path', (id) => {
  expect(getJourneyArtwork(id).src).toMatch(new RegExp(`/assets/journey/${id}-postcard\\.webp$`))
})
```

Run the test before and after implementing `JOURNEY_ART` and safe fallback metadata.

- [ ] **Step 6: Verify web and iOS asset inclusion**

Run: `npm run build && npm run ios:generate && npm run verify:ios-parity`  
Expected: build passes and parity includes the four Journey WebP files.

- [ ] **Step 7: Commit destination artwork**

```bash
git add public/assets/journey src/journey-art.js test/journey-art.test.js
git commit -m "feat: add illustrated Journey destinations"
```

### Task 6: Interactive Postcard Reveal and Album

**Files:**
- Modify: `src/journey-postcards.js`
- Modify: `test/journey-postcards.test.js`
- Modify: `src/journey-ui.js`
- Modify: `test/journey-ui.test.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: Journey v2 completion, artwork registry, mastery cosmetics, and objective outcomes.
- Produces: `normalizePostcard`, `buildPostcardShareModel`, `renderPostcardReveal`, `renderPostcardAlbum`, and `renderPostcardDetail`.

- [ ] **Step 1: Write failing postcard migration and UI tests**

Cover legacy normalization, invalid-card skipping, artwork IDs, objective history, mastery decorations, perfect status, detail opening, reveal actions, and share fallback copy.

- [ ] **Step 2: Verify postcard tests fail**

Run: `npx vitest run test/journey-postcards.test.js test/journey-ui.test.js`  
Expected: FAIL because expansion metadata and interactive renderers are absent.

- [ ] **Step 3: Implement per-card normalization**

Legacy cards receive neutral defaults:

```js
{
  artworkId: card.routePath?.at(-1)?.split('-')[0] || 'city',
  objectiveResults: [],
  masteryLevel: 0,
  decorationIds: [],
}
```

Skip only cards without a stable ID or Journey ID. Preserve valid neighboring cards.

- [ ] **Step 4: Add reveal and detail DOM surfaces**

Add `#postcard-reveal` and `#postcard-detail` overlays with close, continue, and share actions. Both use `<img>` with meaningful destination alt text, a CSS paper fallback, focus restoration, safe-area padding, and vertical scrolling.

- [ ] **Step 5: Implement album artwork grid**

Cards show destination artwork, pilot, completion date, stamps, and perfect/rival badges. Clicking a card opens details instead of embedding all metadata in the grid.

- [ ] **Step 6: Implement sharing fallback**

Prefer the existing native/browser share path. When file sharing is unavailable, share a compact text summary containing route path, total distance, stars, pilot, and rival result. Sharing failure keeps the detail open.

- [ ] **Step 7: Run focused tests and build**

Run: `npx vitest run test/journey-postcards.test.js test/journey-ui.test.js test/journey-art.test.js && npm run build`  
Expected: tests and build pass.

- [ ] **Step 8: Commit postcard world**

```bash
git add src/journey-postcards.js test/journey-postcards.test.js src/journey-ui.js test/journey-ui.test.js src/main.js index.html src/style.css
git commit -m "feat: expand Journey postcards"
```

### Task 7: Browser Automation, Accessibility, and Documentation

**Files:**
- Modify: `e2e/smoke.spec.js`
- Modify: `README.md`
- Modify: `progress.md`

**Interfaces:**
- Verifies: route entry, encounters, mastery, postcard reveal/detail, persistence, reduced motion, and unaffected Classic start.

- [ ] **Step 1: Initialize progress tracking**

If `progress.md` is absent, create it with `Original prompt: 1-3! Use skills needed, imagegen, computer! Build, test and polish! When finished push and commit! Then deploy to vercel!`. Append implementation commits, test evidence, screenshot paths, defects, and fixes after each remaining chunk.

- [ ] **Step 2: Add deterministic test hooks**

Expose `window.render_game_to_text()` with mode, distance, player position, active Journey objective, visible encounter IDs, telemetry counters, and result state. Expose `window.advanceTime(ms)` only in non-production test mode and advance fixed `1/60` updates.

- [ ] **Step 3: Add Playwright expansion flows**

Test desktop and mobile map/mastery rendering, Journey start, active objective HUD, encounter text state, reload persistence, postcard reveal/detail, reduced motion, compact-height scrolling, share fallback, and Classic regression.

- [ ] **Step 4: Run the required web-game client**

Start Vite and run `$WEB_GAME_CLIENT` with short input bursts and pauses for City, Harbor, Storm, and Aurora scenarios. Capture screenshots and text output after menu, encounter, result, and postcard states.

- [ ] **Step 5: Inspect every representative screenshot**

Open desktop and mobile screenshots. Verify destination art crops, flight-corridor clearance, HUD readability, encounter silhouettes, mastery result hierarchy, postcard reveal, and album detail. Fix the first visible defect and rerun until clean.

- [ ] **Step 6: Run the full browser suite**

Run: `npm test && npm run build && npm run test:e2e`  
Expected: all unit tests pass, production build exits zero, and all applicable desktop/mobile Playwright cases pass with only explicit project skips.

- [ ] **Step 7: Update documentation and commit**

Document encounter stages, mastery cosmetics, postcards, stable artwork, and cross-platform parity in `README.md`. Append final browser proof to `progress.md`.

```bash
git add e2e/smoke.spec.js README.md progress.md src/main.js
git commit -m "test: cover expanded Living Journey"
```

### Task 8: iOS Proof, Merge, Push, Deploy, and Fresh Install

**Files:**
- Generated and ignored: `ios-dist/`, `ios/PaperPlaneRun/web/`, `ios/PaperPlaneRun.xcodeproj/`

**Interfaces:**
- Verifies and releases the exact merged shared runtime.

- [ ] **Step 1: Regenerate and verify iOS payload**

Run: `npm run ios:generate && npm run verify:ios-parity`  
Expected: iOS build succeeds and every generated payload file matches its synchronized bundle copy.

- [ ] **Step 2: Build and playtest Simulator**

Use XcodeBuildMCP with the generated project, `PaperPlaneRun` scheme, and an available iPhone simulator. Build and launch, then use Computer Use to tap Journey, select a route, move the plane, inspect an encounter, open mastery results, and open postcard details. Capture visible proof and inspect runtime logs.

- [ ] **Step 3: Build a signed physical-device Release**

Use team `FW6FWBCF5U`, automatic signing, the connected Austin's iPhone destination, and a dedicated derived-data directory. Expected: `** BUILD SUCCEEDED **` and a signed `PaperPlaneRun.app` containing all Journey assets.

- [ ] **Step 4: Verify branch state and merge**

Run full unit/build/parity checks immediately before merge. Merge the implementation branch into `main`, rerun `npm test`, and confirm the only unrelated working-tree item is the preserved `.claude/` directory.

- [ ] **Step 5: Push and deploy production**

Push `main` to `origin`, then run `vercel deploy . --prod -y`. Expected: deployment reaches `READY` and aliases `https://paper-plane-run.vercel.app`.

- [ ] **Step 6: Fresh-install the released phone build**

Use `xcrun devicectl` to uninstall `com.sappgulf.paperplanerun`, install the signed Release app built from pushed `main`, launch it, and confirm the installed app record and running process.

- [ ] **Step 7: Clean the owned worktree**

After the merge, tests, push, deploy, and install succeed, remove the `.worktrees/` implementation worktree, prune registrations, and delete the merged feature branch. Leave `.claude/` untouched.
