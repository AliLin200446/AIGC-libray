# Studies R1

Canonical route: /explore. /clips redirects with query parameters preserved. Existing detail routes, rights gates, P1/P2 and the full registry at /explore?all=1 remain available.

## Adapter

src/studies/studies-adapter.ts reads the existing six prototype ClipReference records; no studies-data fixture is shipped. IDs, titles, categories, source attribution and lens chips come from the registry. toClipPage supplies the same schematic CameraSetup used on detail pages and gates available media. Durations are the permitted studied range for official media, or the original clip duration for hosted media; unavailable durations are omitted. Awaiting footage is derived from gated playback availability. No permissions are inferred from a source URL.

Two film references: The Shining (18-second provider selection) and Vertigo (source link only; unknown duration). Both retain schematics because there are no cleared stills. Four original demonstrations: Dolly, Tracking, Pan, Orbit, each six seconds with a poster and short loop. Actual shot-size categories are Medium 2 / Wide 4; evidence remains the registry's insufficient level rather than the mockup's moderate label.

## Assets

Re-rendered dolly, tracking, pan and orbit MP4/JPG pairs in public/media/originals from the existing renderer, using --ff-scene-* tokens from pixel-theme.css. No CSS filters or outside media used. No original render remains on the old palette. Attribution and provenance remain bundled; lighting metadata now says neutral rather than warm.

## Interaction and validation

- Horizontal URL-backed source, movement and shot-size filters; unsupported query values ignored; no redundant lens filter.
- Cards are single links; detail navigation retains the existing history/scroll handling.
- Lazy muted original previews, one at a time, reset on leave/blur, pause offscreen/hidden, cleanup on disposal; reduced-motion and touch do not start previews.
- Decorative DPR-capped mosaic clears its interval when offscreen, document hidden or reduced motion; cleans observers/listeners on disposal.
- FX canvas z-index 0, reading content z-index 1, palette refreshed on first pointer movement, mosaic marked data-ff-no-trail.
- Browser checked /clips, source=film&move=dolly, empty state, Clear filters, junk query, detail navigation, muted preview playback/exclusivity and pause/reset. Desktop three columns; 375px single column without horizontal overflow.
- Timer lifecycle and reduced-motion branches tested with mocked browser observers/preferences, not a manual Performance-panel capture.
- TypeScript, ESLint, 184 tests, production build, privacy/release audit pass. Existing Three.js bundle-size warning remains. No deployment.

## Files

Added src/studies/studies-model.ts, studies-adapter.ts, studies-page.ts, studies.test.ts; src/pixel/mosaic-heading.ts; src/styles/studies-page.css.
Updated src/clips/pages.ts, src/clips/originals.ts, src/main.ts, src/pixel/interactions.ts, package.json, scripts/render-original-demos.py, eight original media assets and their PROVENANCE.txt.
