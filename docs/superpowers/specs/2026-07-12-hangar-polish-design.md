# Hangar Navigation Polish Design

## Objective

Make the Hangar feel deterministic when players move between its tabs. Every
tab should open at its own top, and saved aim-feel choices should remain
visibly selected after navigation.

## Scope

- Reset the shared Hangar body scroll position whenever a tab is shown.
- Restore the Aim feel select using the exact values declared by its HTML
  options: `0.75`, `1`, `1.4`, and `1.85`.
- Add browser regressions for mobile tab scroll reset and aim-feel persistence.
- Rebuild the offline iOS web bundle and verify the running iOS shell.

## Non-goals

- No visual redesign, progression changes, new settings, or save-key changes.
- No refactor of the large `src/main.js` UI module.

## Design

`showHangarTab()` remains the single navigation boundary. After it updates
visibility, it resets `.hangar-body.scrollTop` to `0`, which fixes both opening
a new tab and reopening the Hangar without duplicating scroll logic across
renderers.

`renderSettings()` keeps the persisted numeric setting but maps it back to the
existing option values. Values below `0.85` select `0.75`, values above `1.15`
select `1.4` or `1.85` as appropriate, and normal remains `1`.

The browser tests exercise the actual menu-to-Hangar-to-tab path and assert
both the scroll position and the selected option after a round trip.

## Verification

- Focused browser regressions fail before the production patch and pass after it.
- `npm test`, `npm run test:e2e`, and `npm run build` are rerun.
- `npm run build:ios` refreshes `ios/PaperPlaneRun/web`.
- XcodeBuildMCP builds and launches `PaperPlaneRun` on the iPhone 17 Pro
  simulator; the in-app browser rechecks the same web flows.
