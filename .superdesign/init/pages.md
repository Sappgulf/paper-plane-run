# Pages — Dependency Trees

Four "pages" (all one HTML file, distinguished by which root section is visible). For each:
entry markup → CSS ranges → dynamic JS renderers → assets.

---

## 1. Menu (`#menu` visible)

- **Entry:** `index.html:122-177` — hero, difficulty/controls pickers, journey CTA,
  8 `.action-pill` mode buttons, engine status/retry, hints, pilot name.
- **CSS:**
  - Panel shell + card: `src/style.css:665-709` (`.panel`, `.menu-panel`, `.menu-card`, `.logo`,
    headings, `.tagline`)
  - Setup row: `711-760` (`.menu-section`, `.chip-label`, `.diff-row`, `.diff-btn`, `.inline-check`)
  - Buttons: `762-812` (`.cta-main`/`.cta-inline`, `.menu-actions`, `.action-pill`,
    `.action-hangar`, `#weekly-btn`)
  - Hints & input: `813-833` (`.route-hints`, `.mini-hint`, `.landscape-hint`, `.name-row`)
  - Status: `779-796` (`.engine-status`, `.engine-retry`)
  - Responsive: `1355-1385` (two-column poster menu), `1396-1456` (≤520px), `1482-1486`
- **JS (src/main.js):**
  - `showMenu()` 286 / `hideAllPanels()` 279
  - `refreshHangarWallet()` 464 — wallet count on Hangar pill
  - `setShellDifficulty()` 1522, `syncShellControlUi()` 1553 — picker state + blurbs
  - `showEngineStatus()` 1384 / `hideEngineStatus()` 1390
  - Mode dispatch: click delegation + `modeByButtonId` 1423-1451; journey CTA →
    `openJourney()` 405; hangar pill → `openHangar()` 1340
  - Boot deep-links: `consumeLaunchMode()` 1649; landscape hint IIFE 1601-1611
- **Assets:** `/assets/logo.jpg` (`index.html:126`); panel backdrop
  `/assets/paper-world-backdrop.webp` (`style.css:678`); Google Fonts Nunito.

---

## 2. Hangar (`#hangar-panel` visible)

- **Entry:** `index.html:201-317` — group switch, 9-tab tablist, 9 `.hangar-page` bodies
  (mostly empty containers), static Settings page, Editor page with its own canvas.
- **CSS:**
  - Chrome: `src/style.css:835-872` (`.hangar`, `.hangar-card`, `.hangar-group-switch/btn`,
    `.hangar-tabs/.hangar-tab`, `.hangar-body`, `.page-intro`)
  - Upgrades: `874-1012` (`.prestige-panel`, `.upgrade-tree-chip`, `.upgrade-card`, `.u-buy`)
  - Lists/skins/board/stats/postcards/editor: `1114-1211` (`.list-card`, `.tab-row`,
    skins grid/plane preview styles around `1039-1113`, editor toolbar/canvas/input)
  - Wallet chip on menu pill: `1013-1020`; mobile tab scroll snap `1412-1420`
- **JS (src/main.js) — dynamic renderers:**
  - Nav: `openHangar()` 1340, `showHangarTab()` 502, `setHangarGroup()` 533,
    `syncHangarGroupUi()` 483
  - Header: `refreshHangarWallet()` 464
  - Upgrades: `renderUpgrades()` 954, `renderPrestige()` 905
  - Planes: `renderSkins()` 719 (+ `showPlanePreview()` 656 live Three.js canvas preview,
    `skinSortRank()` 711)
  - Missions: `renderMissions()` 547, badge `refreshMissionBadge()` 538
  - Achievements: `renderAchievements()` 599
  - Board: `renderBoard(tab)` 1174 (local/daily/weekly/timeattack/remote fetches)
  - Stats: `renderStats()` 1152 · Settings: `renderSettings()` 1115
  - Postcards album: rendered via journey helpers (`openHangar('postcards')` path 370-372;
    overlay helpers `showPostcardReveal()` 447 / `openPostcardDetail()` 433 /
    `sharePostcard()` 418 / `closePostcardOverlay()` 412)
  - Editor: `setupEditor()` 1281, `drawEditor()` 1253, play/export handlers ~1300-1336
- **Assets:** plane portraits `/assets/planes/{id}.webp` (17 files incl. classic, coral, gold,
  goldenfold, halloween, inkveil, mint, neon, night, paperlegend, rainbow, spring, starcrest,
  stormfoil, sunset, valentine, winter) referenced as `s.portrait`
  (`src/skins.js:29`, loaded in main.js:802); postcard art `/assets/journey/*-postcard.webp`
  (city/harbor/storm/sunset/aurora/midnight); backdrop `/assets/paper-world-backdrop.webp`.

