# Curated cinematic prototype

Local entry: http://127.0.0.1:5174/explore

The four editorial views reuse existing record IDs. They do not create queue records, change grants, approve film publication, invoke AI or download footage. The tracked content is authored text and original geometric diagrams; private audit/review data stays private. Exactly EXPLORE / COMPOSE / INDEX remains in navigation. Root instrument/loading code is unchanged in this pass.

| Film / ID | Study | Media in Explore | Remaining media requirement |
|---|---|---|---|
| The Shining / film-discovery-05 | Danny’s tricycle corridor / tracking | Original diagram | Existing Movieclips player played in local Admin; precise scene evidence and publication permission still required |
| Vertigo / film-discovery-10 | Bell tower / dolly zoom | Original diagram | Existing Movieclips candidate has local-Admin-only embed permission; scene/playback review and publication permission remain |
| The Grand Budapest Hotel / film-discovery-02 | Hotel interior / symmetry | Original diagram | Searchlight source page only; no reviewed embed or display authorization |
| In the Mood for Love / film-discovery-01 | Corridor / doorway occlusion | Original diagram | Criterion montage candidate has local-Admin-only embed permission; matching excerpt and public display permission remain |

A local-only detail action opens the existing Admin record for reviewing its source. The Shining player was tested successfully in that existing permitted context; a playing source does not establish a verified excerpt. No temporal observations or scene verification were fabricated. The three existing embed grants have a November 25, 2026 internal re-review deadline. All four are still candidate records. No permission scopes were broadened.

Each detail presents scene identity, camera technique, seven authored parameter fields, attribution/source links, a Curated Camera Prompts section, Copy Prompt, and Try in Compose. No AI panel is shown on these curated details. Existing AI/image tools elsewhere are unchanged and no new integration was added.

The prompts specify motion, framing, positioning, qualitative lens behavior, pace, spatial layers and negative constraints without movie/director-name shorthand. They are exercises, not reconstructions of measured production setups. The Vertigo exercise explicitly uses backward translation plus zoom-in; it does not assert this is the film’s exact rig or direction. Technique research links remain distinct from scene evidence.

Compose transfers centered/symmetrical/negative-space framing and authored static-camera choices. Unsupported following motion, low camera height, dolly zoom, foreground occlusion and subject animation retain defaults and are disclosed prominently. Continuous focal changes and other supported controls update the existing prompt generator. Reset to Reference and Reset to Default remain available. A 50mm starting lens is a creative default, not a film measurement.

The approved-public-film adapter remains authoritative: if the same ID later has reviewed, authorized media in the existing publication manifest, catalog merging reuses that media without a second film card. No publication manifest was changed in this task.

## Validation

- TypeScript, ESLint, all 170 tests, production build and release/privacy audits pass.
- Browser: all four detail URLs; original poster rendering; symmetry filter; Compose handoff for symmetry/negative space; unsupported tracking/dolly-zoom warnings; focal/composition edits and prompt synchronization; reset; refresh; back to reference.
- Copy: copied the visible Grand Budapest prompt, pasted via ControlOrMeta+V into an unsaved local review field, and compared the complete string successfully. Cleared the test field without saving the record.
- 390px: library, detail and Compose fit without horizontal overflow; desktop layout inspected. Existing lazy loading is retained.
- Media: existing Shining Admin player played. Other sources are not claimed as verified playback; Explore deliberately uses four original fallbacks. Production rights/expiry tests continue to pass.
- Existing large Three.js bundle warning remains; no dependency changes.

## Files changed in this pass

`src/clips/curated.ts`, `curated.test.ts`, `types.ts`, `catalog.ts`, `pages.ts`, `media.ts`, `clips.css`; `src/playground/mapping.ts`, `page.ts`; four `public/clips/film-discovery-{01,02,05,10}.svg` diagrams; `scripts/prepare-release.ts`; `package.json`; `README.md`; this document. Earlier uncommitted work was preserved.

No deployment, submission, media download, film publication or AI request was performed.
