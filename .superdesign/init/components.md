# Components — Paper Plane Run

> **Reality check:** this is NOT a React/Tailwind app. There are no components in the framework
> sense. Everything below is **static markup** in a single `index.html` (376 lines), styled by one
> plain-CSS file (`src/style.css`, 1486 lines) and driven by vanilla JS ES modules. "Components"
> here = DOM sections that JS toggles with the `.hidden` class.

Source of truth: `index.html` at repo root. Line ranges refer to that file unless noted.

---

## 1. Menu card — `#menu .menu-card`

- **Path:** `index.html:122-177`
- **Name:** `MenuPanel` / `.menu-card` inside `#menu.menu-panel.panel`
- **Description:** Title screen card: logo + wordmark hero, a two-column setup row (difficulty
  picker `data-diff`, control-scheme picker `data-ctrl` + invert-Y checkbox), the big
  "Begin Journey" CTA, a wrapped grid of 8 mode pills (`.action-pill`), engine load status/retry,
  route hints, a dismissible landscape hint, and pilot-name input.
- **CSS:** `.panel`/`.menu-panel` `style.css:665-680`, `.menu-card` `682-693`, `.menu-section`/
  `.chip-label`/`.diff-btn` `711-760`, `.cta-main` `762-772`, `.action-pill` `797-812`,
  hints/inputs `813-833`.

```html
<!-- MAIN MENU -->
<div id="menu" class="panel menu-panel">
  <div class="menu-card">
    <div class="menu-hero">
      <img class="logo" src="/assets/logo.jpg" alt="Paper plane" width="120" height="120" />
      <h1>Paper Plane Run</h1>
      <p class="tagline">Soar the paper skies · dodge · collect · upgrade</p>
    </div>

    <div class="menu-section menu-setup">
      <div class="menu-setup-col">
        <span class="chip-label">Difficulty</span>
        <div class="diff-row" role="group" aria-label="Difficulty">
          <button type="button" class="diff-btn" data-diff="easy">Easy</button>
          <button type="button" class="diff-btn active" data-diff="normal">Normal</button>
          <button type="button" class="diff-btn" data-diff="hard">Hard</button>
        </div>
        <p id="diff-blurb" class="diff-blurb">Balanced flight · classic chaos</p>
      </div>
      <div class="menu-setup-col">
        <span class="chip-label">Controls</span>
        <div class="diff-row control-row" role="group" aria-label="Control scheme">
          <button type="button" class="diff-btn ctrl-btn active" data-ctrl="mouse">Mouse</button>
          <button type="button" class="diff-btn ctrl-btn" data-ctrl="joystick">Stick</button>
        </div>
        <p id="ctrl-blurb" class="diff-blurb">Plane follows your cursor</p>
        <label class="inline-check"><input type="checkbox" id="menu-invert-y" /> Invert up/down</label>
      </div>
    </div>

    <button id="journey-btn" type="button" class="cta-main journey-main-cta">🗺️ Begin Journey</button>

    <div class="menu-actions">
      <button id="start-btn" type="button" class="action-pill" title="The original endless flight">✈️&nbsp;Classic</button>
      <button id="daily-btn" type="button" class="action-pill" title="Same seeded route as everyone today — compare scores">📅&nbsp;Daily</button>
      <button id="weekly-btn" type="button" class="action-pill" title="This week's folded map — same seed, rotating sky">📆&nbsp;Weekly</button>
      <button id="tutorial-btn" type="button" class="action-pill" title="Learn the controls with tutorial rings, no hazards">🎓&nbsp;Tutorial</button>
      <button id="hangar-btn" type="button" class="action-pill action-hangar" title="Upgrades, skins, missions, achievements &amp; settings">🏠&nbsp;Hangar <span id="wallet-stars" class="hangar-wallet-chip">0</span>★</button>
      <button id="timeattack-btn" type="button" class="action-pill" title="60 seconds — grab as many stars as you can">⏱&nbsp;Time Attack</button>
      <button id="coop-btn" type="button" class="action-pill" title="Two players, one plane — P2 throws wind gusts to help or hinder">🌬&nbsp;Co-op</button>
      <button id="hotseat-btn" type="button" class="action-pill" title="Take turns — highest distance wins">👥&nbsp;Hot-seat</button>
    </div>

    <div id="engine-status" class="engine-status hidden" role="status" aria-live="polite">
      <span id="engine-status-message"></span>
    </div>
    <button id="engine-retry" type="button" class="engine-retry linkish hidden">Retry</button>

    <div class="route-hints">
      <p id="daily-hint" class="mini-hint">📅 Daily route races a ghost of your best fold</p>
      <p id="weekly-hint" class="mini-hint">📆 Weekly Fold rotates the opening sky</p>
    </div>
    <button id="landscape-hint" type="button" class="landscape-hint hidden">📱↔️ Tip: rotate to landscape for a wider view — tap to dismiss</button>
    <label class="name-row">Pilot <input id="pilot-name" maxlength="16" placeholder="Pilot" autocomplete="nickname" /></label>
  </div>
</div>
```

