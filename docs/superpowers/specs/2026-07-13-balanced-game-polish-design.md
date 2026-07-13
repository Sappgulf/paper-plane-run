# Paper Plane Run Balanced Game Polish Design

**Date:** 2026-07-13  
**Status:** Approved for specification  
**Scope:** Improve existing startup performance, planes, economy, upgrades, bosses, and game feel without adding a new game mode or boss type.

## Goals

- Reduce the initial web payload by loading the Three.js flight engine after the menu shell.
- Convert the existing cosmetic catalog into a real, understandable Plane Collection.
- Preserve lifetime-star progression while making wallet-star purchases meaningful.
- Prove that every existing upgrade affects the runtime and communicates its effect.
- Rebuild the existing Scissors Gate and Wind Tunnel presentation with cohesive generated paper art.
- Improve encounter readability, pacing, controls, and feedback across every existing mode.
- Preserve existing save data, offline iOS behavior, and web/iOS feature parity.

## Non-goals

- No new game mode, boss type, currency, combat system, or stat-bearing premium plane.
- No full engine rewrite or replacement of Three.js.
- No destructive save reset or incompatible storage migration.
- No gameplay advantage tied to an equipped plane design.
- No generated image used as a collision boundary.

## 1. Startup and Bundle Architecture

The initial application module will own the menu shell, settings, Hangar navigation, progression views, and mode selection. The Three.js engine, scene construction, flight simulation, boss runtime, and renderer will sit behind a dynamic import boundary.

The startup module will begin an idle-time engine preload after the interactive menu appears. Selecting a flight mode before preload completion will show a lightweight `Preparing your plane...` state and await the same in-flight engine promise. Only one engine import and initialization may run at a time. Initialization failures must restore an actionable menu with a retry message instead of leaving controls disabled.

The refactor will be incremental. Existing runtime behavior will move behind an explicit lifecycle interface rather than being rewritten. The interface must support starting an existing run kind, stopping or returning to menu, reading readiness, and reporting initialization failure.

The build will gain a documented size budget for initial JavaScript and total JavaScript. Verification must distinguish initial-load growth from intentionally deferred engine code. The budget should fail only on meaningful regression, not harmless hash or minifier variation.

The iOS build continues to use relative asset paths and must contain every deferred chunk in the offline bundle. `verify:ios-parity` remains the authority for web-bundle synchronization.

## 2. Plane Collection and Economy

The existing Skins surface becomes the Plane Collection. Existing cosmetic identifiers remain valid to preserve equipped-plane and ownership data.

Each plane definition will include:

- stable existing identifier;
- display name and art assets;
- one of four cosmetic silhouette families: Classic Fold, Dart, Glider, or Stunt Fold;
- lifetime-star availability requirement;
- wallet-star purchase price;
- body, accent, paper texture, and generated Hangar portrait;
- optional seasonal or prestige availability rule.

Lifetime stars represent experience and reveal planes for purchase. Wallet stars are spent to purchase planes and upgrades. Once purchased, a plane remains owned permanently and can be equipped at no cost. Classic Cream is owned by default.

Seasonal planes are free to claim during their active season. Claiming creates permanent ownership. Prestige planes continue to use prestige availability and become permanently owned when claimed.

The UI must clearly distinguish `Locked`, `Available`, `Owned`, and `Equipped`. Locked cards show the lifetime or prestige requirement. Available cards show the wallet price and purchase action. Owned cards show an equip action. Purchase success updates wallet, ownership, preview, and action state immediately.

### Save migration

The ownership schema will be versioned additively. Every plane already present in the legacy unlocked set remains owned. The currently equipped plane is forcibly retained as owned if legacy data is inconsistent. Wallet, lifetime stars, upgrades, prestige, missions, settings, leaderboard data, and Journey data are not rewritten. Invalid JSON falls back to Classic ownership without blocking startup.

### Plane presentation

The four silhouette families are procedural Three.js geometry and share fair gameplay behavior. Their visual bounds may differ, but their collision contract does not gain a purchase-based advantage. Existing upgrade effects remain independent from the equipped cosmetic.

ImageGen will produce transparent Hangar portraits and restrained paper textures/decals. The in-flight mesh remains procedural so banking, folds, shadows, wing animation, damage feedback, and lighting remain responsive.

## 3. Upgrade Contracts

Every upgrade requires five linked proofs: purchase, persisted level, calculated effect, runtime consumption, and visible or HUD feedback.

| Upgrade | Runtime contract | Player feedback |
| --- | --- | --- |
| Fold Handling | Increases response across mouse, touch, stick, and keyboard while maintaining smooth banking. | Current-to-next response percentage and visibly tighter response. |
| Lift Crease | Improves altitude recovery and reduces downward drift in every control mode. | Current-to-next recovery/drift value. |
| Long Glide | Increases forward speed and score flow. | Speed/score percentages and restrained speed lines. |
| Star Magnet | Increases collection radius. | Radius in meters and visible pull trail. |
| Tough Fiber | Multiplies shield duration. | Duration value and accurate HUD timer. |
| Lucky Scrap | Increases collectible and power-up spawn chances. | Spawn percentages verified with seeded simulation. |
| Wide Wings | Enlarges cosmetic wings and near-miss generosity without enlarging the damaging collision contract. | Near-miss percentage and live preview. |
| Paper Trail | Strengthens trail presentation and score multiplier. | Trail rank and score percentage. |
| Turbo Fold | Smooths boost entry and increases boost recovery safety. | Safety duration and boost feedback. |
| Guardian Crease | Grants the documented number of crash saves each run. | Persistent per-run HUD charge count and activation feedback. |
| Ink Blast | Improves firing cadence and projectile feedback. | Cooldown value, ready state, and stronger rank feedback. |

