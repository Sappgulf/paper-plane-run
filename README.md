# Paper Plane Run

Full-featured Three.js endless flyer.

**Live:** https://paper-plane-run.vercel.app

```bash
npm install && npm run dev
```

## Features 1–20

| # | Feature |
|---|---------|
| 1 | Daily seeded route |
| 2 | Near-miss combos + confetti |
| 3 | Unlockable skins (+ seasonal free) |
| 4 | Crash polaroid photo share |
| 5 | Haptics + generative music |
| 6 | Tutorial rings |
| 7 | Zones with progressive Imagine skies/grounds (City → Harbor → Storm → Sunset → Aurora → Midnight Origami) |
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

## iOS

A native Swift/Xcode app shell (`ios/`) embeds this exact web build offline
in a `WKWebView` — same code, same assets, same physics, not a separate
reimplementation. A private `paper-plane://game/` origin lets WebKit execute
the shared ES-module bundle without a network connection.
`npm run ios:generate` builds and syncs that shared game into the native app,
while `npm run verify:ios-parity` detects bundle drift. See
[ios/README.md](ios/README.md) for build steps.
