> Historical report: the final navigation is superseded by [Navigation correction](navigation-correction.md).

# Navigation audit — 2026-11-04

## Pre-fix inventory and intended map

All routes bootstrap through main.ts. Normal global links load a document; the Explore list/detail controller uses pushState/popstate and saves scroll position. Filters use replaceState. Aliases use replaceState in development and redirects where served by staticSite. A module-load fallback is not a splash page. P1 is an interactive destination, not a loading screen.

| URL | Current renderer / purpose | Entry / exit | Active nav | Public / direct and refresh |
|---|---|---|---|---|
| / | renderInstrument P1 | direct, control docs / CTA, header | Compose | yes; same on refresh |
| /compose | renderPlayground centered variant (bug) | global Compose / tools, header | Compose | yes |
| /compose?shot=1 | renderPlayground P2 | P1 CTA / tools, header | Compose | yes; history saves controls |
| /compose?clip=:id | renderPlayground centered variant (bug) | Inspect / Back to Reference, tools | Compose | yes; ID resolves public catalog |
| /compose?film=:id | renderPlayground | local review / Back to Reference | Compose | private data loads in DEV only; production safe defaults |
| /compose?workspace=1 | renderInstrument P1 | Scene Workspace, remix / CTA, header | Compose | yes; editor not enabled (bug) |
| /compose?presets=1 or ?recipe=:id | renderRecipes | P2 tools / Compose, control docs, remix | Compose | published recipes only; unavailable fallback |
| /explore | renderClips → renderStudiesPage | logo, Explore / cards, Image analysis | Explore | yes; URL filters restored |
| /explore?all=1 | renderClips legacy full catalog | direct / cards | Explore | yes; retained dependency |
| /explore/:id | renderClipPage | cards, previous/next / library, Compose, sources | Explore | yes; missing ID fallback |
| /explore?image=1 | renderInstrument + createReferenceMode | Analyze Your Own Image / header, suggestions | Explore | yes; processing requires configured provider and user action |
| /index | renderCatalog → renderIndexPage | Index / control docs, external links | Index | yes; terminology, explanation, limitations |
| /library/:control | renderLibrary | Index, lens Explore, source links / Index, instrument | Index | yes; unknown control fallback |
| /library | alias to / | legacy / instrument | Compose | public alias |
| /clips and /clips/:id | aliases to /explore equivalents | legacy links | Explore | queries retained |
| /playground | alias to /compose (wrong variant) | legacy links | Compose | queries retained |
| /about | alias to /index | legacy links | Index | yes; renderAbout branch is unreachable compatibility code |
| /recipes and /recipes/:id | aliases to Compose recipe queries | legacy links | Compose | yes; duplicate fallback branches unreachable after canonicalization |
| /admin/references | renderFilmReferences | local direct / review, private demo, Compose | none | DEV only; not in production build |
| /admin/references/demo | renderReferenceDemo | local review / review | none | DEV only |
| /dev/clip-ingestion, /dev/recipes, /dev/reference-curation, /dev/controls | corresponding dev tools | local direct / tool links | none | DEV only |
| unknown route | renderUnavailable; production 404 | invalid URL / public links | none | public safe fallback |

The three public nav labels remain Explore / Compose / Index; every logo goes to Explore, the established public landing page. P1 remains accessible at / and should also be the top-level /compose destination. P2 should consistently use /compose?shot=1, optionally with clip or film context. Existing aliases remain supported.

## Confirmed bugs and minimal fixes (before implementation)

1. Top-level Compose opens a centered playground rather than P1: main.ts sends every bare /compose to renderPlayground. Dispatch bare Compose to renderInstrument.
2. Inspect links omit shot=1 and consequently open the wrong P2 presentation. Normalize clip/film queries and legacy /playground to shot mode, and make new links explicit.
3. Scene Workspace links open P1 but never enable its existing editor, after removal of the old Edit Scene button. Add an explicit edit query to that action and enable the existing composeUI there. Keep workspace=1 compatibility behavior.
4. P2 has no clearly named Back to Camera Instrument action. Add an ordinary link to /compose using existing toolbar styling.
5. Control-page back links target /index#camera etc., but Index headings use ix-fam-* IDs. Correct the anchors.

