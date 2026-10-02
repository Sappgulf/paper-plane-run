# Paper Plane Run

A handcrafted Three.js paper-flight adventure, endless flyer, and route workshop.

**Live:** https://paper-plane-run.vercel.app

```bash
npm install && npm run dev
```

## The core loop

Three systems make up the whole of the moment-to-moment game. Everything else
in the project exists to give them somewhere to happen.

**Altitude is the resource.** A paper plane only ever falls. You always sink;
banking hard and holding the nose up both make you sink faster; diving trades
height for forward speed and climbing spends that speed back out of the same
pool. Green arrow columns marked **UPDRAFT · LIFT** restore height as you fly
through them. Updrafts are the only free height in a run, which is what makes their
placement a route rather than decoration. Touching the ground ends the run — the
floor is the fail state, not a wall you bounce off. See
[`src/game/glide.js`](src/game/glide.js).

**Steering is a bank, not a nudge.** The stick commands a roll angle, and the
roll angle is what produces lateral acceleration. Reversing means rolling back
through wings-level first, so every lateral decision is one you are still paying
for a moment later, and committing early to a gap beats reacting late to it. A
hard bank also spills lift, so you turn by spending height. Mouse and stick both
drive this same model — there is no longer a separate, easier aim-mode plane.
Releasing the stick now damps sideways drift more quickly while keeping the
roll-and-reverse model. The camera follows your lane and fits upgraded wings
on portrait screens. See [`src/game/banking.js`](src/game/banking.js).

**The Tuck is the one deep move.** Hold to tuck: the nose drops, drag falls
away, and you trade height for speed far faster than an ordinary dive. Release
to flare: the charge comes back at once as a climb, a speed burst, and a
distance payout. Charge grows superlinearly, so the last quarter-second of a
deep tuck is worth more than its first second — and the whole time you are
falling toward the ground that now ends the run. A flare below the floor is a
*save*: you get the climb, but none of the distance. See
[`src/game/tuck-flare.js`](src/game/tuck-flare.js).

**The deck is contested.** Ground effect cushions the plane hard enough that
committed low flight can be *held* — which is what makes the skim band flyable
at all, and which also meant that a plane parked in the cushion flew under the
entire game: every airborne hazard spawned at y ≥ 4.4, side buildings sit
outside the flyable corridor, and buildings only shove. A hands-off run reached
32km. The deck lane puts ordinary lethal hazards inside the skim band, planned
against the same guaranteed gap as every other wave, so the cushion stays
flyable and stops being free. It ramps in after 240m, because a player should
meet the cushion before they meet its price. See
[`src/game/deck-lane.js`](src/game/deck-lane.js).

### Fairness

Every wave contains at least one continuous horizontal gap wide enough for the
plane plus a margin, and a moving hazard's motion is clamped so it can never
swing into that gap. The gap can be anywhere in the corridor and moves by a
bounded amount from wave to wave — enough that you cannot hold one line forever,
never more than the roll rate can cover. This replaces the old three-fixed-lane
reservation, which guaranteed the same thing but taught players to solve each
wave as a three-way multiple choice. Asserted as a property over many seeds in
[`test/gap-weave.test.js`](test/gap-weave.test.js).

## Reading the screen

Stars, gold stars (+5), boost rockets, shield cuts and magnets have distinct
original paper silhouettes. Power pickups carry effect labels and active powers
show remaining seconds. Boost leaves a tapered paper streamer; reduced motion
keeps its field of view and horizon steady. All six maps use original paper
plates and instanced landmarks. City streets have continuous lanes, aligned
intersections and crosswalks; folded sedans, vans, pickups and sleds carry roof,
window, wheel and lamp details in one draw per vehicle group. See the [flight and world upgrade evidence](docs/flight-world-upgrade-2026-10-02.md).

A game you cannot read is a game you cannot play, and this one had grown a
HUD chip per system and a banner per event with nothing arbitrating between
them. Mid-run that meant nine chips and three stacked banners over the plane;
on a phone in landscape the chrome covered three quarters of the frame. Three
rules now hold the screen together:

**One banner at a time.** Wind, power and zone banners are sources that request
the single on-screen slot; the most important request wins and ties go to
whatever is already showing, so nothing flickers
([`game/flight-banners.js`](src/game/flight-banners.js)).

**The HUD has a budget.** Distance, stars and altitude are always shown because
they are the run. Everything else competes for two more slots, ranked by how
much it changes what you do in the next second — an active Tuck outranks a
combo total outranks the zone name. Context chips are not ranked at all while
flying; they are simply not on screen
([`game/hud-priority.js`](src/game/hud-priority.js)).

**Chrome follows the available space.** Flight UI uses `clamp()` against
viewport height, because the short edge is what runs out first. The launch
poster explains each mode and leads with Journey; compact portrait screens
reduce the heading and setup, while landscape places actions beside the
heading. Desktop Hangar uses two upgrade columns and four plane columns.
Longer journals and tools scroll within their panels.