---

## 2. Journey panel — `#journey-panel`

- **Path:** `index.html:179-199`
- **Name:** `JourneyPanel` / `.journey-panel > .menu-card.journey-card`
- **Description:** "Living Journey" mode select. Static heading + three dynamic containers filled
  by JS: `#journey-map` (chapter stops), `#journey-pilots` (pilot cards),
  `#journey-route-choices` (2-col route cards). Plus restart link and back button.
- **Renderers:** `renderJourney()` `src/main.js:339-403`, `openJourney()` `405`,
  `renderJourneyChapterPicker()` `315` (chapter cards are injected into the route-choices slot).
- **CSS:** `.journey-*` `src/style.css:1283-1353`.

```html
<!-- LIVING JOURNEY -->
<div id="journey-panel" class="panel journey-panel hidden">
  <div class="menu-card journey-card">
    <div class="journey-heading">
      <span class="chip-label">Living Journey</span>
      <h2>Across the Paper Skies</h2>
      <p class="tagline">Choose a path. Earn its stamp. Catch the Red Dart.</p>
    </div>
    <div id="journey-map"></div>
    <div class="journey-section">
      <h3>Choose your pilot</h3>
      <div id="journey-pilots" class="journey-pilots"></div>
    </div>
    <div class="journey-section">
      <h3 id="journey-choice-title">Choose the next route</h3>
      <div id="journey-route-choices" class="journey-route-choices"></div>
    </div>
    <button id="journey-restart" type="button" class="linkish">Start a new Journey</button>
    <button type="button" class="back-btn" data-back>← Main menu</button>
  </div>
</div>
```

---

## 3. Hangar panel — `#hangar-panel` (tab bar + tab bodies)

- **Path:** `index.html:201-317`
- **Name:** `HangarPanel` / `.hangar > .menu-card.hangar-card`
- **Description:** Meta-hub. Header row (title, wallet/lifetime stars) + a two-level tab system:
  a **group switch** (Progress | Meta) filtering the 9 **hangar tabs** below it. Each tab targets
  a `<section class="hangar-page">` via `aria-controls`; pages are shown/hidden by
  `showHangarTab()`. Most page bodies are empty containers rendered dynamically by JS
  (upgrades grid, skins grid, missions list, …); Settings is fully static markup.
- **Renderers:** `openHangar()` `src/main.js:1340`, `showHangarTab()` `502`,
  `syncHangarGroupUi()` `483`, `setHangarGroup()` `533`.
- **CSS:** `.hangar*` `src/style.css:835-872`, `.upgrade-card` family `947-1012`,
  `.list-card` `1114-1125`, settings/editor `1130-1211`.

