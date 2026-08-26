# Routes — Paper Plane Run

Single-route SPA. There is **no router**; `index.html` is the only page and all "navigation" is
`.hidden`-class toggling plus query-string/hash consumption at boot. The flight engine module
(`src/flight-engine.js`) is lazy-loaded by the menu shell (`src/main.js`).

## Route: `/`

- **Entry:** `index.html` → `/src/main.js` (`index.html:374`). Boot sequence at
  `src/main.js:1687-1708`: `refreshProgression()` → optional engine-retry from sessionStorage →
  `consumeLaunchMode()` (deep links) → dev `#test-*` preload → idle `preloadEngine()`.
  Sets `document.documentElement.dataset.shell = 'ready'` at `1708`.

## Deep-link query params

Consumed in two places — shell first, then engine:

| Param | Values | Owner | Behavior |
|---|---|---|---|
| `?c=` / `?challenge=` | packed challenge code | `consumeLaunchMode()` `src/main.js:1649-1660`; decode fallback `src/flight-engine.js:761-778` | Starts the challenge mode immediately; param stripped via `history.replaceState` |
| `?mode=` | `classic`, `daily`, `weekly`, `timeattack`, `tutorial`, `hotseat`, `coop`, `journey` | `consumeLaunchMode()` `src/main.js:1661-1675` | Maps to `startMode(kind)` or `openJourney()`; PWA shortcuts / shared links |
| `?d=`/`?score=`, `?s=`, `?m=` | legacy challenge triple (distance, stars, difficulty) | `src/flight-engine.js:770-777` | Builds an in-engine ghost challenge toast if no `?c` present |
| `?layout=` / `?L=` | compact route-editor code | `src/flight-engine.js:779-786`; share URL built at `src/main.js:1318` | Plays a custom hazard layout ("Custom route: …") |
| `?daily=1`, `?weekly=1` | flag | `src/flight-engine.js:787-788` | Forces run kind to daily / weekly |
| `?ta=1` | flag | emitted in share URLs `src/flight-engine.js:4666` | Marks time-attack shares (read alongside `?d/?s`) |
| `?seed=` | any string ≤64 chars (DEV only) | `src/flight-engine.js:728-731` | Deterministic run seed via `hashString` |
| `?upgrade-proof=`, `?collision=`, `?boss-proof=` | proof ids (DEV only) | `src/flight-engine.js:732-739, 749-760` | Test-harness proofs; `configureDevUpgradeProof()` writes maxed upgrades |
| `?nothread=1`, `?boss-pass=1` | flags (DEV only) | `src/flight-engine.js:741-748` | Thread-gap control run / boss pass-through variant |

All consumed params are wiped with `history.replaceState({}, '', location.pathname)`
(`src/flight-engine.js:789`, also per-param in `main.js:1656-1665`).

## Hash-based DEV/test states

Hash is read but never routed. Engine-side switch lives at
`const devTestState = import.meta.env.DEV ? location.hash : ''` (`src/flight-engine.js:727`);
shell-side fixtures at `src/main.js:1629-1646` and gate at `1700-1701`.

| Hash | Defined at | Purpose |
|---|---|---|
| `#test-postcard` | `src/main.js:1629-1646` (`showPostcardReveal`) | Fake journey postcard reveal overlay |
| `#test-gameover` | `src/flight-engine.js:7052` | Pre-filled game-over screen |
| `#test-obstacles` | `7073` | Static obstacle gallery |
| `#test-upgrades-{kind}` | `7102-7103` (`startsWith`) | Spawn test for each power kind |
| `#test-upgrade-live-spawn` | `7130` | Live power-up spawn proof |
| `#test-upgrade-live-collision` | `7150` | Power pickup collision proof |
| `#test-upgrade-live-fever` | `7171` | Fever HUD state fixture |
| `#test-upgrade-live-streak` | `7187` | Streak HUD state fixture |
| `#test-upgrade-live-cooldown` | `7203` | Weapon cooldown fixture |
| `#test-boss-encounter` | `7220` | Boss fight staging |
| `#test-tier-climb` | `7250` | Endless tier progression fixture |
| `#test-gauntlet-payoff` | `7264` | Gauntlet reward fixture |
| `#test-thread-gap` (+`?nothread=1`) | `7287` | Hazard gap-difficulty proof + control run |
| `#test-power-refresh` | `7337` | Power timer refresh behavior |
| `#test-journey-{zoneId}` | `7359-7360` (`startsWith`) | Jump straight to a journey zone |

Any other `location.hash.startsWith('#test-')` just triggers engine preload (`main.js:1700-1701`).

## App states → visible DOM

State machine owners: panel visibility helpers in `src/main.js`; run/HUD/pause visibility inside
the lazy-loaded `src/flight-engine.js`.

| State | Visible root-level section(s) | Hidden | Owning code |
|---|---|---|---|
| **menu** (boot & idle) | `#menu` | `#hud`, all panels | `showMenu()` `src/main.js:286-292`; clears via `hideAllPanels()` `279-284`; wallet sync `refreshHangarWallet()` `464` |
| **journey** | `#journey-panel` | others | `openJourney()` `405`, renders via `renderJourney()` `339` (+ `renderJourneyChapterPicker()` `315`) |
| **hangar** | `#hangar-panel` | others | `openHangar(tab)` `1340-1345` → `showHangarTab()` `502`, `syncHangarGroupUi()` `483` |
| **loading** (engine start) | last panel + `#engine-status` inside menu card | — | `startMode()` `1399-1421` shows status `showEngineStatus()` `1384`; retry link `hideEngineStatus()` `1390` |
| **playing** | `#hud` + fx overlays (+ sticks/fire on touch) | all panels | Engine reveals HUD at `src/flight-engine.js:4739` / `4785`; panels hidden at `4515`; pause button toggle `4410` |
| **paused** | `#pause-overlay` over frozen HUD | — | `pauseOverlay.classList.toggle('hidden', !(manualPause && state === 'playing'))` `src/flight-engine.js:4411`; force-hide on exit `4533` |
| **dead / gameover** | `#gameover` | `#hud`, `#pause-overlay` | `hudEl.classList.add('hidden')` + `gameoverEl.classList.remove('hidden')` `src/flight-engine.js:5302-5303` (also `4995-4996`); pause cleared `5062` |
| **hotseat intermission** | `#hotseat-intermission` | `#hud` | between-turn reveal `src/flight-engine.js:5237-5240` (`hotseatInter` ref `526`) |
| **postcard reveal/detail** | `.postcard-overlay` dialogs above everything | — | `showPostcardReveal()` `src/main.js:447`, `openPostcardDetail()` `433` |

Back-navigation is event-delegated through `[data-back]` buttons and `menu-btn`, which all funnel
back to `showMenu()`; the engine calls back into the shell via `shellBridge`
(`showMenu`, `openJourney`, `openHangar`, `showPostcardReveal`, `refreshProgression`,
frozen at `src/main.js:1375-1382`; e.g. engine→menu at `src/flight-engine.js:4535`).
