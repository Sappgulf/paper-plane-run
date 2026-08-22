# Paper Plane Run

Full-featured Three.js endless flyer.

**Live:** https://paper-plane-run.vercel.app

```bash
npm install && npm run dev
```

## Features 1–20

| # | Feature |
|---|---------|
| 1 | Daily seeded route + **Weekly Fold** (ISO-week seed, rotating opening sky and a light mechanical lean, local weekly board) |

| 2 | Near-miss combos + confetti |
| 3 | Unlockable skins (+ seasonal free) |
| 4 | Crash polaroid photo share + packed ghost **challenge links** (`?c=`) so a friend races your actual path |
| 5 | Haptics + generative music |
| 6 | Tutorial rings |
| 7 | Zones with progressive Imagine skies/grounds (City → Harbor → Storm → Sunset → Aurora → Midnight Origami) — and past Midnight the route **folds back to Paper City** on a new lap instead of parking on the last zone forever, so the sky, ground and music keep turning over for as long as you survive |
| — | **Altitude Tiers** — the endless long tail. Cruise speed hits its difficulty cap by ~450m, the hazard ramp tops out at 700m and wave spacing stops compressing at ~1050m, so past that a run used to be mechanically identical forever. Tiers pick the curve back up at 1000m and step every 900m: a little more speed, tighter waves, a richer hazard mix, and a **named modifier** (Headwind · Flocking Hour · Scissor Storm · Rising Skyline) that leans the spawn mix on top of the zone's own bias. Each tier also pays a permanent score multiplier for the rest of the run, and every dial caps at tier 8 — a tuned ceiling, not an asymptote. Journey legs, the tutorial and route-editor playback stay on the shipped baseline |
| — | **Ground life** — every zone is laid out rather than sprinkled: two roads run down each flank carrying traffic (slower than the ground = pulling away, faster = oncoming), pedestrians walk the pavement beside them, and a landmark, low scatter, flat decal band, a vertical accent (masts, cranes, gantries) and stacked cargo fill the rest. Eight instanced draw calls per zone regardless of instance count; upright props stay outside the flight corridor, only flat decals pass under the plane, and the whole field is shed first on low-power devices |
| — | **Stars are a decision** — every star used to spawn within ±0.8 of the reserved passage lane, the one lane hazards are guaranteed to avoid, so the safest line was also the paying line and there was never a reason to be anywhere else. Stars now mix across lanes, and an off-lane star is only placed where that lane's damage envelopes are currently clear — so it adds the risk of *moving*, never an unavoidable hit. Paired with this, **Star Magnet** actually sells something: unupgraded reach stops just short of one lane gap (lanes sit 6 apart) instead of a flat 12 that already drew stars out of both neighbours |
| — | **Hazard patterns** — the twelve airborne obstacles move on named patterns (hold · bob · weave · dive · orbit · tumble) resolved as an absolute offset from their spawn anchor every frame. The old motion *integrated* `sin(phase) × dt` into the position, which does not average out — it built a one-sided drift that depended on how frames landed and could carry a hazard into the passage lane the run had guaranteed was flyable. Lateral amplitude is now clamped against that lane up front, so the fairness guarantee covers a hazard's whole path rather than its first frame, and deeper tiers move hazards harder without ever closing the lane |
| — | **Ground skim** — the low lane is the dangerous one, so holding it pays. Tiers bank stars and lift the score multiplier, a short grace absorbs clipping a roofline, and pulling up under control cashes the chain in for distance |
| — | **Plane upgrades** (14-upgrade tree incl. Fever Focus, Steady Hands, Gold Rush + synergies) |
| — | **Expanded skins** (Neon, Rainbow, Storm Foil, Sunset Letter + seasonal + prestige Ink Veil / Starcrest / Paper Legend) |
| 8 | Daily missions |
| 9 | Ghost best-run race |
| 10 | Hot-seat multiplayer |
| 11 | Device / daily / global leaderboard |
| 12 | Route editor + share codes |
| 13 | **Co-op wind** — P1 flies, P2 throws wind |
| 14 | **Physics toys** — torn wing, paperclip, rubber-band sling |
| 15 | **Boss gates** every 500m (scissors · wind tunnel · stapler jaws) |
| 16 | **Desk AR** — camera background runway |
| 17 | **Seasonal themes** + free seasonal skins |
| 18 | **Low-power mode** — DPR/shadows/dust |
| 19 | **A11y** — reduced motion, large sticks, auto-level, colorblind powers |
| 20 | **Analytics** — local funnel + `/api/analytics` |
| — | **Time Attack** — 60s, most stars wins |
| — | **Ink Blast weapon** — pop birds/scissors for bonus stars |
| — | **Prestige** — max the upgrade tree, reset for a permanent bonus + cosmetic |
| — | **Living Journey** — Chapter 1 (City→Aurora) + Chapter 2 Desk After Dark, stamps, postcards, Red Dart / stapler finales |

## Living Journey

Choose **Begin Journey** from the main menu to start or resume a deterministic four-flight adventure. Each stop offers a safe and risky route with a visible modifier, objective, and reward multiplier. Every destination has authored arrival, escalation, and signature encounters with seeded lane and timing variation, so retries remain recognizable without rerolling.

**Chapter 1** runs Paper City → Harbor → Storm → Aurora (Red Dart / scissors finale). Finishing Chapter 1 unlocks **Chapter 2 · Desk After Dark**: Golden Fold → Midnight Desk → Stapler Alley → Desk Showdown (stapler gauntlet / Red Dart staple run).

Milo and Pip each have three cosmetic-only mastery levels covering routes, shortcut gates, near misses, risky finishes, destinations, and finales. Mastery can unlock portraits, trails, and postcard borders; stars remain the only spendable upgrade currency.

Completing a chapter unfolds an illustrated destination postcard. **Hangar → Postcards** stores an artwork grid with route history, objectives, stamps, pilot mastery decorations, totals, and share fallback copy. Destination paper-diorama images ship in both the Vercel build and the offline iOS bundle. Navigator is available immediately; collecting four distinct Journey stamps unlocks Daredevil. Classic and every existing game mode remain directly available from the main menu.

## Co-op controls

| Player | Input |
|--------|--------|
| P1 fly | Arrows or left stick |
| P2 wind | WASD / IJKL or purple right stick |

## Settings

Menu → **⚙️ Settings** for AR, season override, graphics, accessibility.

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