```html
<!-- HANGAR -->
<div id="hangar-panel" class="panel hangar hidden">
  <div class="menu-card hangar-card">
    <div class="hangar-top">
      <h2>Hangar</h2>
      <p class="tagline hangar-wallet">
        Wallet <strong id="hangar-wallet">0</strong>★ · Lifetime <strong id="hangar-lifetime">0</strong>★
      </p>
      <div class="hangar-group-switch" role="group" aria-label="Hangar section group">
        <button type="button" id="hangar-group-progress" class="hangar-group-btn active" data-hangar-group="progress" aria-pressed="true">Progress</button>
        <button type="button" id="hangar-group-meta" class="hangar-group-btn" data-hangar-group="meta" aria-pressed="false">Meta</button>
      </div>
      <div class="hangar-tabs" role="tablist" aria-label="Hangar sections">
        <button id="hangar-tab-upgrades" type="button" class="hangar-tab active" data-tab="upgrades" data-hangar-group="progress" role="tab" aria-controls="tab-upgrades" aria-selected="true" tabindex="0">🔧&nbsp;Upgrades</button>
        <button id="hangar-tab-skins" type="button" class="hangar-tab" data-tab="skins" data-hangar-group="progress" role="tab" aria-controls="tab-skins" aria-selected="false" tabindex="-1">🎨&nbsp;Planes</button>
        <button id="hangar-tab-missions" type="button" class="hangar-tab" data-tab="missions" data-hangar-group="progress" role="tab" aria-controls="tab-missions" aria-selected="false" tabindex="-1">🎯&nbsp;Missions</button>
        <button id="hangar-tab-achievements" type="button" class="hangar-tab" data-tab="achievements" data-hangar-group="progress" role="tab" aria-controls="tab-achievements" aria-selected="false" tabindex="-1">🎖️&nbsp;Awards</button>
        <button id="hangar-tab-board" type="button" class="hangar-tab hangar-tab-meta" data-tab="board" data-hangar-group="meta" role="tab" aria-controls="tab-board" aria-selected="false" tabindex="-1">🏆&nbsp;Board</button>
        <button id="hangar-tab-settings" type="button" class="hangar-tab hangar-tab-meta" data-tab="settings" data-hangar-group="meta" role="tab" aria-controls="tab-settings" aria-selected="false" tabindex="-1">⚙️&nbsp;Settings</button>
        <button id="hangar-tab-stats" type="button" class="hangar-tab hangar-tab-meta" data-tab="stats" data-hangar-group="meta" role="tab" aria-controls="tab-stats" aria-selected="false" tabindex="-1">📊&nbsp;Stats</button>
        <button id="hangar-tab-postcards" type="button" class="hangar-tab hangar-tab-meta" data-tab="postcards" data-hangar-group="meta" role="tab" aria-controls="tab-postcards" aria-selected="false" tabindex="-1">💌&nbsp;Postcards</button>
        <button id="hangar-tab-editor" type="button" class="hangar-tab hangar-tab-meta" data-tab="editor" data-hangar-group="meta" role="tab" aria-controls="tab-editor" aria-selected="false" tabindex="-1">🛠&nbsp;Editor</button>
      </div>
    </div>
    <div class="hangar-body">
      <section id="tab-upgrades" class="hangar-page" role="tabpanel" aria-labelledby="hangar-tab-upgrades">
        <p id="upgrades-intro" class="page-intro">Spend flight stars. Each rank sharpens the plane.</p>
        <div id="prestige-panel" class="prestige-panel hidden"></div>
        <div id="upgrades-grid" class="upgrade-grid"></div>
      </section>
      <section id="tab-skins" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-skins">
        <p class="page-intro">Meet lifetime milestones, then purchase with wallet stars. Seasonal and prestige planes are free claims.</p>
        <p id="skins-status" class="share-status" role="status" aria-live="polite"></p>
        <div id="skins-grid" class="skins-grid"></div>
      </section>
      <section id="tab-missions" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-missions">
        <p class="page-intro">Resets UTC midnight. Claim for wallet stars.</p>
        <ul id="missions-list" class="list-card"></ul>
      </section>
      <section id="tab-achievements" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-achievements">
        <p class="page-intro">Lifetime milestones — claim each tier once you clear it.</p>
        <div id="achievements-list"></div>
      </section>
      <section id="tab-board" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-board">
        <div class="tab-row">
          <button type="button" class="tab active" data-board="local">Device</button>
          <button type="button" class="tab" data-board="daily">Daily</button>
          <button type="button" class="tab" data-board="weekly">Weekly</button>
          <button type="button" class="tab" data-board="remote">Global</button>
          <button type="button" class="tab" data-board="timeattack">⏱&nbsp;Time Attack</button>
        </div>
        <ol id="board-list" class="list-card board-list"></ol>
      </section>
      <section id="tab-settings" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-settings">
        <p class="tagline">Season: <strong id="season-now">—</strong></p>
        <div class="settings-list">
          <label class="set-row">Controls
            <select id="set-control-mode">
              <option value="mouse">Mouse aim</option>
              <option value="joystick">Joystick</option>
            </select>
          </label>
          <label class="set-row"><input type="checkbox" id="set-invert-y" /> Invert up/down</label>
          <label class="set-row"><input type="checkbox" id="set-invert-x" /> Invert left/right</label>
          <label class="set-row">Aim feel
            <select id="set-mouse-sens">
              <option value="0.75">Relaxed</option>
              <option value="1">Normal</option>
              <option value="1.4">Snappy</option>
              <option value="1.85">Locked-on</option>
            </select>
          </label>
          <label class="set-row"><input type="checkbox" id="set-reduced-motion" /> Reduced motion</label>
          <label class="set-row"><input type="checkbox" id="set-large-stick" /> Larger sticks</label>
          <label class="set-row"><input type="checkbox" id="set-auto-level" /> Auto-level (Shift)</label>
          <label class="set-row"><input type="checkbox" id="set-colorblind" /> Colorblind powers</label>
          <label class="set-row"><input type="checkbox" id="set-low-power" /> Low-power graphics</label>
          <label class="set-row"><input type="checkbox" id="set-haptics" /> Haptics</label>
          <label class="set-row"><input type="checkbox" id="set-ar" /> Desk AR camera</label>
          <label class="set-row">Season
            <select id="set-season">
              <option value="auto">Auto</option>
              <option value="default">Default</option>
              <option value="halloween">Halloween</option>
              <option value="winter">Winter</option>
              <option value="valentine">Valentine</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
            </select>
          </label>
        </div>
      </section>
      <section id="tab-stats" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-stats">
        <div id="stats-body"></div>
      </section>
      <section id="tab-postcards" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-postcards">
        <p class="page-intro">Four flights become one keepsake.</p>
        <div id="postcard-album" class="postcard-album"></div>
      </section>
      <section id="tab-editor" class="hangar-page hidden" role="tabpanel" aria-labelledby="hangar-tab-editor">
        <p class="page-intro">Place hazards, then play or share a code.</p>
        <div class="editor-toolbar" id="editor-palette"></div>
        <canvas id="editor-canvas" width="360" height="200"></canvas>
        <div class="btn-row wrap">
          <button type="button" id="editor-undo" class="btn-secondary">Undo</button>
          <button type="button" id="editor-clear" class="btn-secondary">Clear</button>
          <button type="button" id="editor-export" class="btn-secondary">Copy link</button>
          <button type="button" id="editor-play" class="cta-main cta-inline">▶ Play route</button>
        </div>
        <input id="editor-import" class="import-input" placeholder="Paste layout code or link…" />
        <button type="button" id="editor-load" class="btn-secondary">Load</button>
        <p id="editor-status" class="share-status"></p>
      </section>
    </div>
    <button type="button" class="back-btn hangar-back" data-back>← Main menu</button>
  </div>
</div>
```

