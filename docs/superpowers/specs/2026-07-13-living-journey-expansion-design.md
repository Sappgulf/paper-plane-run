# Living Journey Expansion Design

**Date:** 2026-07-13  
**Status:** Approved product direction; written specification awaiting review

## Product Intent

This expansion makes Living Journey memorable during flight, not only between flights. It combines three approved directions into one progression spine:

1. route-specific encounters;
2. pilot mastery and cosmetic rewards;
3. illustrated, interactive postcards.

The tone is a balanced hybrid. Every destination has authored encounter beats, while the persisted Journey seed varies timing, lanes, formations, and reward placement. A route therefore develops a recognizable identity without becoming identical on every retry.

Classic, Daily, Tutorial, Time Attack, Co-op, and Hot-seat retain their current rules and remain directly accessible. Stars remain the only spendable upgrade currency. Mastery and stamps unlock cosmetics and presentation variants only.

## Release Scope

The expansion ships as one bounded tranche containing:

- four destination encounter scripts;
- five functional route modifiers;
- an active Red Dart finale pattern;
- two three-level pilot mastery tracks;
- mastery-driven trails, portraits, and postcard decorations;
- four original destination illustrations;
- animated postcard reveal and detailed album views;
- shared browser and iOS behavior;
- versioned persistence migration;
- automated, browser, simulator, and physical-device proof.

It does not add a second Journey, another currency, cloud accounts, live multiplayer, branching dialogue, or consumable mastery rewards.

## Experience Flow

### Route Selection

Each route card continues to show destination, risk, modifier, reward multiplier, and stamp. It also gains a concise objective preview. Navigator may reveal one additional detail, such as the gate sequence or the direction from which a formation enters.

Selecting a card persists the route before flight. Retrying preserves its seed, encounter script, objective, and reward layout.

### Flight Structure

Every Journey flight contains three authored stages:

1. **Arrival:** establishes the destination and teaches the active modifier safely;
2. **Escalation:** combines the modifier with normal hazards and exposes the route objective;
3. **Signature:** presents one recognizable destination encounter before the finish line.

The Journey seed selects stage variants and spawn lanes from constrained tables. It never changes the semantic order of the three stages.

Completing the target distance finishes the route. Crashing preserves normal run earnings and mastery telemetry but does not grant completion-only mastery credit. Retry does not reroll the route.

### Results

The immediate result remains compact and retry-focused. A completed route shows:

- stamp earned;
- objective result;
- mastery progress gained;
- route bonus;
- Continue Journey action.

The fourth completion reveals the completed postcard before returning to the Journey map or album.

## Encounter System

### Encounter Director

A new pure `journey-encounters.js` module converts a Journey run configuration into a deterministic encounter timeline. Each event contains a stable ID, stage, trigger distance, event type, lane data, parameters, and completion condition.

The Three.js runtime consumes those events through the existing update and spawn paths. The director does not own an animation loop, directly mutate Three.js objects, or calculate permanent rewards.

### Destination Scripts

#### Paper City Rooftops

- Arrival: broad rooftop corridor and visible star line.
- Escalation: drifting balloon or bird formation crosses one half of the route.
- Signature: alternating rooftop gap sequence with a clearly telegraphed safe lane.

#### Harbor Crossing

- Arrival: buoy-like star markers establish the preferred line.
- Escalation: crosswind pulses switch direction at announced intervals.
- Signature: a narrow gate chain over the harbor with one optional bonus gate.

#### Storm Front

- Arrival: clear visibility pocket introduces the upcoming obscured section.
- Escalation: fog closes and reopens in timed pockets; hazard silhouettes remain visible.
- Signature: lightning-like paper flashes reveal a three-lane formation before it arrives.

Reduced motion replaces flashes with a static high-contrast reveal.

#### Aurora Showdown

- Arrival: Red Dart appears ahead and demonstrates its lateral weave.
- Escalation: the rival crosses the player's line at deterministic, telegraphed moments while a boss gate advances.
- Signature: either the Red Dart duel or scissors gauntlet concludes with a final gate and clear beat target.

### Functional Modifiers

