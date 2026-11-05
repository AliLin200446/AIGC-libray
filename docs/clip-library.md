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

## Film media discovery pilot (local only)

Open `/admin/references`. The existing twelve `film-discovery-XX` IDs remain the source of truth. **Discover Media for All 12** performs a bounded metadata pass, records per-film errors, and stops for review. It never runs on page load and does not download, analyze, approve or publish media. Missing credentials produce explicit blocked states; the eight previously imported video sources can still be reviewed. oEmbed metadata is not proof of playable footage or scene correctness.

Configure server-only variables in `.env.local` at the project root, then restart `npm run dev`:

- `TMDB_API_READ_ACCESS_TOKEN`: your TMDB API Read Access Token.
- `TMDB_ATTRIBUTION_LOGO_URL`: an approved logo URL copied from TMDB branding, hosted on `image.tmdb.org`. Required before cover preview.
- `YOUTUBE_API_KEY`: a YouTube Data API v3 key.
- `YOUTUBE_CHANNEL_IDS`: comma-separated channel IDs whose studio/distributor provenance you independently verified. Search results from other channels are discarded.

Do not use `VITE_` prefixes. No OpenAI key is needed; AI processing remains disabled. Never paste keys into Admin fields. TMDB matching checks normalized title (or original title) and release year. Ambiguous matches remain review candidates. Landscape backdrops are preferred to portrait posters. Paths and sizes come from TMDB API responses and configuration; no guessed poster URLs or image downloads.