---

## 4. Pause overlay — `#pause-overlay`

- **Path:** `index.html:319-329`
- **Name:** `PauseOverlay` / `.pause-card`
- **Description:** Modal dialog over the frozen flight. Resume CTA plus mute/main-menu secondary
  buttons. Toggled by the engine at `src/flight-engine.js:4411`
  (`pauseOverlay.classList.toggle('hidden', !(manualPause && state === 'playing'))`).
- **CSS:** `#pause-overlay` `src/style.css:350-370`.

```html
<div id="pause-overlay" class="hidden" role="dialog" aria-modal="true" aria-label="Flight paused">
  <div class="pause-card">
    <h2>Paused</h2>
    <p class="detail">Take a breath — the paper sky can wait.</p>
    <button id="pause-resume" type="button" class="cta-main">▶ Resume</button>
    <div class="btn-row wrap pause-actions">
      <button id="pause-mute" type="button" class="btn-secondary">Mute</button>
      <button id="pause-menu" type="button" class="btn-secondary">Main menu</button>
    </div>
  </div>
</div>
```

---

## 5. HUD — `#hud` (+ stick zones & fire button)

- **Path:** `index.html:47-80` (HUD row), `112-120` (stick zones + fire button)
- **Name:** `HudBar` — a wrapping flex row of `.hud-card` chips
- **Description:** Live-run telemetry chips. Base chips always in markup (Distance, Best, Stars,
  Mode, Zone, Control); conditional chips ship `.hidden` and get revealed per run kind/state:
  Time Attack timer, Next zone, Ghost delta, Guardian, Journey objective, Combo/Skim/Streak
  (each with a `.power-bar` fill), Fever multiplier, Power pickup timer, Hotseat player,
  Co-op P2 wind. Priority attr `data-hud-priority="primary|secondary|tertiary"` drives mobile
  collapse (see `style.css:1407-1409`). Stick zones are touch-only virtual joysticks; the fire
  button is the Ink Blast weapon trigger.