- **Crosswind:** directional gust schedule with visible advance warning.
- **Moving Formation:** hazards follow deterministic lateral paths and never spawn directly on the player.
- **Low Visibility:** alternating visibility pockets; critical silhouettes and edge warnings remain readable.
- **Star Trail:** denser guided star ribbons with capped reward multiplication.
- **Shortcut Gates:** physical gate sequence with optional bonus gates and explicit success telemetry.

Each route uses one dominant modifier. Destination staging may change presentation and timing but cannot silently introduce another reward multiplier.

### Objectives

Each route receives one deterministic objective from a destination-appropriate set:

- clear all required shortcut gates;
- chain a target number of near misses;
- finish without consuming a shield;
- collect a percentage of the star trail;
- beat Red Dart at the final gate.

Objectives grant mastery progress and postcard decoration flags, not spendable stars.

## Pilot Mastery

### Data Model

Mastery is stored separately from the active Journey under a versioned record. Each pilot owns:

- mastery level from 0 through 3;
- cumulative progress counters;
- stable achievement receipts;
- unlocked cosmetic IDs.

Telemetry is resolved once from a stable run receipt composed of Journey ID, route ID, and attempt ID. Reloading a result cannot duplicate progress.

### Milo — Navigator

- **Level 1: Route Reader** — complete two Journey routes; unlock portrait variant.
- **Level 2: Gate Scout** — clear six shortcut gates; unlock map trail and enhanced gate preview.
- **Level 3: Paper Cartographer** — complete all four destination types; unlock compass postcard border.

Navigator remains a readability side-grade. Enhanced previews expose information but do not reduce hazards or increase base rewards.

### Pip — Daredevil

- **Level 1: Close Call** — record eight Journey near misses; unlock portrait variant.
- **Level 2: Momentum Fold** — complete two risky routes; unlock ember trail.
- **Level 3: Redline Ace** — beat Red Dart; unlock foil postcard border.

Daredevil's momentum bonus remains capped. It may briefly increase cruise speed after a near-miss chain but cannot bypass route gates, completion conditions, or difficulty scaling.

### Mastery Presentation

The Journey pilot selector displays level, next expressive goal, and the next cosmetic reward. During flight, mastery does not add a persistent panel. A short edge-safe toast appears only when progress or a level changes.

## Postcard World

### Generated Artwork

ImageGen produces four text-free destination illustrations:

- Paper City Rooftops;
- Harbor Crossing;
- Storm Front;
- Aurora Showdown.

All four use a consistent handcrafted paper-diorama style, warm tactile materials, readable silhouettes, restrained color, no logos, no typography, no watermark, and composition safe for both portrait cards and responsive crops. Final web assets are optimized derivatives; source generations remain outside the runtime bundle.

### Postcard Construction

The completed postcard stores references and metadata rather than a screenshot:

- destination artwork ID;
- route path and objective outcomes;
- pilot and mastery level;
- earned stamp IDs;
- unlocked border and trail decoration IDs;
- total stars and distance;
- rival outcome;
- completion date;
- perfect-status flag.

Postcards created by the current release remain valid. Migration fills missing expansion fields with neutral defaults.

### Reveal

After the final route, a dedicated DOM overlay presents the postcard with one meaningful unfold animation. Reduced motion uses a simple fade. The reveal includes View Details, Share, and Continue actions and never traps navigation.

### Album

The Postcards tab becomes a responsive artwork grid. Selecting a card opens a detail surface containing route history, stamps, objective results, pilot mastery decorations, totals, and rival result. Empty and legacy states remain readable.

Sharing uses the existing browser/iOS share path. If image sharing is unavailable, the game shares a compact textual Journey summary and URL.

## Interface and Visual Direction

The existing warm paper material language remains. New UI uses CSS variables for postcard borders, mastery accents, danger, and destination palettes.

During gameplay:

- the center and lower-middle flight corridor remain clear;
- one route/objective chip occupies the top edge;
- rival delta appears only during the finale;
- encounter and mastery notes time out automatically;
- risk and success never rely on color alone;
- safe-area insets and large touch targets apply on iOS;
- all non-essential motion respects reduced-motion settings.

The Journey map and album may be visually richer because they are non-gameplay surfaces. They remain vertically scrollable on compact phones.

## Architecture and Data Flow

### Modules

