# Flight and world upgrade — 2026-10-02

## Scope and acceptance

The second pass focuses on the flight itself: controlled release after a bank,
a calmer camera, recognizably different maps and hazards, substantial folded
plane silhouettes, readable pickups and boost, named lift columns, and a useful path from a finished run to the next flight.
Existing modes, saves, rewards, guaranteed route gaps and cosmetic collision
fairness must remain intact. Verify unit behavior, browser workflows, actual
screenshots, production bundle budgets, generated iOS parity and deployment.

## Findings and changes

- A 0.35-second bank at 60 Hz left 4.83 units of sideways drift over the next
  second. Neutral steering now applies stronger drag: the same experiment
  drifts 2.46 units and ends at 0.125 units/second instead of 1.455. Full-turn
  release velocity stays 8.912 units/second. Coverage also checks 20 and 120 Hz.
- Camera lean is smaller and reduced motion keeps the horizon steady. Bank
  rotation is applied after `lookAt`, which previously overwrote it.
- Camera position and aim now follow the same lane. Bounded lateral lag and
  aspect-aware distance keep the folded wings inside both route edges, including
  max wingspan during boost in portrait. Projection tests use the real models.
- All six maps use original, cached paper sky, ground and window plates. City
  has streets and houses; Harbor has water, lighthouses and sailboats; Storm
  has purple facets, windmills and crystals; Sunset has terraces and villages;
  Aurora has glaciers and folded trees; Midnight has book stacks and lit stock.
  Seven landmark models merge into two instanced families per map, outside the
  playable corridor. Folded ridges retain one to three quality-dependent draws.
- Ground and building colors use unlit paper materials so their intended
  palettes survive the lighting. The larger ground prevents scenery exposing
  its edge. Ground-life decoration and shared two-cut clouds use independent
  random sequences; new decoration does not consume the route generator.
- All four plane families have broader swept wings, raised folds and matching
  creases. Their shared 0.7 collision radius and cosmetic-only contracts remain.
  Outline copies exclude nested creases and follow the animated wings, fixing
  the upright ink artifact exposed by the larger model.
- Bird, balloon, kite, biplane, dragonfly, wasp and hawk each have an original
  silhouette. The scissors art now fits inside its texture. A real Canvas
  browser check verifies unique alpha masks, useful coverage and empty edges.
- Stars are original five-point paper cuts; rare gold stars visibly say 5.
  Shield, magnet and boost use distinct face-on silhouettes and effect labels,
  replacing rotating crystals, rings and photographic badges. Shared geometry
  and palette-keyed materials keep costs bounded and reuse returning palettes.
- Every active power shows remaining seconds. Boost adds a tapered paper
  streamer along the flight axis; reduced motion suppresses FOV punch, camera
  shake and streamer pulsing. Boost duration, collection, safety and reward
  behavior retain their existing contracts.
- Updrafts use transparent rising arrows, footprint hoops and named lift signs.
  The early star teaching cue falls back to useful lift/power cues when no star
  line exists. Guide and tutorial copy explain that green columns restore height.
- Transparent sky spheres previously painted over pickup signs above the
  horizon because their centers ride the camera. Explicit background ordering
  fixes that occlusion. A browser pixel check verifies ink in the lift sign
  against open sky; a node existing in the scene is insufficient evidence.
- Flight notes use the actual ending and recorded achievements. Held-Tuck
  crashes explain releasing earlier. Practice completion offers Classic plus
  a separate Practice Again button. Tutorial and authored routes cannot claim
  distance records; summaries name the next upgrade and its actual shortfall.
- Returning to menus and results clears flight banners and timers. Count-up
  animation cancels on transitions and respects reduced motion. Result focus
  moves to Retry; tall cards scroll without clipping the heading.

- Street coverage previously used two tracks in the segment length while placing
  four physical tracks, leaving alternating holes. The regression catches the
  original 40-unit gap between 20-unit segments. Each track now tiles the full
  140-unit scroll span, including its seam. City crossings and floor paint share
  a 35-unit block period, with continuous curbs, lane marks and crosswalks.
- Vehicle groups use merged folded bodies, cream stock roofs, dark glazing,
  wheels/runners and lamps. Sedans, vans, pickups and sleds share one instanced
  draw per group. Oncoming vehicles face the opposite direction and occupy
  their own lane. Scaled vehicle bounds remain outside x = ±13 and below the
  flight floor; scenery stays separate from collision and route randomness.
- The nearest folded ridge reached x = 29.45 while the outer pavement extends
  to x = 31.7. Moving that ridge four units outward clears the streets. The
  stronger rotated-extent check caught the overlap in all six maps before the
  fix and now protects both roads and the flight corridor.

## Evidence

Final local verification:

- Unit suite: **603 passed in 88 files**, including the stronger street
  clearance assertions after the final ridge adjustment.
- Development browser suite: **99 passed, 31 intentionally skipped**. After
  the final ridge placement change, the **4 map/street browser checks passed
  again** on desktop and mobile, regenerating all twelve map captures.
- Production browser suite: **61 passed, 69 intentionally skipped**. Production
  executes the tutorial endings in real time. Development-only fixtures are
  omitted from the production bundle and skipped in that lane.
- Production build and bundle budgets passed: initial JavaScript **132,342 /
  163,840 bytes**, total JavaScript **902,441 / 921,600 bytes**.
- iOS web build and parity passed: **76 files match exactly**. The unsigned
  iOS Simulator app build also passed, and its packaged web folder matches all
  76 generated files byte for byte.
- `git diff --check` passed.

Software WebGL exposed wall-clock test limits. Development result checks now
advance the real simulation deterministically; production retains real-time
flight. The restore/undo workflow receives the existing slow-test allowance
for its two reloads. Persistence and result assertions remain intact.

Local logs and captures use `output/round-two-*` and `output/redesign-*-flight-*`.
These artifacts are excluded from Git and deployment.

Manual inspection covers all six maps, an actual completed practice flight,
Classic steering/Tuck/pause, the hazard sheet, and result layouts at 390×844,
844×390, 1280×720 and 1440×900. Browser resource counts are rendering-cost bounds,
not a claim of measured device frame rates.

Hosted GitHub Actions remain subject to the previously observed account billing
lock. Native web parity is checked; a complete native touch playthrough remains
unverified because the simulator control surface does not expose those inputs.