- **Owner:** `src/flight-engine.js` (`hudEl` at `249`, shown at `4739/4785`, hidden at `4537/4995/5302`).
- **CSS:** `#hud`/`.hud-card` + chip variants `src/style.css:207-336`, sticks/fire `376-492`.

```html
<div id="hud" class="hidden">
  <div class="hud-card" data-hud-priority="primary"><span class="label">Distance</span><span id="distance">0m</span></div>
  <!-- Best is the only chip that is not live run state, so it is the one
       the phone layout drops when the HUD row would otherwise wrap. -->
  <div class="hud-card" data-hud-priority="tertiary"><span class="label">Best</span><span id="best">0m</span></div>
  <div id="timeattack-hud" class="hud-card timeattack-hud hidden" data-hud-priority="primary"><span class="label">Time</span><span id="timeattack-val">60</span></div>
  <div class="hud-card stars" data-hud-priority="primary"><span class="label">Stars</span><span id="stars">0</span></div>
  <div class="hud-card mode-chip" data-hud-priority="tertiary"><span class="label">Mode</span><span id="hud-mode">Normal</span></div>
  <div class="hud-card zone-chip" data-hud-priority="secondary"><span class="label">Zone</span><span id="hud-zone">Paper City</span></div>
  <div id="next-zone-hud" class="hud-card next-zone-chip hidden" data-hud-priority="secondary"><span class="label">Next</span><span id="hud-next-zone">—</span></div>
  <div id="ghost-delta-hud" class="hud-card ghost-delta-chip hidden" data-hud-priority="tertiary"><span class="label">Ghost</span><span id="ghost-delta-val">+0m</span></div>
  <div id="guardian-hud" class="hud-card guardian-chip hidden" data-hud-priority="secondary"><span class="label">Guardian</span><span id="guardian-hud-val">0</span></div>
  <div id="journey-objective-hud" class="hud-card journey-objective-chip hidden" data-hud-priority="primary"><span class="label">Route goal</span><span id="journey-objective-val">Reach the destination</span></div>
  <div id="combo-hud" class="hud-card combo-hud hidden" data-hud-priority="primary">
    <span class="label">Combo</span>
    <span id="combo-val">1x</span>
    <div class="power-bar combo-bar"><div id="combo-fill"></div></div>
  </div>
  <div id="skim-hud" class="hud-card skim-hud hidden" data-hud-priority="primary"><span class="label">Skim</span><span id="skim-val">Skim</span></div>
  <div id="streak-hud" class="hud-card streak-hud hidden" data-hud-priority="primary">
    <span class="label">Streak</span>
    <span id="streak-val">0</span>
    <div class="power-bar streak-bar"><div id="streak-fill"></div></div>
  </div>
  <div id="fever-hud" class="hud-card fever-hud hidden" data-hud-priority="primary"><span class="label">🔥 Fever</span><span id="fever-val">1.5x</span></div>
  <div id="power-hud" class="hud-card power-hud hidden" data-hud-priority="primary">
    <span class="label">Power</span>
    <span id="power-label">—</span>
    <div class="power-bar"><div id="power-fill"></div></div>
  </div>
  <div id="hotseat-hud" class="hud-card hidden" data-hud-priority="primary"><span class="label">Player</span><span id="hotseat-player">1</span></div>
  <div id="coop-hud" class="hud-card hidden" data-hud-priority="primary"><span class="label">P2 Wind</span><span id="coop-wind-val">0,0</span></div>
  <div id="ctrl-hud" class="hud-card mode-chip" data-hud-priority="tertiary"><span class="label">Control</span><span id="hud-ctrl">Mouse</span></div>
</div>
```