- `journey-encounters.js`: deterministic encounter timelines and objective definitions.
- `journey-mastery.js`: pure mastery resolution, cosmetic unlock definitions, and receipts.
- `journey-mastery-storage.js`: versioned mastery persistence and recovery.
- `journey-postcards.js`: postcard migration, storage, and share model construction.
- `journey-ui.js`: map, pilot mastery, results, reveal, album, and detail rendering.
- `main.js`: adapts encounter events to existing spawners and submits final telemetry.

### Run Data Flow

1. Route selection persists the active route.
2. `buildRunConfiguration` includes encounter seed, destination, objective, pilot, modifier, and attempt ID.
3. The encounter director creates a deterministic event timeline.
4. Existing gameplay systems execute events and record compact telemetry.
5. Finalization constructs one immutable Journey outcome.
6. Journey progression, mastery, rewards, and postcard metadata resolve from that outcome using stable receipts.
7. All updated records save before the result UI appears.

Classic and other modes do not create encounter timelines and continue through their existing paths.

## Persistence and Migration

The active Journey record increments to version 2. Migration from version 1 preserves route progress, pilot, stamps, totals, status, and postcard references. Missing encounter and attempt fields are generated deterministically from the existing seed and current step.

Mastery uses its own versioned key. Postcards retain the existing key with per-card normalization on load.

Recovery is scoped:

- corrupt active Journey data resets Journey only;
- corrupt mastery data resets mastery only;
- one invalid postcard is skipped without deleting valid cards;
- unrelated settings, upgrades, missions, records, and stars remain untouched.

## Image Asset Pipeline

ImageGen runs as a four-job batch from a temporary JSONL file. Final source outputs are inspected for style consistency and forbidden text. Selected images are cropped and optimized into stable filenames under `public/assets/journey/`.

Runtime CSS and postcard models reference stable paths, never generated hash names. The iOS bundle sync and parity scripts include the optimized files automatically.

## Error Handling

- Missing encounter content falls back to a safe arrival, normal hazards, and the standard distance finish.
- An invalid objective becomes a completion-only objective without blocking the route.
- Failed mastery writes do not withhold Journey completion or normal star rewards.
- Missing artwork renders a themed CSS paper fallback with destination icon.
- Failed sharing leaves the postcard open and presents copyable summary text.
- Analytics and leaderboard failures never block progression.

## Analytics

Non-blocking events add:

- encounter started and completed;
- route objective completed or missed;
- mastery progress and level unlocked;
- cosmetic unlocked;
- postcard revealed, opened, and shared.

Events contain content IDs and aggregate outcomes only. They do not contain player-entered names or generated image payloads.

## Testing and Proof

### Unit Tests

- identical seeds produce identical timelines;
- events remain ordered, reachable, and within lane bounds;
- each modifier changes the intended configuration;
- objectives resolve correctly at boundary values;
- mastery receipts prevent duplicate progress;
- mastery levels and cosmetics unlock at exact thresholds;
- Journey v1 migrates to v2 without lost progress;
- legacy postcards normalize without deletion;
- corrupt records recover independently.

### Browser Tests

- desktop and mobile route preview;
- each encounter type reaches gameplay;
- shortcut gate success and failure;
- objective and mastery results;
- postcard reveal, detail, album, and share fallback;
- reload persistence across route, result, and reveal states;
- Classic and Daily regression paths;
- reduced-motion and compact-height layouts.

### Visual Playtest

Computer Use and the web-game test loop capture and inspect:

- Journey map and mastery selector;
- every destination encounter;
- Red Dart finale;
- route result with mastery progress;
- postcard reveal and album detail;
- desktop and mobile crops;
- console errors and text-state parity.

### iOS and Release Gate

Before commit and deployment:

- all unit and browser suites pass;
- Vite production build succeeds;
- iOS build regenerates;
- iOS payload parity passes;
- native simulator build and touch walkthrough succeed;
- a signed physical-device Release build succeeds.

After verification, changes merge to `main`, push, and deploy to Vercel production. The prior phone app is then uninstalled, the released source is rebuilt, and the fresh build is installed and launched on the connected iPhone.

## Deferred Work

- additional Journeys, destinations, pilots, and rivals;
- cloud synchronization;
- live multiplayer;
- voice dialogue;
- consumable mastery rewards;
- procedural generated artwork at runtime;
- permanent power increases from mastery.
