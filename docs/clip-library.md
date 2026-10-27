# Cinematic clip library

The new `/clips` collection and `/clips/:id` detail pages extend the existing vanilla TypeScript archive. The Three.js instrument, `/library` redirect, canonical controls, recipes, reference analysis, and existing routes remain in place. No framework or runtime dependency was added. No deployment was performed.

## Files

- `src/clips/types.ts`: typed clip records and filter taxonomy; reuses `ControlId`, `Finding`, `Observation`, `EvidenceState`, and temporal evidence from `FutureVideoMotion`.
- `src/clips/data.ts`: nine explicit placeholder briefs, exact prompts, source and rights metadata.
- `src/clips/model.ts`: URL serialization and filtering (OR within groups, AND across groups).
- `src/clips/media.ts`: poster-first playback, deferred source attachment, muted hover previews, selected native controls, reduced-motion and offscreen/tab pause, teardown.
- `src/clips/pages.ts`, `src/clips/clips.css`: responsive collection, evidence-aware detail, clipboard feedback, client-side history and scroll/focus restoration.
- `src/clips/clips.test.ts`: data integrity and filtering regression tests.
- `public/clips/*.svg`: nine original geometric schematic posters, dedicated to CC0; these are not frames from footage.
- `src/main.ts`, `src/library/archive.ts`, `src/library/instrument/home.ts`: route and navigation integration.
- `scripts/prepare-release.ts`: static detail pages, canonical metadata and sitemap entries.
- `server/site.ts`, `server/site.test.ts`: production route handling and coverage.
- `package.json`: adds clip regression tests to the existing test command.

## Replace placeholder assets

Supply nine cleared video files (prefer same-origin MP4/H.264, with web-optimized encoding), matching 16:9 posters, actual durations in seconds, attribution, original source links, and documented redistribution rights. Put files under `public/clips/` and edit only the corresponding records in `src/clips/data.ts`; no component edits are required. Use stable IDs to preserve published URLs. For external media, explicitly configure the site's content security policy for the approved media/image host; same-origin assets work with the existing policy.

Set `videoUrl` to the real served path, `posterUrl` to the corresponding frame, `duration` to its measured duration, and `source.kind` to `licensed`. Replace both source and license metadata. The CC0 dedication covers only the supplied schematic SVGs, never replacement footage. Do not retain schematic attribution on licensed footage.

Review each clip before supplying observations. Record concrete visual cues in `observations`, temporal cues with start/end times in `evidence`, and inferred techniques in `inferences` with linked observation IDs. Each parameter is a shared `Finding` with its own status, evidence, confidence and source. Keep exact focal length and unverified production methods unavailable. Tags are discovery labels, not verification. Preserve unavailable findings where evidence is insufficient. Update the prompt to match the reviewed clip while keeping creative direction separate from claims about capture.

## Validation

Commands: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.

Chromium browser validation exercised 1440/900/390px widths (3/2/1 columns, no horizontal overflow), combined filter state after reload, exact clipboard contents and confirmation, direct/unknown detail URLs, browser back/forward, scroll restoration and return focus. Existing instrument, index, recipes, dolly and lens-detail routes were smoke tested. Screenshots were visually reviewed.

A temporary original canvas recording exercised real browser decoding and playback through the same media component: no source on initial grid render, muted hover play, pointer-leave pause, reduced-motion suppression, offscreen pause, selected native controls and manual playback. This test recording is not part of the collection or release. Real-asset visual quality, durations and rights still require validation when footage is supplied.

The referenced wireframe was not attached in the available conversation, so the written layout requirements were used. The live domain could not be fetched; the existing local codebase was used as the architecture and visual identity reference.