Stick zones + fire button (`index.html:112-120`):

```html
<div id="stick-zone" class="hidden" aria-hidden="true">
  <div id="stick-base"><div id="stick-knob"></div></div>
  <p class="stick-hint">Fly</p>
</div>
<div id="wind-stick-zone" class="hidden" aria-hidden="true">
  <div id="wind-stick-base"><div id="wind-stick-knob"></div></div>
  <p class="stick-hint">Wind</p>
</div>
<button id="fire-btn" type="button" class="hidden" title="Ink Blast (X)">🖋️</button>
```

---

## 6. Game-over card — `#gameover`

- **Path:** `index.html:331-361`
- **Name:** `GameOverCard` / `.panel.menu-panel > .menu-card`
- **Description:** Post-run results: crash title, new-best/streak badges, final score + detail, a
  JS-rendered run summary grid, journey result progress, challenge result line, primary actions
  (Fly Again / Spend ★ in Hangar), an optional canvas-crash "polaroid" photo block with save/share,
  share-ghost action, status line and menu link. Shown by the engine at
  `src/flight-engine.js:5302-5303`.
- **CSS:** buttons/badges/polaroid `src/style.css:1213-1281`, mobile ordering `1421-1455`.

```html
<div id="gameover" class="panel menu-panel hidden">
  <div class="menu-card">
    <h2 id="gameover-title">Crashed!</h2>
    <p id="new-best-badge" class="new-best-badge hidden">🏆 New Best!</p>
    <p id="streak-badge" class="new-best-badge streak-badge hidden"></p>
    <p id="final-score" class="final"></p>
    <p id="final-detail" class="detail"></p>
    <div id="run-summary" class="run-summary hidden" aria-label="Run summary"></div>
    <div id="journey-result-progress" class="hidden" aria-live="polite"></div>
    <p id="challenge-result" class="challenge-result hidden"></p>
    <div class="btn-row wrap gameover-actions gameover-actions-primary">
      <button id="retry-btn" type="button" class="cta-main cta-inline">Fly Again</button>
      <button id="hangar-from-gameover" type="button" class="cta-main cta-inline hangar-spend-cta hidden">Spend ★ in Hangar</button>
    </div>
    <div id="photo-wrap" class="photo-wrap hidden">
      <div class="polaroid">
        <img id="photo-img" alt="Crash photo" />
        <p id="photo-caption"></p>
      </div>
      <div class="btn-row wrap">
        <button type="button" id="photo-save" class="btn-secondary">Save photo</button>
        <button type="button" id="photo-share" class="btn-secondary">Share photo</button>
      </div>
    </div>
    <div class="btn-row wrap gameover-actions gameover-actions-secondary">
      <button id="share-btn" type="button" class="btn-secondary">Share ghost</button>
    </div>
    <p id="share-status" class="share-status"></p>
    <button id="menu-btn" type="button" class="linkish">Main menu</button>
  </div>
</div>
```

