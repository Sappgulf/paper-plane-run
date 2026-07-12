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
| 7 | Zones with progressive Imagine skies/grounds (City → Harbor → Storm → Sunset → Aurora) |
| — | **Plane upgrades** (handling, lift, glide, magnet, shield, luck, wings, trail) |
| — | **Expanded skins** (Neon, Rainbow, Storm Foil, Sunset Letter + seasonal) |
| 8 | Daily missions |
| 9 | Ghost best-run race |
| 10 | Hot-seat multiplayer |
| 11 | Device / daily / global leaderboard |
| 12 | Route editor + share codes |
| 13 | **Co-op wind** — P1 flies, P2 throws wind |
| 14 | **Physics toys** — torn wing, paperclip, rubber-band sling |
| 15 | **Boss gates** every 500m (giant scissors) |
| 16 | **Desk AR** — camera background runway |
| 17 | **Seasonal themes** + free seasonal skins |
| 18 | **Low-power mode** — DPR/shadows/dust |
| 19 | **A11y** — reduced motion, large sticks, auto-level, colorblind powers |
| 20 | **Analytics** — local funnel + `/api/analytics` |
| — | **Time Attack** — 60s, most stars wins |
| — | **Ink Blast weapon** — pop birds/scissors for bonus stars |
| — | **Prestige** — max the upgrade tree, reset for a permanent bonus + cosmetic |

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
