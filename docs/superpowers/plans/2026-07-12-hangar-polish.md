# Hangar Navigation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix Hangar tab scroll persistence and Aim feel selection loss without changing the game's visual identity or save format.

**Architecture:** Keep `showHangarTab()` as the navigation boundary. Reset the shared `.hangar-body` scroll position there, and correct `renderSettings()` so it writes values that match the existing `<option>` elements. Prove both behaviors with browser-level regressions.

**Tech Stack:** Vite, vanilla JavaScript ES modules, Playwright, Vitest, XcodeGen/XcodeBuildMCP, WKWebView.

## Global Constraints

- Preserve all existing localStorage keys and persisted values.
- Do not add new gameplay, progression, or visual systems.
- Keep the patch localized to `src/main.js` and `e2e/smoke.spec.js`.
- Use the in-app Browser for visible proof after edits.

### Task 1: Add failing Hangar regressions

**Files:**
- Modify: `e2e/smoke.spec.js`

- [ ] Add a mobile test that scrolls `.hangar-body`, switches to Editor, and expects the scroll position to return to zero and the palette to be visible.
- [ ] Add a mobile test that selects Aim feel `0.75`, switches to Editor and back to Settings, and expects `#set-mouse-sens` to retain `0.75`.
- [ ] Run the focused tests and confirm they fail against the current implementation.

### Task 2: Apply the minimal production fix

**Files:**
- Modify: `src/main.js:2886-2901`
- Modify: `src/main.js:3194-3200`

- [ ] Reset `.hangar-body.scrollTop` after the selected Hangar page is updated.
- [ ] Map persisted aim-feel values back to `0.75`, `1`, `1.4`, or `1.85` without changing the saved numeric setting.
- [ ] Rerun the focused browser tests and confirm they pass.

### Task 3: Full verification and iOS proof

- [ ] Run `npm test`.
- [ ] Run `npm run test:e2e` and record any remaining harness failures separately from app failures.
- [ ] Run `npm run build` and `npm run build:ios`.
- [ ] Build and run `PaperPlaneRun` on the iPhone 17 Pro simulator.
- [ ] Recheck menu, Hangar, Settings, Editor, and game-over in the in-app Browser.
- [ ] Run `git diff --check` and inspect `git status` for unrelated changes.