The plane and the hazards are the other half of legibility. A cream plane over
a cream paper city was the least visible thing on screen, so it carries an
inflated back-face shell that outlines it in ink against any zone, plus a ground
marker that tightens and darkens as it descends — lateral position and altitude,
readable without looking at the altimeter. Hazards are cut from each zone's
reserved accent, the one colour nothing else in a zone may use.

## Art direction

One rule, applied without exception, and enforced at the loader rather than by
convention:

1. Cut paper only. Flat fills, hard edges, no photographic texture.
2. Three tones per zone plus one accent, for the things you must read fast.
3. Every plane of colour carries fibre grain and at least one fold crease.
4. Depth is a hard offset shadow between layers, never a blur.

Zone skies and grounds are painted assets. Hazard sprites and plane paper
stock are generated from each zone's palette
([`src/game/paper-art.js`](src/game/paper-art.js)), and every plane skin flies
on the same generated sheet tinted by its own colours. The shared palettes
keep hazards readable beside the scenery.

The launch illustration is an original generated cut-paper coast, shipped as
a 137 kB WebP. Its prompt and source are recorded in
[`docs/art-provenance.md`](docs/art-provenance.md). Live scenery adds folded
ridges in one to three instanced layers per zone. These decorative layers use
their own deterministic sequence and sit outside the flight corridor, so
quality changes do not consume gameplay randomness or change collisions.

[`src/style.css`](src/style.css) composes flight overlays, screen structure,
Journey, adaptive layouts, and the shared Paper Flight Club theme. The launch
poster, workshop, journal, settings, editor, guide, pause, postcards, records,
and results share ivory stock, ink type, rust actions, and blue/sage cues.

## Features

| Feature |
|---|
| Daily seeded route + **Weekly Fold** (ISO-week seed, rotating opening sky, local + remote weekly board) |
| Near-miss combos, Combo Fever, star streaks |
| **Ground skim** — the low lane is the dangerous one, so holding it pays; pulling up under control cashes the chain in |
| **Deck lane** — lethal hazards inside the ground-effect band, so the cushion is a risk you fly rather than a floor you park on |
| **Risk pays everywhere** — hazard gauntlets bank +3★ for holding the promised gap, tight tower corridors pay a thread bonus, altitude tiers drop golden 5★ arcs, star meters ride fever + skim multipliers, duplicate power orbs refresh instead of wiping, slow-mo is real bullet-time, and wind gusts stream across the sky as weather |
| **Zones** (City → Harbor → Storm → Sunset → Aurora → Midnight Origami), looping to a fresh lap rather than parking on the last one |
| **Altitude tiers** — the endless long tail: past 1000m, speed, wave spacing and hazard mix step every 900m under a named modifier, all capped at tier 8 |
| **Ground life** — laid-out zones with traffic, pedestrians, landmarks and cargo in eight instanced draw calls |
| **Hazard patterns** — twelve airborne obstacles on named motion patterns, resolved as absolute offsets from their anchor so frame timing cannot move them |
| **Boss gates** every 500m (scissors · wind tunnel · stapler jaws) |
| **Plane upgrades** — 14-node tree incl. Deep Flare, Fever Focus, Steady Hands, Gold Rush + synergies |
| **Skins** — lifetime-star ladder ending in Golden Fold / Ink Veil / Starcrest / Paper Legend |
| Daily missions, achievements |
| **Gauntlet Runner** lifetime award; unfinished missions for retired mechanics migrate without resetting other progress |
| Ghost best-run race + packed **challenge links** (`?c=`) so a friend races your actual path |
| Device / daily / weekly / global leaderboard |
| **Route editor** + share codes |
| Crash polaroid photo share |
| Tutorial rings, haptics, generative music |
| **Pilot’s field notes** and a six-lesson practice flight covering banking, height, updrafts, and Tuck/flare |
| **Low-power mode**, adaptive quality |
| **Portable progress** — validated export, restore preview, failed-write rollback, and undo |
| **A11y** — reduced motion, large sticks, auto-level, colorblind powers |
| **Analytics** — local funnel + `/api/analytics` |
| **Living Journey** — Chapter 1 (City→Aurora) + Chapter 2 Desk After Dark, stamps, postcards, Red Dart / stapler finales |

### Removed

Co-op wind, hot-seat, Desk AR, Time Attack, the Ink Blast weapon, the physics
toys (torn wing, paperclip, rubber-band sling) and prestige were cut. Each was a
separate verb competing with the core loop for tuning attention, and none was a
reason to open the game twice. The prestige cosmetics survived the cut — they
are now the far end of the same lifetime-star ladder every other plane sits on.
The route editor stayed.

## Living Journey

Choose **Begin Journey** from the main menu to start or resume a deterministic four-flight adventure. Each stop offers a safe and risky route with a visible modifier, objective, and reward multiplier. Every destination has authored arrival, escalation, and signature encounters with seeded lane and timing variation, so retries remain recognizable without rerolling.

