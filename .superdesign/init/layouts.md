# Layouts — App Shell (Paper Plane Run)

There are **no layout wrapper components** and no router. The entire app is one fixed,
full-viewport `#game-root` div. Everything — canvas, FX layers, HUD, panels, overlays — is
absolutely positioned inside it and shown/hidden via the `.hidden` utility
(`src/style.css:34`: `.hidden { display: none !important; }`).

## Shell structure

- **Path:** `index.html:23-373` (`<body>` → `#game-root`), module mount at `index.html:374`
  (`<script type="module" src="/src/main.js">`).
- **CSS:** `html, body, #game-root` fill viewport, overflow hidden `src/style.css:25-31`;
  canvas `#c` `33`; `.panel` overlay pattern `665-680`.

### Full shell source (`index.html:23-121`, everything before the panels)

```html
<body>
  <div id="game-root" class="mouse-mode">
    <canvas id="c"></canvas>
    <div id="speed-fx" aria-hidden="true"></div>
    <div id="fever-fx" aria-hidden="true"></div>
    <div id="slow-fx" aria-hidden="true"></div>
    <div id="edge-indicators" aria-hidden="true"></div>
    <div id="warn-flash" aria-hidden="true"></div>
    <div id="flight-route" class="hidden" aria-hidden="true">
      <div class="flight-route-copy">
        <span id="flight-route-stamp" class="zone-stamp" data-zone="city" role="img" aria-label="Paper City stamp"></span>
        <div class="flight-route-labels">
          <span class="flight-route-kicker">Flight path <b id="flight-route-risk">OPEN AIR</b></span>
          <strong id="flight-route-current">Paper City</strong>
          <span id="flight-route-next">Open air</span>
        </div>
      </div>
      <div class="flight-route-track"><span id="flight-route-fill"></span></div>
    </div>
    <div id="flight-focus" class="hidden" aria-hidden="true">
      <span class="flight-focus-ring"></span>
      <span id="flight-focus-cue" class="flight-focus-cue">FOCUS</span>
    </div>

    <div id="hud" class="hidden">
      <!-- ...18 .hud-card chips; full source in components.md §5... -->
    </div>

    <button id="mute-btn" type="button" class="icon-btn" title="Mute" aria-label="Mute">🔊</button>
    <button id="pause-btn" type="button" class="icon-btn pause-btn hidden" title="Pause" aria-label="Pause flight">❚❚</button>
    <button id="install-btn" type="button" class="icon-btn install-btn hidden" title="Install" aria-label="Install Paper Plane Run">⬇️</button>

    <div id="install-hint" class="hidden" role="dialog" aria-label="Install Paper Plane Run">
      <!-- install-hint-card: icon, h3, body, "Got it" cta-main -->
    </div>
    <div id="sw-update-banner" class="hidden" role="status" aria-live="polite">
      <span>New version ready</span>
      <button id="sw-update-btn" type="button">Restart</button>
    </div>
    <button id="ar-btn" type="button" class="icon-btn ar-btn" title="Desk AR" aria-label="Desk AR camera">📷</button>

    <div id="banner-stack"><!-- wind/power/zone banners + cues --></div>
    <div id="tutorial-hint" class="hidden"></div>
    <div id="combo-float" class="hidden">Near miss!</div>
    <div id="flight-feedback" class="hidden" role="status" aria-live="polite"></div>
    <div id="challenge-toast" class="hidden" role="status"></div>

    <div id="stick-zone" class="hidden" aria-hidden="true"><!-- fly stick --></div>
    <div id="wind-stick-zone" class="hidden" aria-hidden="true"><!-- co-op wind stick --></div>
    <button id="fire-btn" type="button" class="hidden" title="Ink Blast (X)">🖋️</button>

    <!-- Panels appended after this point: #menu (123), #journey-panel (180),
         #hangar-panel (202), #pause-overlay (319), #gameover (331),
         #postcard-reveal / #postcard-detail (363-364), #hotseat-intermission (366) -->
```

