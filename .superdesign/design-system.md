# Theme — Paper Plane Run

Warm "paper craft" palette: cream paper surfaces, ink-blue text, coral primary CTA, gold accents.
Plain CSS, single file `src/style.css` (1486 lines), tokens as custom properties at `:root`.
Fonts: **Nunito** (600/800/900) from Google Fonts (`index.html:19-21`) falling back to
`system-ui, sans-serif`. No dark mode; instead a `data-night` HUD tweak and season skins.

## Part 1 — Token summary

### Color

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fffaf2` | Card/surface base |
| `--paper-strong` | `rgba(255,250,242,.94)` | Higher-opacity surface |
| `--ink` | `#243b53` | Primary text |
| `--ink-soft` | `#58708b` | Secondary text / kickers |
| `--coral` | `#e76f51` | Brand accent, route accent, CTA family |
| `--gold` | `#f0b429` | Stars / streaks / affordable highlights |
| `--violet` | `#7357c9` | Journey / wind / meta accents |
| `--paper-shadow` | `rgba(61,44,41,.16)` | Warm shadow tint |

Hardcoded working palette (not tokenized — used constantly): page bg `#c8dff5`, warm body text
`#3d2c29`, heading brown `#2c211f`, muted browns `#5c4540/#6b554f/#8a6f68`, sky blue chip gradient
`#7eb8e8→#5a9fd4`, CTA coral gradient `#f2a07a→#e06b4a→#d45a3c`, violet `#7c3aed/#8b5cf6`,
gold buy `#fcd34d→#f59e0b`, semantic red `#e0524a`, green `#4ade80`. Zone accents:
city `#e76f51`, harbor `#2a70b8`, storm `#7357c9`, aurora `#c47b18`, sunset `#d45a3c`,
midnight `#5d4698` (`style.css:148-153`).

### Typography

- Family: `'Nunito', system-ui, sans-serif` (`style.css:27`). No type-scale variables;
  sizes are per-rule px/rem with heavy weights (700–1000) and uppercase micro-labels with
  wide letter-spacing (`.chip-label` 10px/.12em).
- Display: `.panel h1` `clamp(1.85rem, 6vw, 2.55rem)` w900; `.panel h2` `clamp(1.45rem, 4.5vw, 2rem)`;
  tagline 13px w700; HUD value 17px w900; kicker labels 8–10px w900–1000.

### Space / radius / shadow

- Spacing scale: `--space-1..7` = 4/8/12/16/20/24/32px (only spacing tokens in the file).
- Radii: `--radius-sm/md/lg/xl` = 12/16/22/28px; plus ad-hoc pill radius `999px`, card 14px,
  overlay card 24px.
- Shadows: soft warm drops `0 Npx M rgba(61,44,41,…)`; signature layered card shadow on
  `.menu-card` (`0 24px 60px rgba(61,44,41,.14), 0 2px 0 rgba(255,255,255,.5) inset`); glassmorphism
  via `backdrop-filter: blur(10–18px)` on cards/HUD chips/icon buttons.

### Z-index scale

canvas auto → fx 1–4 → HUD/route 5 → sticks 8 → panels 10 → fire button 12 → icon buttons 20 →
pause 26 → postcard overlays 30. (Details in layouts.md.)

### Breakpoints

| Query | Purpose |
|---|---|
| `min-width: 720px` (`239`) | HUD chip sizing bump |
| `max-width: 420px` (`724`) | Menu setup grid collapses to 1 column |
| `(pointer: coarse) and (min-width: 700px)` (`488`) | Larger virtual sticks for tablets |
| `min-width: 760px and max-height: 760px` (`1357`) | Two-column poster menu for short desktops |
| `max-width: 700px` (`1387`) | Journey panel compaction |
| `max-width: 520px` (`1397`) | Main phone pass: smaller cards/chips, HUD priority pruning (`1407-1409`), hangar tabs become horizontal scroll snap, gameover action stacking |
| `max-width: 820px` ×2 (`1458, 1475`) | Hide flight-route strip, bigger fire button; HUD drops below icon row, tertiary chips hidden |
| `max-height: 700px` (`1482`) | Short-viewport menu tightening |

Reduced motion is attribute-driven (`html.a11y-reduced-motion … { animation: none }`) rather than
a media query.

### Key component patterns (with CSS refs)

- **`.action-pill`** (`797-802`) — rounded-999px white-glass mode button, 13px w800;
  variants: `.action-hangar` violet tint (803-807), `#weekly-btn` sky tint (808-812),
  affordability glow `.hangar-can-spend` (1017-1020).
- **`.cta-main`** (`762-771`) — full-width coral-gradient hero button, w900 18px,
  inset highlight + big colored shadow; `.cta-inline` compact variant (772);
  `.journey-main-cta` deeper coral (1284-1287); `.hangar-spend-cta` violet override (1259-1262).
- **`.diff-btn`** (`732-755`) — pill toggle; `.active` state recolors per value
  (easy green / normal blue / hard coral / ctrl violet).
- **Cards** — `.menu-card` (682-693) frosted paper card, radius-xl; `.hud-card` (215-236)
  small frosted chip with label+value+optional `.power-bar`; `.upgrade-card` (955-1012)
  two-col grid card with tree-colored left border and gold "affordable" state;
  `.pause-card` (358-370); `.polaroid` (1269-1275) rotated photo keepsake.
- **Chips/badges** — `.chip-label` uppercase kicker (727-730); `.new-best-badge`
  amber gradient pill (1227-1233); `.hangar-wallet-chip` tabular numerals (1013-1016).
- **Buttons secondary** — `.btn-secondary` sky-blue outline (1214-1219);
  `.back-btn`/`.linkish` underlined quiet actions (1220-1224).

## Part 2 — Raw token block + base layer dumps

### Reset + `:root` tokens — `src/style.css:1-23`

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --paper: #fffaf2;
  --paper-strong: rgba(255,250,242,.94);
  --ink: #243b53;
  --ink-soft: #58708b;
  --coral: #e76f51;
  --gold: #f0b429;
  --violet: #7357c9;
  --paper-shadow: rgba(61,44,41,.16);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
}
```

### Base element layer — `src/style.css:25-34`

```css
html, body, #game-root {
  width: 100%; height: 100%; overflow: hidden;
  font-family: 'Nunito', system-ui, sans-serif;
  background: #c8dff5; color: #3d2c29;
  user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none;
}

#c { display: block; width: 100%; height: 100%; touch-action: none; }
.hidden { display: none !important; }
```

That is the entire "reset/base" of the stylesheet — everything after line 34 is feature CSS.
(There is also a runtime-injected pattern worth knowing: `--panel-top-clear` set inside `.panel`
at `style.css:671` and per-zone `--route-accent` overrides at `148-153`; both are local custom
properties, not global tokens.)

## Product context

Paper Plane Run is a paper-craft endless flyer (Three.js WebGL on canvas), with a DOM menu/hangar/game-over shell over the 3D view. Brand: hand-cut paper dioramas, warm cream surfaces, coral CTA, relaxed playful tone. Menu shows a hero card over a paper-city backdrop. Voice: friendly, terse.
