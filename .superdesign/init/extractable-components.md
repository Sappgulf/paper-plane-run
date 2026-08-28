# Extractable Components

Honest assessment up front: this is **vanilla HTML + plain CSS**, not a component framework.
Every "component" is static markup duplicated in `index.html` and styled by global selectors in
one stylesheet. Extraction value is genuinely low overall — the highest-value candidates are the
repeating *patterns* (hangar tabs, menu pills, HUD chips), and even those are 3–9 line snippets.
Categories below use: `layout` = structural wrapper, `basic` = leaf/atomic UI.

---

## HangarTabs — ★ best candidate — `basic`

- **Source:** `index.html:209-223` (group switch `209-212`, tablist `213-223`);
  CSS `src/style.css:840-867`
- **Description:** Two-level tab navigation: a segmented group switch (Progress/Meta) plus a
  `role="tablist"` of 9 pill tabs, each carrying `data-tab`, `data-hangar-group`,
  `aria-controls`, and `aria-selected`. Tabs hide via `.hangar-tab-filtered-out` when their
  group is inactive.
- **Extractable props:** `tabs: {id, label, icon, group}[]`; `activeTab`; `activeGroup`
  (derived: tab's `data-hangar-group`); callbacks `onTabChange(tabId)`, `onGroupChange(group)`.
- **Hardcoded:** emoji icons in label text; the Progress/Meta grouping; meta tabs get extra class
  `hangar-tab-meta`; mobile behavior (horizontal scroll-snap, `style.css:1415-1420`) is CSS-only.
- **JS coupling:** `showHangarTab()` / `setHangarGroup()` (`src/main.js:502, 533`) own state;
  a11y attributes are already in markup.

## MenuButtonPill (action-pill) — `basic`

- **Source:** `index.html:154-163`; CSS `src/style.css:797-812`
- **Description:** Wrapped row of pill buttons launching game modes. One-off tint variants:
  `.action-hangar` (violet, embeds a live wallet chip span), `#weekly-btn` (sky) — id-scoped,
  which is itself a smell.
- **Extractable props:** `label` (emoji + text as one string today), `mode/kind`,
  `variant?: 'hangar'|'weekly'`, `badge?: number` (wallet stars), `title?`.
- **Hardcoded:** mode ids tied to button DOM ids via `modeByButtonId` (`src/main.js:1423-1431`);

## StatChip (hud-card) pattern — `basic`

- **Source:** `index.html:48-79` (18 instances); CSS `src/style.css:215-330`
- **Description:** Label/value chip with optional mini progress bar and per-variant theming
  (combo tiers, skim tiers, fever, ghost delta ahead/behind, guardian flash).
- **Extractable props:** `label`, `value`, `priority: 'primary'|'secondary'|'tertiary'`,
  `variant?`, `bar?: {fillPct}` , `hidden?`.
- **Hardcoded:** nth-child-based styling (`.hud-card > span:nth-child(2)`) assumes exactly two
  spans before an optional bar; variant colors are hardcoded hexes, not tokens.

## DiffButtonGroup — `basic`

- **Source:** `index.html:134-138` (difficulty), `143-146` (controls); CSS `732-755`
- **Description:** Pill radio group; active color varies by value (easy/normal/hard/ctrl).
- **Extractable props:** `options {value,label}[]`, `value`, `onSelect`,
  `activeColorMap` (currently baked into `[data-diff=…]` attribute selectors).
- **Hardcoded:** per-value gradient colors keyed to `data-diff` values; blurb text lives outside.

## PanelShell — `layout`

- **Source:** pattern only — `#menu` `122`, `#journey-panel` `180`, `#hangar-panel` `202`,
  `#gameover` `331`, `#hotseat-intermission` `366`; CSS `src/style.css:665-680`
- **Description:** Full-screen absolute overlay with paper backdrop, safe-area padding reserving
  the icon-button row (`--panel-top-clear`), scrollable centered column. Variants: `.menu-panel`
  (center), `.hangar` (top-aligned).
- **Extractable props:** `align: 'center'|'top'`, children; visibility handled by parent
  (`.hidden` toggle) rather than the component.
- **Hardcoded:** backdrop image URL `/assets/paper-world-backdrop.webp` inside CSS.

## MenuCard — `layout`

- **Source:** every panel body; base CSS `src/style.css:682-693`; variants `.hangar-card` 837,
  `.journey-card` 1289
- **Description:** Frosted paper card, width-capped (`min(448px,100%)`, journey 760px,
  hangar 480px). Becomes a 2-col grid at short desktop heights (1359-1363).
- **Extractable props:** `width?: 'sm'|'md'|'lg'`, children. Low value on its own.

## PauseOverlay — `basic`

- **Source:** `index.html:319-329`; CSS `350-370`
- **Description:** Dimmed blur backdrop + small card: title, detail, primary resume CTA,
  secondary action row.
- **Extractable props:** `title`, `detail`, `primaryLabel/onPrimary`, `secondaryActions[]`.
- **Hardcoded:** copy ("Take a breath…"); z-index 26 layering assumption.

## GameOverCard — `basic`

- **Source:** `index.html:331-361`; CSS `1213-1281` + mobile ordering `1421-1455`
- **Description:** Results card: badges, score lines, dynamic summary slot, two action rows,
  polaroid photo block with save/share.
- **Extractable props:** `title`, `badges[]`, `score`, `detail`, `summaryRows[]`,
  `photo?: {src, caption}`, `onRetry`, `onMenu`, flags for hangar/share CTAs.
- **Hardcoded:** many optional slots toggled by `.hidden`; CSS re-orders children by id at ≤520px
  (`#gameover #photo-wrap { order: 5 }`) — extraction must preserve DOM order or move to flex order props.

## StickZone — `basic`

- **Source:** `index.html:112-119`; CSS `src/style.css:376-491`
- **Description:** Touch joystick zone (base + knob + hint); co-op variant `#wind-stick-zone`
  recolors knob/border violet and splits screen 50%.
- **Extractable props:** `side: 'fly'|'wind'`, `hint`, `large?` (a11y class on `<html>`),
  floating-base behavior is JS-owned (engine pointer handlers).

## BannerStack / inline notices — `basic`

- **Source:** `index.html:100-110`; CSS `497-622`
- **Description:** Fixed stack of transient banners plus standalone one-shot notices
  (combo float, feedback with `data-tone`, tutorial hint, challenge toast).
- **Extractable props:** `items: {id, text?, tone?, duration}`; tones map to border/color pairs
  in CSS (`#flight-feedback[data-tone=…]` 557-561).
- **Hardcoded:** each banner has its own id-specific styles (`#wind-banner` etc.).

## IconButtonsRow — `basic`

- **Source:** `index.html:82-84, 98`; CSS `338-348`
- **Description:** Absolute top-right stack of square glass icon buttons (mute/pause/install/AR)
  offset leftward by fixed steps from the safe area.
- **Extractable props:** `buttons: {id, glyph, title, hidden?}[]`. Offsets assume exactly this set.

## FX overlay layers — `basic` (not worth extracting)

- **Source:** `index.html:25-30`; CSS `36-113`
- **Description:** Pure presentation divs driven entirely by engine-set classes/inline opacity.
  Extraction would add indirection without reuse; document, don't componentize.

---

### Summary

| Candidate | Category | Value | Main blocker |
|---|---|---|---|
| HangarTabs | basic | High | Group filtering logic split across main.js helpers |
| MenuButtonPill | basic | Medium | Id-keyed variants + wallet badge coupling |
| StatChip | basic | Medium | nth-child styling contract |
| DiffButtonGroup | basic | Low-Med | Value→color map in attribute selectors |
| PanelShell / MenuCard | layout | Low | Backdrop URL in CSS; trivially small |
| PauseOverlay / GameOverCard | basic | Low | Static copy + id-scoped responsive ordering |
| StickZone | basic | Low | Behavior lives in flight-engine.js |
| BannerStack / IconButtons / FX layers | basic | Low | Single-use, engine-driven |

A realistic first extraction (if migrating to a framework ever happens) would be:
`HangarTabs` → `MenuButtonPill` → `StatChip`, keeping panels as server-static markup.
