# Final navigation correction — 2026-11-04

Header: FRAMEFIELD logo → `/`; exactly EXPLORE / INDEX / AI ANALYZE.

| Route | Experience | Active header item |
| --- | --- | --- |
| `/` | Original Camera Instrument | None |
| `/compose/workspace` | Existing Try the Shot workspace | None |
| `/explore`, `/explore/:id` | Reference library and detail | EXPLORE |
| `/index`, `/library/:slug` | Twelve controls and detail | INDEX |
| `/analyze` | Coming Soon / not available | AI ANALYZE |

The analysis attachment is future design context only. No uploader, mock result, processing state, provider integration or API request is enabled.

Legacy routes preserve queries: plain `/compose` → `/`; `/compose?shot=1`, `/compose?clip=…`, `/compose?film=…` and `/playground` → `/compose/workspace`; `/clips` and its detail routes → `/explore`; `/about` → `/index`; `/explore?image=1` → `/analyze`. Existing scene editor and recipe tools remain available through `/compose?workspace=1`, `/compose?presets=1` and `/compose?recipe=…`. These are not top-level header destinations. Production server uses redirects; client fallback normalizes with replaceState, preserving hashes and avoiding an extra Back step.

Validated: TypeScript, lint, 188 tests, production build and privacy audits. Browser tested logo/Home CTA, workspace reload and back/forward, film Copy Prompt confirmation and workspace/reference round trip, Index/control return, and mobile 390px navigation with no horizontal overflow. Production browser refresh verified at `/compose/workspace` without query parameters; legacy reference redirects and `/analyze` also passed with no captured console errors. Fixed direct workspace layout selection to depend on the route, not only `shot=1`. Canonical production HTML is generated for `/analyze` and `/compose/workspace`.

No deployment. Existing bundle-size warning remains; no new functional blocker found. Media rights, private records and AI analysis restrictions are unchanged.