---

## 3. Flight HUD (playing state)

- **Entry:** `index.html:47-120` — HUD chip row, stick zones, fire button. FX layers
  `25-45` (speed/fever/slow/warn/edge/focus/route strip).
- **CSS (src/style.css):**
  - FX overlays: `36-113` (#speed-fx 41, #fever-fx 55, #slow-fx 71, #warn-flash 82,
    #edge-indicators 104)
  - Route strip + reticle: `115-205`
  - HUD: `207-336` (#hud 208, .hud-card 215 + all variant chips through 330, .power-bar/#power-fill 331)
  - Controls: `338-492` (.icon-btn 338, sticks 376-492, #fire-btn 431)
  - Banners/toasts: `497-622` (#banner-stack 497, banners 503-529, #combo-float 531,
    #flight-feedback 548, #tutorial-hint 582, #challenge-toast 592)
  - Responsive HUD pruning: `1405-1410`, `1470-1481`
- **JS:**
  - Shell entry: `startMode(kind)` `src/main.js:1399` → lazy-loads engine via
    `preloadEngine()` 1513; pause button wiring lives engine-side
  - Engine (`src/flight-engine.js`): element refs `247-280` (`gameoverEl` 247, `hudEl` 249,
    `pauseOverlay` 2803, `pauseBtn` 2804, `hotseatInter` 526); HUD reveal `4739`/`4785`,
    hide `4537`/`4995`/`5302`; combo/streak/fever/power chip updates ~3513-4056; banner
    shows at 3166/3256/3357; stick zone toggles 4108-4117; pause toggle 4410-4412;
    route strip/focus cue 393-478; edge arrows + notifications modules in `src/game/`
    (`notification-queue.js`, `flight-focus.js`, `near-miss-feedback.js`)
- **Assets:** zone stamp sprite sheet `/assets/zone-stamp-sheet.webp` (`style.css:137`);
  power icons `/assets/power-{boost,magnet,shield,sling,slow,tear}.webp` and pickups
  `pickup-{orb,boost}.webp`, `power-clip.webp` used by engine art; obstacle sprites under
  `/assets/obstacles/*.webp`, bosses `/assets/bosses/*.webp` (canvas-side, not DOM).

---

## 4. Game Over (`#gameover` visible)

- **Entry:** `index.html:331-361` — title, badges, final score/detail, run summary container,
  journey progress, challenge result, action rows, polaroid photo block, share/status, menu link.
- **CSS (src/style.css):**
  - Actions & text: `1213-1244` (`.btn-row`, `.btn-secondary`, `.back-btn`/`.linkish`,
    `.share-status`, `.final`, badges/keyframes 1227-1243)
  - Summary & extras: `1245-1267` (`.run-summary`, `.run-summary-next`,
    `.hangar-spend-cta`, `.challenge-result`)
  - Photo: `1268-1275` (`.photo-wrap`, `.polaroid`)
  - Backdrop override: `1277-1281` (#gameover warm-dark gradient over backdrop webp)
  - Mobile ordering: `1421-1455`
- **JS:**
  - Reveal: engine writes scores then `gameoverEl.classList.remove('hidden')`
    `src/flight-engine.js:5302-5303` (test fixture variant `7052-7072`); retry/menu buttons
    handled engine-side (`retry-btn` restart path 5236-5240, menu via `shellBridge.showMenu()`
    4535); share URL builder `4658-4666`
  - Run summary grid: built by `src/game/run-summary.js` into `#run-summary`
  - Journey result block: shell helpers `showPostcardReveal()` `src/main.js:447`,
    mastery rendering in `src/journey-mastery.js`/`journey-postcards.js`
  - Challenge line: `decodeChallenge`/`describeChallenge` (`src/game/challenge-share.js`),
    toast shown by engine notification queue
- **Assets:** none unique — photo is a runtime canvas capture injected into `#photo-img`;
  reuses `/assets/paper-world-backdrop.webp` background.

---

### Shared dependency notes

- Every page sits inside the same `.panel`/overlay system (`style.css:665-680`) and shares
  button primitives (`.cta-main`, `.btn-secondary`, `.linkish`) defined once at `762-772` and
  `1213-1224`.
- State changes never navigate; they call the helpers listed in routes.md
  (`hideAllPanels` → show target). The engine module is the single writer of HUD/gameover/pause
  visibility; the shell owns menu/journey/hangar visibility.