## Canvas layering order

All layers are children of `#game-root` (position context). Z-index values from `src/style.css`:

| Order | Element            | z-index | CSS ref              | Notes |
|-------|--------------------|---------|----------------------|-------|
| 0     | `#c` (WebGL canvas)| auto    | `style.css:33`       | Three.js render surface; crosshair cursor in mouse mode (`372-374`) |
| 1     | `#speed-fx`        | 1       | `41-52`              | Edge ray streaks; opacity JS-driven; hidden on low quality |
| 2     | `#fever-fx`        | 2       | `55-67`              | Gold vignette pulse while fever active |
| 2     | `#slow-fx`         | 2       | `71-79`              | Blue slow-mo vignette |
| 3     | `#warn-flash`      | 3       | `82-101`             | Hazard telegraph / impact pulses |
| 4     | `#edge-indicators` | 4       | `104-113`            | Off-screen `.edge-arrow` markers |
| 4     | `#flight-focus`    | 4       | `159-205`            | Corner-bracket target reticle |
| 5     | `#flight-route`    | 5       | `118-153`            | Zone strip under HUD |
| 5     | `#hud`             | 5       | `207-214`            | Chip row, top-left, wraps |
| 8     | `#stick-zone`, `#wind-stick-zone` | 8 | `393-403` | Bottom touch zones (42% height) |
| 10    | `.panel` (menu, journey, hangar, gameover) | 10 | `665-680` | Full-screen modal pages with backdrop image |
| 12    | `#fire-btn`        | 12      | `431-441`            | Weapon button above sticks |
| 20    | `.icon-btn` row    | 20      | `338-348`            | Mute/pause/install/AR, top-right stack |
| 26    | `#pause-overlay`   | 26      | `350-357`            | Dimmed blur backdrop + card |
| 30    | `.postcard-overlay`| 30 (`position: fixed`) | `1337-1350` | Postcard reveal/detail dialogs |

DOM source order matches z-order for the FX stack (no explicit z-index needed below 10 except as listed).

## How panels overlay

`.panel` (`src/style.css:665-680`) is `position: absolute; inset: 0; z-index: 10`, a centered
flex column with vertical scroll. It reserves headroom for the z-20 icon-button row via the
`--panel-top-clear` custom property (`max(64px, env(safe-area-inset-top) + 54px)`, lines 668-672)
and paints a paper backdrop over the live canvas:

```css
.panel {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  --panel-top-clear: max(64px, calc(env(safe-area-inset-top) + 54px));
  padding: var(--panel-top-clear) 16px max(16px, env(safe-area-inset-bottom));
  text-align: center; overflow-y: auto;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  background:
    linear-gradient(165deg, rgba(200,223,245,.2) 0%, rgba(255,236,220,.34) 100%),
    url('/assets/paper-world-backdrop.webp') center / cover no-repeat;
}
.menu-panel { justify-content: safe center; }
```

- Only one panel is visible at a time: `hideAllPanels()` (`src/main.js:279-284`) adds `.hidden`
  to `#menu`, `#journey-panel`, `#gameover`, `#hangar-panel`, `#hotseat-intermission`;
  each `show*`/`open*` helper then removes it from its own panel.
- `#gameover` re-themes the same backdrop darker/warmer (`style.css:1277-1281`).
- Hangar variant anchors to top instead of center: `.hangar { justify-content: flex-start; … }`
  (`836-837`) with an internal scroll region `.hangar-body` (`868-871`).
- `#pause-overlay` (z-26) and `.postcard-overlay` (z-30, `position: fixed`) sit above all panels;
  both are plain divs toggled by class, no focus-trap logic beyond `aria-modal`.
- The icon buttons (`.icon-btn`, z-20) stay above panels so mute/AR remain reachable on menus.