Before granting image display, verify the applicable TMDB non-commercial/commercial terms, underlying image rights, attribution/logo requirements, permitted audience and expiry. TMDB does not claim ownership of API images. API credentials are not a redistribution license. See [TMDB FAQ](https://developer.themoviedb.org/docs/faq), [image URL construction](https://developer.themoviedb.org/docs/image-basics), and [approved logos](https://www.themoviedb.org/about/logos-attribution).

### Review the first existing clip

1. Select **In the Mood for Love**. Its previously imported Criterion source and local-only embedding evidence remain intact.
2. Click **Preview** in Media discovery. The official player loads only while that exact attachment has active embedding permission. No playback is inferred from loading an iframe. If unavailable, use **Video Source**.
3. Watch the intended excerpt. Enter **Media reviewer**, **Media review notes**, and **Scene match evidence / timestamps**. Confirm playback only if it actually plays. Click **Save Scene / Playback Review**. This is not publication approval.
4. For a new discovery result, enter the same evidence and click **Attach Video**. This uses the existing import workflow and clears old video permissions when replacing a source. Verify embedding rights through the existing permission review before preview. Source-relative start positioning is provider-supported, not frame-accurate trimming.
5. Click **Find Cover** after configuring TMDB. Choose **Attach Cover** or **Replace Cover**, then enter cover rights evidence and expiry and click **Verify Cover Display Rights**. **Preview Cover** loads the external image only after that review and branding setup. Replacement removes the prior cover grant. **Revoke Cover Rights** immediately blocks new previews and tears down existing previews on the next permission check (up to four seconds).

### Public boundary

Local grants are explicitly insufficient for public use. `src/references/film-publication.json` is an **empty**, separately curated public manifest, never generated from or synchronized to the private queue. No publication action is exposed by this pilot. A future explicitly authorized release must prepare sanitized `PublicFilm` entries (type in `src/clips/film.ts`) using the same IDs, a human-confirmed scene/playback review, `publicationApproved: true`, and independent active embed and **public display** grants. Covers need their own public image grant, source attribution and approved TMDB logo URL. Missing, malformed, revoked or expired grants fail closed. Only add data whose publication is authorized; never copy private audit history, API keys or local filesystem paths.

Approved public entries reuse `/clips` cards and `/clips/film-discovery-XX` details with official click-to-load players, film/year/attribution, technique and Copy Prompt. No iframe autoplays or loads on hover. Cover failures use the designed placeholder. Players unload offscreen and when permissions expire. Explicit removal/revocation in a prepared public manifest requires rebuilding an already deployed static site; Admin revocations affect Admin only. The existing hosted-stock-clip release path remains separate and permission-gated. Public image/frame CSP origins are narrowly limited to TMDB, YouTube and Vimeo; the private queue is not a public route.


## Private single-reference workflow (2026-11-04)

Open `http://127.0.0.1:5174/admin/references/demo` with `npm run dev -- --port 5174 --strictPort`. The existing 2001 record (`film-discovery-04`) links to this development-only page from Admin. Nothing is added to the public manifest.

The official Movieclips player was observed playing locally. Browser samples at approximately 00:27 and 00:36 showed the central doorway and overhead panel at stable screen positions while the two seated subjects changed head orientation. Those observations and a moderate-confidence static-camera inference were recorded in the private queue with an audit entry. The selected excerpt is 27–36 seconds (provider-supported timing, not frame-accurate trimming). Two samples do not exclude subtle motion or intervening cuts. No physical focal length or rig was verified; the record remains a candidate and all existing rights scopes are preserved.

The page separates real browser evidence from an authored **mock analysis fixture**. The mock 0–6 second timeline is hypothetical and never saved as film evidence. The fixture uses the existing Observation/Finding schema and linked temporal samples. Meta's [official Model API documentation](https://dev.meta.ai/docs/overview) lists Muse Spark with server-side `MODEL_API_KEY` authentication. No such key is configured locally, and the films lack third-party analysis permission; no model transport or request was enabled. A real integration still needs authorized media, explicit analysis permission, credentials, and temporal input validation.

Choose **Use Static Framing as Creative Start**, then adjust static/dolly, composition, lens, travel and duration. The existing Three.js `applyRecipe`/`remixPose` system and the prompt read the same creative state. Subject motion, lighting and focus are not simulated; the single schematic subject is not a physical reconstruction of the two-person film set. Creative state survives navigation in session storage; resume it explicitly on return. Copy Prompt copies the displayed text exactly. Browser verification used a paste-back into an unsaved Admin field and cleared the field afterward.

Embedding permission is rechecked before loading and every four seconds; loss of permission, queue errors, offscreen playback and hidden tabs stop the player. The development route and fixture are excluded by the production build and checked for leakage. Tests cover permission expiry/revocation, source-ID matching, fixture provenance, actual pose changes, prompt synchronization and invalid restored state. Desktop/mobile layouts, playback, clipboard and back navigation were checked; 157 tests, TypeScript, lint and production build passed. No download, AI request, approval, publication or deployment occurred.

Next priority: replace the hypothetical model fixture with validated temporal analysis of explicitly authorized test media, keeping browser observations, model inference and creative parameters distinct.

## Inspect → Playground handoff

`/playground` now reuses the private demo's extracted control/prompt functions and the existing Three.js recipe renderer. No new model request, media grant or database is involved. Public `/clips/:id` details and private `/admin/references?id=...` details link to **Try in Playground →**. The development Library includes a link to private film references; those records never enter the public catalog.

The URL carries one validated `clip` or `film` ID, never raw camera values or arbitrary return URLs. Film lookup is compiled out in production. Unknown/unavailable IDs load defaults with a notice. A fresh direct visit loads the default Canonical Scene; a refreshed history entry restores its validated creative edits. Returning from Inspect creates a fresh reference-initialized entry. Browser back/forward retains each entry's own state. Reset to Reference restores the mapped snapshot; Reset to Default restores standard creative defaults while retaining the source context.

The typed mapper imports moderate/strong evidence for static or dolly-in movement, exact supported composition labels, and observed exact 24/35/50/85mm lens values. Weak/insufficient evidence, unsupported labels and inferred focal lengths are explained and left at defaults. Broad lens tendencies never become exact focal measurements. Private films currently supply reviewed movement inferences only; the 2001 sample maps static movement. Other film hypotheses remain unmapped until supported structured findings exist. Shot size, angle, lighting, subject animation, pan/tilt/orbit/tracking/handheld and source movement speed are not mapped by this compact Playground; dolly travel and duration remain explicitly creative defaults.

The shared archive navigation is Library / Playground / About. Original instrument, catalog and recipe routes remain available through About. The original instrument's mode toolbar remains intact. Production route generation includes Playground and About, but does not expose private Admin data. No deployment is performed by this change.

Handoff validation: 163 tests passed, plus TypeScript, ESLint and production build. Browser smoke checks covered both Inspect entry points, switching film 04 to film 01, refresh of edited controls, Back to Reference, browser back/forward, both resets, direct default Playground, exact clipboard paste-back and 390px rendering without horizontal overflow. The existing renderer supplies reduced-motion handling. No permissions or private reference records were changed in this handoff task.

Handoff files: new `src/playground/{controls,mapping,page,about}.ts`, `src/playground/mapping.test.ts`, `src/playground/playground.css`, and `src/dev/playground-reference.ts`; updated `src/dev/reference-demo-model.ts` (shared function re-exports), `src/dev/film-references.ts`, `src/clips/pages.ts`, `src/library/archive.ts`, `src/main.ts`, `server/site.ts`, `server/site.test.ts`, `scripts/prepare-release.ts`, `package.json`, and this guide. Earlier working-tree changes are retained separately.