No routing rewrite is needed. Existing state mapping and reset logic are shared and remain in use. No rights changes, external analysis requests, deployment or admin publication are authorized in this audit.

## Final canonical map

- Logo → /explore (public landing).
- Explore → /explore → /explore/:id → /compose?shot=1&clip=:id → Back to Reference.
- Compose → /compose (P1) → TRY THE SHOT → /compose?shot=1 (P2, with validated handoff query).
- P2 → /compose via Camera Instrument; /compose?workspace=1&edit=1 via Scene Workspace; /compose?presets=1 via Recipe Presets.
- Index → /index → /library/:control → /index#ix-fam-:family or /compose#:family.
- Image analysis remains /explore?image=1, with Explore active and explicit provider-unavailable state.
- / remains a P1 compatibility entry; /compose?workspace=1 remains P1; /playground normalizes to P2. Legacy clip/film queries gain shot=1 without an extra browser-history entry. Other aliases/private boundaries are unchanged.

## Additional confirmed failures and corrections

6. Reference-aware P2 had three extra context rows: Timing extended to 805px at 1280×720. Grouped the existing reference/return/uncertainty controls into one row; Timing now ends at 691px and document height is 720px. Expanding uncertainty intentionally allows reading the full notes.
7. Shot mode suppressed the invalid-reference notice. Invalid clip/film requests now explicitly report safe defaults.
8. Index family hash targets are rendered asynchronously, so correcting the href alone did not scroll. A post-render family-anchor scroll now supports both old #camera/#lens/#composition and current ix-fam-* IDs. Verified camera target near y=1.5px after navigation.

## Browser results

- Logo → Explore, cards → detail, Next reference, explicit Back to Reference, and filtered-list browser Back tested. Original filter restored as 04/06 with saved scroll (538px).
- Courtyard reference → P2 correctly starts Dolly. Reset to Default returns Static; Reset to Reference restores Dolly. Switching to Colonnade starts Static and shows its own context; no stale Dolly import.
- P1 85mm → P2, refresh and repeated Back/Forward retain the appropriate controls and one canvas.
- Global Explore → Index → Compose → TRY THE SHOT clicked at 1440×900, 1366×768, 1280×720 and 390×844. Correct active destination; no horizontal overflow; one camera canvas on P1/P2.
- Direct P1/P2, Index, Tilt, analysis, recipe list, local reference queue/private demo, unknown route and invalid-reference route inspected. Scene Workspace now exposes existing scene tools and inspector.
- Analyze is disabled with provider-unavailable messaging. No upload or model request was performed. Admin review/publication actions were not mutated.
- Browser console error log was empty during the navigation sweep. External citations and third-party player availability were not re-reviewed; this audit does not change their permissions.
- Ordinary cross-section links retain the existing document-navigation architecture. Explore list/detail navigation remains client-side. No new global SPA router was added.
- There is no independent splash/loading route. P1 remains an interactive page, never an automatic redirect to P2.

## Remaining limitations

P2 has its existing Replay action, not a scrub timeline. Camera angles and unsupported source motions remain explicit defaults. Live analysis requires provider configuration and applicable media rights. No new generation/analysis feature was enabled. No deployment performed.

## Modified files

src/navigation/routes.ts, routes.test.ts; src/main.ts; src/playground/page.ts, playground.css; src/library/instrument/home.ts; src/clips/clip-adapter.ts; src/dev/film-references.ts; src/library/library.ts, catalog.ts; this report.

## Final automated / production validation

TypeScript and ESLint pass; all 185 tests pass. Production build, private-fixture exclusion check and release audit pass. Existing large Three.js chunk warning remains. Local production HTTP checks return 200 for Explore, reference detail, both Compose entries, Index and Tilt; admin, private demo, dev controls, private API and unknown page return 404. Production browser verification confirms legacy /compose?clip=demo-dolly normalizes to shot=1, shows the correct Dolly reference, and exposes exactly three top-level links.
