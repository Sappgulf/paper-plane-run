# Retired art

Art that the release no longer ships. Nothing in `src/` or `public/` loads these
files, so they are kept here for reference instead of inflating the first-visit
download.

- `obstacles/` — flyer sprites. Enemies are now cut from paper at runtime by
  `src/game/paper-art.js` in each zone's accent, so the WebP sprites for the live
  flyers (bird, balloon, kite, biplane, dragonfly, wasp, origami hawk) are kept
  here as reference. Also here: the sprites for flyers removed from the core
  roster (butterfly, swarm, pinwheel, paperclip meteor, clothespin dragonfly) and
  the unused scissors billboard, which is drawn procedurally.

- `bosses/` — the WebP boss emblems (scissors, stapler, wind). The emblems are
  now drawn on a canvas by `src/game/boss-art.js` as `paper:boss:<id>` textures,
  which matches the enemies. `scripts/process-boss-art.mjs` still produces these
  files if they are ever needed again.

To bring a sprite back as a runtime texture, add a loader for it in the flyer
pipeline and let `test/shipped-art.test.js` confirm the reference. To bring a
flyer back to the roster, add its entry to `FLYER_DEFS` with `sprite: 'paper'`.