---

## 7. Toast / notification stack

- **Path:** `index.html:100-110` (banners + inline notices)
- **Name:** `BannerStack` (`#banner-stack`) + floating feedback elements
- **Description:** Centered stack of transient banners — wind gust, power pickup name, zone entry,
  boost safety cue, magnet pull trail — plus separate single-shot notices: tutorial hint,
  combo float ("Near miss!"), flight feedback (tone-colored via `data-tone`), and the
  challenge toast. All start `.hidden`; the engine toggles them
  (e.g. `src/flight-engine.js:3166,3256,3357`). A queued notification API also exists in
  `src/game/notification-queue.js` feeding `#challenge-toast`.
- **CSS:** `#banner-stack` + banners `src/style.css:497-530`, `#tutorial-hint` `582-590`,
  `#challenge-toast` `592-622`, `#combo-float` `531-546`, `#flight-feedback` `548-566`.

```html
<div id="banner-stack">
  <div id="wind-banner" class="hidden">💨 Wind gust!</div>
  <div id="power-banner" class="hidden"></div>
  <div id="zone-banner" class="hidden"></div>
  <div id="boost-safety-cue" class="hidden" role="status"></div>
  <div id="magnet-pull-trail" class="hidden" data-active="false">🧲 Pulling a star</div>
</div>
<div id="tutorial-hint" class="hidden"></div>
<div id="combo-float" class="hidden">Near miss!</div>
<div id="flight-feedback" class="hidden" role="status" aria-live="polite"></div>
<div id="challenge-toast" class="hidden" role="status"></div>
```

Related single-purpose dialogs (not in the numbered list but part of the notification family):
install hint `index.html:86-93`, service-worker update banner `94-97`, hotseat intermission
`366-372`:

```html
<div id="hotseat-intermission" class="panel menu-panel hidden">
  <div class="menu-card">
    <h2 id="hotseat-title">Player 2</h2>
    <p id="hotseat-scores" class="detail"></p>
    <button id="hotseat-go" type="button" class="cta-main">Start turn</button>
  </div>
</div>
```

---

## 8. Full-screen FX overlays — speed / fever / slow / warn / edge indicators

- **Path:** `index.html:25-30` (also `31-45`: route strip + focus reticle)
- **Name:** `SpeedFx`, `FeverFx`, `SlowFx`, `WarnFlash`, `EdgeIndicators`
- **Description:** Pointer-events-none absolute layers above the WebGL canvas. `#speed-fx` is a
  masked repeating-conic ray field whose opacity JS drives from flight speed;
  `#fever-fx` a golden vignette pulse; `#slow-fx` a cool bullet-time vignette;
  `#warn-flash` a red radial telegraph with impact variants (`impact-hazard/star/power/route`);
  `#edge-indicators` hosts JS-positioned off-screen `.edge-arrow` SVGs colored by kind.
  `#flight-route` (z-5) is the zone/route strip; `#flight-focus` (z-4) the corner-bracket target
  reticle.
- **CSS:** `src/style.css:36-205` (fx layers 41-101, edge arrows 104-113, route strip 118-153,
  focus reticle 159-205).

```html
<canvas id="c"></canvas>
<div id="speed-fx" aria-hidden="true"></div>
<div id="fever-fx" aria-hidden="true"></div>
<div id="slow-fx" aria-hidden="true"></div>
<div id="edge-indicators" aria-hidden="true"></div>
<div id="warn-flash" aria-hidden="true"></div>
```

```html
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
```
