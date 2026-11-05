> Historical report: the final navigation is superseded by [Navigation correction](navigation-correction.md).

# Final navigation consolidation

## Routes and reuse

Primary navigation has exactly EXPLORE (`/explore`), COMPOSE (`/compose`) and INDEX (`/index`); the wordmark points to Explore. The root instrument remains available.

Explore reuses the clip catalog, filter/detail renderer, media permission checks, evidence architecture and prompt copy. Each detail has an inline Analyze with AI section. Live Muse is disabled; Show Simulated Analysis explicitly reveals an authored hypothetical six-second fixture, with insufficient confidence. It is not film analysis, is not saved and is never transferred as verified parameters. Existing image inspection remains accessible at `/explore?image=1`; its original provider configuration and permissions are unchanged.

Compose reuses the reference handoff, deterministic prompt/recipe mapping, Three.js Canonical Scene, continuous lens ruler and framing guides. The focused handoff supports static/dolly, four compositions, 24–85mm creative focal length, travel and duration. Full existing controls/editor remain at `/compose?workspace=1`. Existing recipes are optional presets at `/compose?presets=1`; no recipe system was added. Imported inferences retain uncertainty; unavailable measurements use explicit creative defaults. Back to Reference, Reset to Reference and Reset to Default are retained. URL identity plus history state preserves edits on refresh/back without persisting private evidence in public data.

Index reuses the 12-control catalog and adds short workflow, technology, hackathon and limitations copy.

## Legacy aliases

- `/clips` and `/clips/:id` → `/explore` and `/explore/:id`
- `/playground` → `/compose`, preserving reference query
- `/about` → `/index`
- `/recipes` → `/compose?presets=1`
- `/recipes/:slug` → `/compose?recipe=:slug`

Aliases work in client routing, local static server and deployment configuration. Admin remains development-only and absent from public navigation. Local records/rights were not edited or published.

## Validation — 2026-11-04

TypeScript, ESLint, all 167 tests and production build passed. Build privacy/release audits passed. Existing Three.js chunk-size warning remains.

Browser checks: Explore grid and missing-media fallback; inline disabled live AI and explicit simulation; reference handoff; movement/composition changes; continuous 51mm focal value and synchronized prompt; refresh retained edits; both resets; Back to Reference and browser back/forward; switch to another public and private reference; Index; original scene workspace and image inspection; desktop and 390px mobile rendering (no horizontal overflow). No browser console errors were captured during this flow.

Copy Prompt displayed its success state and passes the visible textarea value directly to the Clipboard API. Exact OS clipboard readback could not be confirmed in this background browser session: native paste yielded no text, so a final manual paste check remains recommended. No unsaved test edits were persisted to the local reference record.

## Files in this consolidation

- `src/navigation/routes.ts`, `routes.test.ts`: canonical routes, active navigation and regression checks.
- `src/main.ts`, `src/library/archive.ts`, `src/library/instrument/home.ts`: route dispatch and shared navigation.
- `src/clips/pages.ts`, `src/dev/film-references.ts`: Compose links and inline analysis.
- `src/library/reference/analysis-panel.ts`, `simulated-motion.ts`: explicit shared simulation panel/fixture.
- `src/playground/page.ts`, `controls.ts`: reuse lens ruler/framing and continuous focal override.
- `src/dev/reference-demo-model.ts`, `reference-demo.ts`: share fixture and retain exact focal override.
- `src/recipes/pages.ts`, `src/library/catalog.ts`: preset reuse and editorial content.
- `server/site.ts`, `site.test.ts`, `scripts/prepare-release.ts`, `vercel.json`, `package.json`: redirects/release/test coverage.
- `README.md`, this document: canonical workflow and validation.

Other modified/untracked files predate this consolidation and were preserved.

## Blockers

Live Muse still needs a working key and verified processing permission. Public film footage remains unpublished until review and display authorization; the public library currently uses schematic placeholders. Conditional local embed grants do not authorize AI analysis or public redistribution. No deployment or submission was performed.
