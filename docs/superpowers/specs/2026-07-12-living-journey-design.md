# Living Journey Design

**Date:** 2026-07-12
**Status:** Approved design, pending written-spec review

## Product Intent

Living Journey makes several flights feel like one memorable paper adventure. It combines richer routes, meaningful progression, and stronger character without replacing Paper Plane Run's immediate arcade loop or creating a separate gameplay engine.

Journey becomes the recommended primary action on the main menu. Classic, Daily, Tutorial, Time Attack, Co-op, and Hot-seat remain directly available and retain their current rules.

## First-Release Scope

The first release contains:

- one four-flight journey;
- four pairs of route choices;
- two selectable pilots, one available immediately and one unlocked through stamps;
- one rival with a distinct flight style;
- one multi-stage boss finale;
- one four-stamp postcard collection;
- local journey persistence and safe save migration;
- shared browser and iOS behavior;
- unit, browser, simulator, and physical-device proof.

Additional journeys, pilots, rivals, and postcards are content extensions, not requirements for the first release.

## Core Journey Loop

### Starting a Journey

The main menu presents `Journey` as the recommended primary action. Selecting it opens a compact journey map showing four destinations, current progress, selected pilot, rival, and postcard stamp slots.

A new journey receives and persists a seed. That seed controls route-card generation and journey-specific encounters. Reloading or moving between screens cannot reroll choices.

### Route Choice

Before each flight, the player chooses between two route cards. Each card communicates:

- destination or route name;
- one dominant modifier;
- risk level;
- reward multiplier;
- available postcard stamp;
- whether a rival or boss is present.

Routes are lateral choices, not a hidden correct answer. A safe route offers predictable hazards and a normal reward. A risky route combines a harder modifier or shortcut with a better reward.

Initial modifier vocabulary:

- strong crosswind;
- moving obstacle formation;
- low visibility;
- dense star trail;
- shortcut gates;
- rival interference;
- boss finale.

Only one dominant modifier is active for a first-release route. Existing zone difficulty and normal obstacle progression still apply.

### Flight Outcome

Completing a route advances the journey and awards its postcard stamp. Crashing preserves stars and other normal run earnings but forfeits that route's bonus stamp. The player may retry the same selected route; retrying does not reroll its seed or modifier.

After each outcome, the map updates immediately and saves before the next choice is shown.

### Finale

Flight four is a multi-stage rival or boss encounter. Completing it finishes the journey and produces a postcard summary containing:

- chosen route path;
- total distance and stars;
- rival result;
- collected stamps;
- completion date;
- pilot used.

The player receives the postcard even when some earlier bonus stamps were missed. Perfect stamp completion grants an additional cosmetic flourish, not gameplay power.

## Pilots and Mastery

The first release includes two pilots. Navigator is available immediately;
Daredevil is unlocked through journey stamps. Pilot abilities are side-grades
that encourage different styles rather than permanent raw-stat upgrades.

Initial ability roles:

- **Navigator:** reveals additional shortcut information and improves risky-route readability.
- **Daredevil:** gains a small, capped momentum benefit from near-miss chains.

Exact tuning values are configuration data and must not bypass existing difficulty rules or make one pilot mandatory.

Each pilot has a short mastery track driven by expressive goals such as completing risky routes, chaining near misses, defeating a rival, or finishing without shields. Mastery rewards stamps, portraits, paper trails, and postcard decorations. Existing stars remain the only currency used for plane upgrades.

## Rival

The first rival appears as a ghost plane using deterministic flight samples rather than networked real-time multiplayer. The rival has:

- a recognizable plane silhouette and color;
- a named flight style;
- short paper-note callouts before and during encounters;
- one signature route interference pattern;
- a target result the player can clearly beat.

Rival callouts never obscure the flight corridor or require dismissal during active play. Reduced-motion settings suppress animated entrances.

## Postcards and Collection

Postcards are the durable record of completed journeys. The postcard album is available from the Hangar and presents a visual grid of destinations. Selecting a postcard opens its route path, score summary, stamps, pilot, and rival outcome.

Stamps unlock pilots, route variants, postcards, and cosmetic flourishes. They are not spendable and cannot conflict with stars, prestige, or mission rewards.

Existing crash polaroids remain shareable run snapshots. Journey postcards represent multi-run accomplishments; the two concepts remain visually and semantically distinct.

## Interface Design

### Main Menu

Journey replaces Classic as the visually dominant primary button. Classic remains a nearby secondary action. The menu should still allow a new player to start flying without understanding progression.

### Journey Map

