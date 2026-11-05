# Shared global navigation acceptance — 2026-11-04

## Root cause and implementation

The instrument independently built `.instrument-header` / `.instrument-nav`, while other public routes used `.archive-header` inside a constrained/padded content root. Legacy theme overrides further changed height, font size, spacing and active indicators. At 1440 px, the actual Main header was 105 px tall with its logo at x=36 and 14 px type; the archive header was 84 px tall, started at x=57.59 and used 15 px logo type. Pages with scrollbars also shifted the navigation.

All public renders now use `GlobalNavbar()` in `src/navigation/global-navbar.ts` and one stylesheet `src/styles/global-navbar.css`. It reuses the existing pixel glyph immediately on creation (no delayed logo insertion), the canonical route table and route-derived selection. The header uses the Main Page visual identity. A full-width grid row separates global navigation from the existing content-width track, without translation or margin offsets. Stable scrollbar gutters avoid horizontal movement between short and long pages.

Private Admin/development tools keep their existing shell. Analysis transport, inference, Three.js engine, prompts, media permissions and route definitions are unchanged.

## Browser comparisons

Checked the local production build at `/`, `/compose/workspace`, `/explore`, `/explore/film-discovery-05`, `/index`, `/library/tilt` and `/analyze`.

| Viewport | Header height | Logo x | Header nav geometry |
| --- | --- | --- | --- |
| 1920×1080 | 105 px | 36 px | Identical across routes |
| 1440×900 | 105 px | 36 px | Identical across routes |
| 1366×768 | 105 px | 36 px | Identical across routes |
| 390×844 | 70 px | 16 px | Identical across routes |

Exactly one global header per route; no horizontal overflow. Main and workspace have no active top-level item. Explore/detail select Explore; Index/control select Index; Analyze selects AI Analyze. Desktop Main and workspace retained a single-viewport layout with no vertical document overflow. Mobile content continues to flow vertically; all navigation targets are at least 44×44 CSS px.

Results was exercised using the unchanged Analyze renderer and an explicitly simulated, temporary local QA provider—not a new real inference. The fixture was removed after testing and is not shipped. Header height, logo/nav positions and active selection were unchanged through processing/results; all four viewport widths had no horizontal overflow. At 1440 px the Results logo was x=36, y=30, width=135.125; navigation x=1158.273, width=230.727, matching the public pages exactly. No paid API calls were made for this header task.

Clicked all global destinations, logo, Main → Try the Shot (51 mm transfer verified), film detail → workspace and browser Back/Forward; refreshed the workspace and opened all tested routes directly. No console errors in the navigation smoke test. Existing reference mapping was preserved.

Same-size screenshots are saved locally as `/tmp/ff-nav-home.png`, `ff-nav-workspace.png`, `ff-nav-explore.png`, `ff-nav-film-discovery-05.png`, `ff-nav-index.png`, `ff-nav-tilt.png`, `ff-nav-analyze.png`, and `ff-nav-results-qa.png`. Mobile screenshot: `/tmp/ff-nav-mobile.png`.

## Files and validation

- `src/navigation/global-navbar.ts` — shared public component.
- `src/styles/global-navbar.css` — shared geometry, active/focus states, responsive rules and full-width grid row.
- `src/library/archive.ts` — public shell delegates to shared component; private shell retained.
- `src/library/instrument/home.ts` — replaces duplicate instrument header.
- `src/playground/page.ts` — measures shared header for the existing viewport height budget.
- `src/main.ts` — loads shared stylesheet after legacy styles.
- `docs/global-navbar.md` — this report.

TypeScript, lint, all 196 tests, production build and release/privacy checks passed. Only the existing non-fatal large-chunk warning remains. No deployment, credential change, commit or push was performed for this task. Production deployment still requires the separately requested Vercel NVIDIA environment setup and deployment validation.
