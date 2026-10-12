# Paper Plane Run

A handcrafted Three.js paper-flight adventure, endless flyer, and route workshop.

**[Play Paper Plane Run](https://paper-plane-run.vercel.app)** · [Report an issue](https://github.com/Sappgulf/paper-plane-run/issues)

## Learn to fly

Altitude is your resource. Bank through hazards, find updrafts to regain height, and hold a Tuck to trade height for speed. Release to flare back into a climb.

Start with **Begin Journey** for the story route, **How to fly** for the field notes, or **Tutorial** for guided practice.

- Two Journey chapters with authored encounters, route choices, stamps, and postcards.
- Endless flying across six paper-crafted zones.
- Daily routes and Weekly Fold challenges.
- Plane upgrades, skins, missions, and achievements.
- Ghost runs, challenge links, and a route editor.
- Portable local progress with validated backup, restore preview, and undo.
- Reduced motion, large sticks, auto-level, colorblind power cues, and low-power settings.

## Controls

| Input | Action |
| --- | --- |
| Mouse or touch drag | Steer |
| Arrows / WASD / left stick | Steer |
| Hold Space or Tuck | Dive; release to flare |
| Esc | Pause |
| Shift | Steady flight / auto-level |
| M | Toggle sound |

Steering commands a bank angle. Turning costs height, and reversing direction takes time. Use the tutorial to practice before a longer run.

## Run locally

```sh
git clone https://github.com/Sappgulf/paper-plane-run.git
cd paper-plane-run
npm install
npm run dev
```

Open the local URL printed by Vite.

## Checks

```sh
npm test
npm run build
npm run verify:bundle-budget
npm run test:e2e
npm run test:e2e:prod
```

Development gameplay tests use hooks stripped from production builds. The production suite skips those fixtures and checks the built game's real navigation and flight behavior. These commands are available verification tools, not a statement of current test results.

## Progress and online features

Progress is stored locally. Export or restore it through **Hangar → Logbook & tools → Settings**. Portable backups do not provide cloud sync.

Leaderboard and analytics endpoints are optional best-effort Vercel functions. Serverless memory is not a durable leaderboard database; local progress remains available when those services are unavailable.

## Native iOS shell

The `ios/` app embeds the same web build and assets offline in a `WKWebView`.

```sh
npm run ios:generate
npm run verify:ios-parity
```

See [iOS build instructions](ios/README.md) for the native workflow.

## Architecture and art

Three.js renders the flight world. Core flight mechanics live in `src/game/`, including banking, glide, Tuck/flare, hazard spacing, and HUD priority. The Journey story and route state are separate from those mechanics.

The visual direction uses cut paper, limited zone palettes, fold creases, and layered shadows. See the [art provenance](docs/art-provenance.md) and [flight/world upgrade notes](docs/flight-world-upgrade-2026-10-02.md).

## Contributing

For a bug report, include your device, browser, game mode, and reproduction steps. In development, `?seed=any-readable-label` can make classic and endless runs repeatable.

## Detailed reference

See the [game and development guide](GAME_GUIDE.md) for flight mechanics, Journey progression, save/API contracts, verification workflows, and retired features.
