# First-Flight Safety Design

## Objective

Make Paper Plane Run safer to change and friendlier to play for the first time. This tranche adds a deterministic test baseline, protects new players during launch, pauses simulation when the page is backgrounded, reduces mobile HUD pressure, prioritizes retry on the mobile crash screen, and removes known Three.js deprecation warnings without changing the game's visual identity or progression economy.

## Scope

### Included

- Vitest coverage for deterministic gameplay and persistence modules.
- Browser smoke coverage for menu boot, hangar navigation, starting a run, pausing on page hide, and mobile game-over actions.
- A pure, testable first-flight safety policy.
- A short launch grace period for first-time and tutorial runs.
- Explicit pause/resume behavior driven by `document.visibilityState`.
- A compact mobile HUD that preserves distance, stars, combo, and active power while hiding secondary status chips.
- Mobile game-over action ordering with **Fly Again** before sharing actions.
- Migration from deprecated `THREE.Clock` and `PCFSoftShadowMap` APIs.
- A development-server analytics/leaderboard policy that fails quietly when Vercel functions are unavailable.

### Excluded

- Full decomposition of `src/main.js`.
- Durable remote leaderboard or analytics storage.
- Authentication, anti-cheat, or signed score submissions.
- New modes, hazards, upgrades, skins, or art assets.
- A full WebGL renderer rewrite or removal of crash-photo capture.

## Player Experience Contract

1. The menu remains visually unchanged apart from any accessibility fixes required by tests.
2. A first-time normal run and every tutorial run receives a 4-second launch grace period.
3. During launch grace, lethal hazard collision is disabled, but movement, distance, stars, tutorial rings, and visual hazard motion continue.
4. A small, transient `Get ready` indicator communicates the grace period; it must not add another persistent HUD card.
5. Returning players in non-tutorial modes retain the current difficulty after their first completed run.
6. When the document becomes hidden, simulation time, spawning, collisions, scoring, and audio progression pause. Rendering may continue at the browser's throttled rate.
7. When the document becomes visible, timing resumes without a large delta-time jump and a transient `Resumed` indicator appears.
8. On viewports at or below 520 CSS pixels, persistent HUD chips for Best, Mode, Zone, Ghost, Guardian, and Control are hidden. Distance, Stars, Combo/Streak/Fever, and active Power remain visible.
9. On the mobile game-over screen, `Fly Again` is the first primary action after the score summary/photo. Sharing remains available below it.

## Architecture

### Pure gameplay policy

Create `src/game/firstFlight.js` with pure functions and constants:

- `FIRST_FLIGHT_GRACE_SECONDS = 4`
- `shouldGrantLaunchGrace({ runKind, tutorialDone, completedRuns })`
- `isLaunchGraceActive(elapsedSeconds, graceSeconds)`

The module must not import Three.js or access the DOM/localStorage. `src/main.js` consumes the result when a run starts and gates lethal collision while the grace period is active.

### Pause controller

Create `src/game/pause.js` with a small state transition function:

- `nextPauseState(current, visibilityState)` returns `{ paused, resumed }`.

`src/main.js` owns the DOM listener and audio/UI effects. The animation frame checks `paused` before calling simulation update and resets the Three.js timer when resuming.

### Test boundaries

Vitest runs in Node for pure modules and existing persistence modules with a small localStorage test double. Browser smoke tests run against Vite and use visible DOM state rather than reaching into private Three.js objects. A test-only query parameter may force deterministic non-sensitive UI states such as game-over, but it must be gated by `import.meta.env.DEV` and must not ship active production behavior.

## Error Handling

- Missing or malformed localStorage remains recoverable and falls back to defaults.
- Analytics and leaderboard requests may fail locally without producing unhandled exceptions or repeated console errors.
- Visibility changes are idempotent: repeated hidden/visible events must not double-pause or report false resumes.
- A browser that lacks `document.visibilityState` behavior continues with the existing active simulation.

## Testing

### Unit tests

- Daily seed stability and variation by date.
- Upgrade purchase affordability, level cap, and persisted wallet changes.
- Share-code parse round trip and malformed input fallback.
- First-flight grace eligibility and boundary timing.
- Pause transition idempotence.

### Browser tests

- Desktop menu loads with no framework overlay.
- Hangar opens and returns to the menu.
- A run starts and shows distance HUD.
- Simulated page hide freezes distance; visibility restore resumes it.
- Mobile HUD omits secondary chips during flight.
- Mobile game-over presents **Fly Again** before share actions and remains vertically scrollable.
- Relevant application console errors fail the test; expected unavailable local API responses are suppressed by the application.

### Manual in-app browser validation

- Desktop 1280x720: menu, hangar, first-flight grace, pause/resume, game-over.
- Mobile 390x844: menu, joystick flight, compact HUD, game-over action order and scroll.
- Capture screenshots for desktop flight and mobile game-over.

## Rollout and Success Criteria

- `npm test`, `npm run test:e2e`, and `npm run build` pass.
- No Three.js deprecation warnings for Clock or PCFSoftShadowMap.
- No unhandled application errors in the tested flows.
- A first-time automated flight survives the first 4 seconds without lethal collision.
- The mobile HUD leaves the center playfield unobstructed and the retry action is visible before secondary share actions.
- Existing save keys and progression values remain compatible.

## Follow-On Tranches

1. Split simulation, collision, input, renderer, and UI ownership out of `src/main.js` under test coverage.
2. Profile PMREM and crash-photo capture with SpectorJS, then address the texture-bound warnings and permanent drawing-buffer cost.
3. Replace process-memory APIs with durable storage, validation, rate limiting, and explicit leaderboard trust rules.