The chapter also has words. [`src/journey-story.js`](src/journey-story.js) is a
lookup table of authored copy — a chapter premise, a briefing for the stop you
are standing at, a line per route saying what that way through actually is, a
line per pilot saying what they make of taking it, an arrival line on the
results screen and a closing line on the postcard that turns on whether the
Red Dart was beaten. It holds no state and reaches nothing, so `journey.js`
stays a pure state machine and the prose can be rewritten without touching
route generation. Before it, every card read out its modifier and there was no
reason the letter had to get anywhere.

**Chapter 1** runs Paper City → Harbor → Storm → Aurora (Red Dart / scissors finale). Finishing Chapter 1 unlocks **Chapter 2 · Desk After Dark**: Golden Fold → Midnight Desk → Stapler Alley → Desk Showdown (stapler gauntlet / Red Dart staple run).

Milo and Pip each have three cosmetic-only mastery levels covering routes, shortcut gates, near misses, risky finishes, destinations, and finales. Mastery can unlock portraits, trails, and postcard borders; stars remain the only spendable upgrade currency.

Completing a chapter unfolds an illustrated destination postcard. **Hangar → Postcards** stores an artwork grid with route history, objectives, stamps, pilot mastery decorations, totals, and share fallback copy. Destination paper-diorama images ship in both the Vercel build and the offline iOS bundle. Navigator is available immediately; collecting four distinct Journey stamps unlocks Daredevil. Classic and every existing game mode remain directly available from the main menu.

## Controls

| Input | Action |
|--------|--------|
| Mouse / touch drag | Steer — the cursor commands a bank, same as the stick |
| Arrows / WASD / left stick | Steer |
| **Space**, or the **Tuck** button | **Tuck** — hold to dive, release to flare; release early when the low-height cue appears |
| Esc | Pause |
| Shift | Steady flight / auto-level |
| M | Toggle sound |

Choose **How to fly** for the field notes or **Tutorial** for a gentle 420m
practice route. Tutorial lessons stay visible until the next lesson. The pause
card shows the current route, distance, and collected stars; keyboard focus
stays inside dialogs and returns to the playfield when you resume.

## Settings

In **Hangar → Logbook & tools → Settings**, the progress kit exports wallet,
planes, upgrades, lifetime counters, missions, awards, Journey, mastery,
postcards, local/seeded records, ghosts, and settings. Download the JSON backup
in a browser, or select and copy its text in the offline iOS app. Restore by
choosing a file or pasting the save, then preview it before applying.

Backups use version 1, accept established game keys only, and are limited to
2 MB and 300 records. Unsupported or invalid data is rejected before writing.
The current profile is saved before restore; **Undo last restore** remains
available after reload. A failed write rolls back the previous profile.
Analytics, service-worker flags, unrelated storage, and the recovery copy are
excluded. This is a portable local save; it does not add cloud sync. Custom
editor routes continue to travel through their existing share codes.

Menu → **⚙️ Settings** for season override, graphics, accessibility.

## APIs

- `GET/POST /api/leaderboard`
- `GET/POST /api/analytics`

Both endpoints are optional best-effort Vercel functions: the browser keeps
local progress when they are unavailable, and serverless memory is not a
durable leaderboard database. Writes are bounded and rate-limited, while
analytics reads return aggregate funnel counts only. Weekly Fold scores
land in a server-computed ISO-week bucket (`?weekly=1`) in addition to the
device board.

## Verification

```bash
npm test
npm run build
npm run verify:bundle-budget
npm run verify:ios-parity
npm run test:e2e        # dev server — the only mode gameplay.spec.js can run in
npm run test:e2e:prod   # the real production bundle; skips the dev-hook suite
```

[`e2e/gameplay.spec.js`](e2e/gameplay.spec.js) steps the simulation with
`window.advanceTime` and boots from `#test-*` states, both of which Vite strips
from a production build — so it skips itself under `test:e2e:prod` rather than
failing on a missing hook. `smoke.spec.js` runs in both; its fixture-only
checks run in development, while production checks real navigation, flight,
pause/resume, and the built engine's loading/retry behavior.
[`e2e/polish.spec.js`](e2e/polish.spec.js) checks typing with the engine loaded,
native keyboard activation, dialog focus, pause/resume, fresh-flight input
state, the full tutorial, and menus at 320×568, 390×844, 844×390, and 1280×720. CI runs
both development and production browser suites.
[`e2e/redesign.spec.js`](e2e/redesign.spec.js) covers persistent upgrade search,
group filtering, backup/restore/undo, and six-zone scene captures with renderer
resource bounds. Generated native bundles and test outputs are excluded from
Vite's source watcher so writing artifacts cannot reload a flight under test.

In development, add `?seed=any-readable-label` to a URL to replay a classic
or endless run with deterministic randomness; the active seed is included in
`render_game_to_text()` for browser-test diagnostics.

## iOS

A native Swift/Xcode app shell (`ios/`) embeds this exact web build offline
in a `WKWebView` — same code, same assets, same physics, not a separate
reimplementation. A private `paper-plane://game/` origin lets WebKit execute
the shared ES-module bundle without a network connection.
`npm run ios:generate` builds and syncs that shared game into the native app,
while `npm run verify:ios-parity` detects bundle drift. See
[ios/README.md](ios/README.md) for build steps.
