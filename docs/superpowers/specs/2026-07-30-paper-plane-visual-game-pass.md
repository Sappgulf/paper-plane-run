# Paper Plane Run — Visual + Gameplay Pass

## Direction

Visual thesis: tactile editorial paper craft meets bright arcade clarity — a warm desk-world with clean sky-blue separation, ink-navy chrome, and coral-orange action feedback.

Reference concept: `/Users/austinbeatty/.codex/generated_images/019fb5cb-1158-79e2-bda1-eb27973bb835/exec-9ed3b51a-cad9-4d0b-bedb-4c6e6cfa2fcd.png`.

The concept is a direction reference, not a replacement for the code-native UI. Existing generated assets remain the source of truth for shipped planes, hazards, bosses, power-ups, and journey postcards.

## Surface plan

- **Menu:** Make `Begin Journey` the visual anchor, keep Classic/Daily/Tutorial/Hangar/Time Attack/Co-op/Hot-seat available, and fit the primary menu within a 720px desktop viewport without clipping the final action or pilot field.
- **Flight:** Improve paper/sky contrast, keep the plane silhouette readable against pale backgrounds, and use a restrained focus reticle + route strip to make the immediate flight lane and next zone legible.
- **Feedback:** Give stars, power-ups, near-misses, boosts, fever, boss warnings, and zone changes one shared paper-ink feedback language: small, fast, high-contrast, and motion-reduced when requested.
- **Responsive:** Keep the canvas full-bleed, move HUD below utility controls on narrow screens, collapse secondary HUD content before it collides with controls, and preserve touch stick readability.

## Design tokens

```text
paper        #fffaf2 / rgba(255,250,242,.92)
paper-shadow rgba(61,44,41,.16)
ink          #243b53
ink-soft     #58708b
sky          #a9d6f4
coral        #e76f51
gold         #f0b429
violet       #7357c9
mint         #69b89a
radius       14px controls, 22px panels, 28px menu
motion       160ms controls, 320ms feedback, 700ms reveals
```

## Architecture boundary

- Simulation remains in `src/flight-engine.js` and its pure `src/game/*` helpers.
- Rendering owns Three.js scene composition, camera, particles, asset loading, and CSS/DOM feedback updates.
- `window.render_game_to_text` and `window.advanceTime` remain the deterministic QA contract.
- HUD and menu copy remain DOM-native; the canvas remains the playfield.
- Assets continue to be addressed through stable domain paths; no runtime state is encoded in raster UI.

## Interaction thesis

1. The first flight feels like entering a paper diorama: menu copy settles in, the action button has one confident lift, and the world establishes depth immediately.
2. A short-lived flight focus reticle and route strip clarify what is actionable without adding a dashboard layer.
3. Feedback moves from the plane outward: pickup pings, near-miss rings, fever warmth, and boss warning contrast are all restrained and respect reduced motion.

## Verification targets

- Desktop: 1280×720 menu and live flight.
- Mobile: 390×844 menu, Hangar, and joystick flight.
- Native generated concept inspected with `view_image` alongside the latest browser screenshot before handoff.
- Deterministic client covers movement, pause/resume, pickup/feedback state, boss/telegraph state, and restart.