The map is a single lightweight paper surface with a four-stop route line. It shows only current progress, next destination, pilot, rival, and stamp count. Detailed route information appears on the route cards, not permanently on the map.

### Route Cards

Two cards appear side by side on wide screens and stacked on narrow screens. Both fit without horizontal scrolling. Risk and reward are conveyed using text and iconography, never color alone.

### Gameplay HUD

Journey adds one compact route label and contextual rival delta. Secondary journey information remains hidden during active flight. Rival notes appear near the top safe area and time out automatically.

### Results and Album

The existing game-over flow remains optimized for retry. Journey adds map progress after the immediate crash or completion result. Completed postcards receive a dedicated reveal before entering the album.

## Architecture

### Journey Domain Module

A new journey module owns:

- route and modifier definitions;
- seeded route-card selection;
- journey progression state;
- pilot definitions and mastery goals;
- rival configuration;
- stamp and postcard rewards;
- serialization and migration.

The module exposes pure functions wherever possible. It does not access Three.js objects or mutate DOM elements.

### Gameplay Contract

The existing engine receives a `runConfiguration` object when a flight starts. Journey configuration includes route seed, zone, modifier, reward multiplier, pilot modifier, rival configuration, and journey step identifier.

Existing Classic and other modes construct the same object with their current defaults. This avoids parallel start paths and keeps fixes shared across modes.

### Presentation Layer

Journey map, route cards, rival notes, and postcard views remain DOM-based overlays consistent with the existing menu and Hangar architecture. Rendering functions receive domain snapshots and emit user intents; they do not calculate rewards or progression.

### Persistence

Journey data uses a versioned local-storage record separate from existing settings, upgrades, and score records. State saves after:

- journey creation;
- pilot selection;
- route selection;
- flight completion or crash;
- reward application;
- journey completion.

Loading validates version, seed, step bounds, route selection, reward state, and referenced content identifiers. Invalid journey data resets only Journey state and preserves all other player data. Reward application is idempotent so a reload cannot duplicate stamps or mastery progress.

## Cross-Platform Contract

Browser and iOS use identical journey domain, presentation, and gameplay code. The native app continues to bundle the Vite output and use only platform bridges for capabilities such as haptics.

Every journey change must pass:

- hosted Vite build;
- iOS Vite build;
- byte-for-byte iOS bundle parity verification;
- native compilation.

No Journey feature may depend on a browser-only API without an equivalent native behavior or an explicit graceful fallback.

## Error Handling

- Missing route content falls back to a known safe route for the persisted step.
- Unknown pilot identifiers fall back to Navigator without discarding journey progress.
- Invalid or corrupt Journey storage resets Journey only and surfaces a non-blocking recovery message.
- Failed analytics and leaderboard requests never block progression.
- A WebGL context loss pauses active progress and follows the existing restoration flow.
- Reward writes are applied once using stable journey and step identifiers.

## Analytics

Existing local analytics gains the following non-blocking events:

- journey started;
- route offered;
- route selected;
- journey flight completed;
- journey flight crashed;
- rival beaten;
- postcard completed;
- journey abandoned or restarted.

Events use content identifiers and aggregate outcomes, not player-entered pilot names.

## Testing and Proof

### Unit Tests

- deterministic route generation from a seed;
- safe and risky choice constraints;
- retry stability;
- crash versus completion rewards;
- idempotent reward application;
- journey completion and postcard construction;
- pilot modifier caps;
- save migration and corruption recovery.

### Browser Playtest

- desktop and mobile journey start;
- route selection and responsive layout;
- flight modifier visibility and behavior;
- rival readability;
- crash, retry, and completion transitions;
- postcard album navigation;
- reload persistence at every save boundary;
- existing Classic and Daily regression smoke.

Screenshots are required for the journey map, both route-card layouts, rival flight, and completed postcard.

### iOS Proof

- rebuild and verify the bundled web payload;
- simulator build and launch;
- tap through Journey, route choice, flight, result, Hangar, and postcard album;
- signed Release device build;
- uninstall the prior phone build;
- install and launch the new build on the connected iPhone;
- confirm the installed bundle version and running process.

### Release Gate

Commit and deploy only after unit tests, browser tests, hosted build, iOS build, parity verification, simulator playtest, and signed device build succeed. Physical-device installation follows the pushed commit and deployment so the installed app corresponds to the released source state.

## Deferred Work

The following are intentionally excluded from the first release:

- cloud account synchronization;
- live network multiplayer rivals;
- more than one journey or rival;
- branching narrative dialogue;
- consumable stamp currency;
- procedural story generation;
- a second native gameplay implementation.
