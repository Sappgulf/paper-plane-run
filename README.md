# Paper Plane Run

Full-featured Three.js endless flyer.

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
pool. Updrafts are the only free height in a run, which is what makes their
placement a route rather than decoration. Touching the ground ends the run — the
floor is the fail state, not a wall you bounce off. See
[`src/game/glide.js`](src/game/glide.js).

**Steering is a bank, not a nudge.** The stick commands a roll angle, and the
roll angle is what produces lateral acceleration. Reversing means rolling back
through wings-level first, so every lateral decision is one you are still paying
for a moment later, and committing early to a gap beats reacting late to it. A
hard bank also spills lift, so you turn by spending height. Mouse and stick both
drive this same model — there is no longer a separate, easier aim-mode plane.
See [`src/game/banking.js`](src/game/banking.js).

**The Tuck is the one deep move.** Hold to tuck: the nose drops, drag falls
away, and you trade height for speed far faster than an ordinary dive. Release
to flare: the charge comes back at once as a climb, a speed burst, and a
distance payout. Charge grows superlinearly, so the last quarter-second of a
deep tuck is worth more than its first second — and the whole time you are
falling toward the ground that now ends the run. A flare below the floor is a
*save*: you get the climb, but none of the distance. See
[`src/game/tuck-flare.js`](src/game/tuck-flare.js).

### Fairness

Every wave contains at least one continuous horizontal gap wide enough for the
plane plus a margin, and a moving hazard's motion is clamped so it can never
swing into that gap. The gap can be anywhere in the corridor and moves by a
bounded amount from wave to wave — enough that you cannot hold one line forever,
never more than the roll rate can cover. This replaces the old three-fixed-lane
reservation, which guaranteed the same thing but taught players to solve each
wave as a three-way multiple choice. Asserted as a property over many seeds in
[`test/gap-weave.test.js`](test/gap-weave.test.js).

## Art direction

One rule, applied without exception, and enforced at the loader rather than by
convention:

1. Cut paper only. Flat fills, hard edges, no photographic texture.
2. Three tones per zone plus one accent, for the things you must read fast.
3. Every plane of colour carries fibre grain and at least one fold crease.
4. Depth is a hard offset shadow between layers, never a blur.

Skies and grounds are cut at runtime from each zone's palette
([`src/game/paper-art.js`](src/game/paper-art.js)) rather than shipped as
images, so they cannot drift out of the rule, and every plane skin flies on the
same generated sheet tinted by its own colours. This replaced twelve unrelated
photographic JPEGs.

## Features

| Feature |
|---|
| Daily seeded route + **Weekly Fold** (ISO-week seed, rotating opening sky, local + remote weekly board) |
| Near-miss combos, Combo Fever, star streaks |
| **Ground skim** — the low lane is the dangerous one, so holding it pays; pulling up under control cashes the chain in |
| **Zones** (City → Harbor → Storm → Sunset → Aurora → Midnight Origami), looping to a fresh lap rather than parking on the last one |
| **Altitude tiers** — the endless long tail: past 1000m, speed, wave spacing and hazard mix step every 900m under a named modifier, all capped at tier 8 |
| **Ground life** — laid-out zones with traffic, pedestrians, landmarks and cargo in eight instanced draw calls |
| **Hazard patterns** — twelve airborne obstacles on named motion patterns, resolved as absolute offsets from their anchor so frame timing cannot move them |
| **Boss gates** every 500m (scissors · wind tunnel · stapler jaws) |
| **Plane upgrades** — 14-node tree incl. Deep Flare, Fever Focus, Steady Hands, Gold Rush + synergies |
| **Skins** — lifetime-star ladder ending in Golden Fold / Ink Veil / Starcrest / Paper Legend |
| Daily missions, achievements |
| Ghost best-run race + packed **challenge links** (`?c=`) so a friend races your actual path |
| Device / daily / weekly / global leaderboard |
| **Route editor** + share codes |
| Crash polaroid photo share |
| Tutorial rings, haptics, generative music |
| **Low-power mode**, adaptive quality |
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

**Chapter 1** runs Paper City → Harbor → Storm → Aurora (Red Dart / scissors finale). Finishing Chapter 1 unlocks **Chapter 2 · Desk After Dark**: Golden Fold → Midnight Desk → Stapler Alley → Desk Showdown (stapler gauntlet / Red Dart staple run).

Milo and Pip each have three cosmetic-only mastery levels covering routes, shortcut gates, near misses, risky finishes, destinations, and finales. Mastery can unlock portraits, trails, and postcard borders; stars remain the only spendable upgrade currency.

Completing a chapter unfolds an illustrated destination postcard. **Hangar → Postcards** stores an artwork grid with route history, objectives, stamps, pilot mastery decorations, totals, and share fallback copy. Destination paper-diorama images ship in both the Vercel build and the offline iOS bundle. Navigator is available immediately; collecting four distinct Journey stamps unlocks Daredevil. Classic and every existing game mode remain directly available from the main menu.

## Controls

| Input | Action |
|--------|--------|
| Mouse / touch drag | Steer — the cursor commands a bank, same as the stick |
| Arrows / WASD / left stick | Steer |
| **Space**, or the 🪁 button | **Tuck** — hold to dive, release to flare |
| Esc | Pause |

## Settings

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
npm run test:e2e:prod
```

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