Upgrade cards show exact current and next values rather than only descriptive copy. Purchasing refreshes wallet, rank, effect summary, preview, and any relevant controls without reopening the Hangar.

Balance changes must be based on earning rates and deterministic gameplay observations. Price changes may adjust future purchases but cannot remove purchased levels.

## 4. Boss and Gameplay Polish

The existing Scissors Gate and Wind Tunnel remain the only recurring boss types.

ImageGen supplies cohesive handcrafted-paper blade faces, hinge details, turbine faces, folded vanes, warning motifs, and reference art. Generated assets contain no text, logos, baked UI, or background clutter. Code-controlled Three.js geometry continues to define movement, safe lanes, animation, and collision.

Each boss encounter has three readable phases:

1. **Warning:** sufficient advance notice, boss identity, and safe-lane preview.
2. **Pressure:** visible hazard motion with stable danger/safe color language.
3. **Final pass:** a clear commitment moment followed by completion feedback and recovery space.

Difficulty scaling adjusts timing, lane movement, and cadence through explicit parameters. It must not silently expand hitboxes. Reduced-motion mode removes unnecessary spin and camera effects while preserving timing information. Colorblind mode differentiates danger and safety through shape, brightness, and motion in addition to hue.

General gameplay polish will tune existing obstacle waves, recovery spacing, star trails, near-miss presentation, speed escalation, camera motion, controls, collision feedback, audio, and haptics. Hard sections must be followed by deliberate recovery space. Collectibles may guide a safe or high-reward route but may not lead through unavoidable collisions.

## 5. Art Direction and Asset Pipeline

All generated assets follow one contract:

- premium handcrafted paper-diorama character;
- visible fibers, folds, cut edges, and restrained foil details;
- warm, cohesive palette with strong gameplay-scale silhouette;
- transparent backgrounds where assets are composited;
- no text, logos, watermark, photoreal hands, or unrelated objects;
- readable at mobile gameplay size and compatible with existing lighting.

Generation will be performed in reproducible batches with stable output names. Each result must be visually inspected before integration. One targeted regeneration is preferred over accepting an asset with unclear edges, inconsistent perspective, or excessive detail. Final source assets live under the project asset tree and are included in both hosted and offline iOS builds.

## 6. Testing and Verification

Each implementation tranche must pass its focused checks before proceeding.

### Automated verification

- Unit tests for bundle-budget parsing, economy migration, plane purchasing/equipping, and every upgrade level-to-effect calculation.
- Deterministic runtime probes showing that each upgrade effect is consumed by gameplay.
- Seeded boss tests covering warning, phase transitions, safe passage, collision, completion, and recovery spacing.
- Existing Vitest and Playwright suites with no unexplained skip or regression.
- Production web build, offline iOS build, and iOS parity verification.

### Browser and visual verification

- Desktop and mobile menu-to-flight startup with cold and preloaded engine paths.
- Classic, Daily, Tutorial, Time Attack, Co-op, Hot-seat, Journey, Hangar, and Editor smoke flows.
- Plane locked, available, purchase, owned, equipped, migration, seasonal claim, and insufficient-wallet states.
- Baseline versus upgraded runtime comparisons.
- Both bosses at multiple difficulty levels, reduced motion, and colorblind settings.
- Gameplay screenshots inspected at actual viewport sizes.
- Browser console and failed network requests reviewed after every meaningful change.

### iOS verification

- Xcode build, fresh simulator install, launch, menu, Hangar, purchase/equip, and gameplay smoke.
- Deferred chunks and generated assets verified through offline launch.
- Physical-device build/install/launch when the paired phone is available.

## 7. Delivery Sequence

1. **Startup and bundle architecture:** dynamic engine loading, idle preload, loading/error states, and bundle budgets.
2. **Plane Collection:** versioned ownership migration, wallet purchases, silhouette families, generated plane art, and live preview.
3. **Upgrade contracts:** runtime wiring, exact UI values, balance, feedback, and deterministic proof.
4. **Boss and gameplay polish:** generated boss art, phase readability, pacing, controls, and full regression proof.

Each tranche is independently reviewable and testable. Commits should remain focused enough to revert one tranche without corrupting saves or removing unrelated polish.

## Completion Criteria

- The interactive menu loads without the Three.js engine in the initial chunk.
- Idle preload and cold-start loading both reach the selected mode reliably.
- Initial and total bundle sizes satisfy documented budgets.
- Existing cosmetic ownership migrates without loss.
- Planes require lifetime availability and wallet purchase, then equip freely.
- Every upgrade has deterministic evidence of its runtime effect and clear player-facing values.
- Scissors Gate and Wind Tunnel are visually cohesive, readable, fair, and accessible.
- All existing modes and progression surfaces pass desktop, mobile, and iOS smoke coverage.
- Generated assets ship in hosted and offline builds.
- Final changes are committed, pushed, and deployed only after verification succeeds.
