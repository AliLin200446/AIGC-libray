# Final acceptance — 2026-11-04

## Result

The local production build passes the core public journey and all four requested layout sizes. **The live deployment does not yet pass:** https://framefield.alilinlab.com/explore shows Page not found and INSTRUMENT / INDEX / CLIPS / RECIPES, confirming an older release. The intended submission entry is https://framefield.alilinlab.com/explore after deployment and a live smoke test. No deployment performed.

Acceptance used the built `dist` directory through the repository's production `staticSite` handler at http://127.0.0.1:5186, with production security headers and no development middleware or AI endpoint. This avoids mistaking development-only functionality for the public demo.

## Critical correction

Production CSP allowed TMDB images but not the new provider-returned YouTube thumbnails. Added only `https://i.ytimg.com` to image sources in `server/site.ts` and `vercel.json`. Existing source-specific thumbnail validation and permission gates remain unchanged. Added regression assertions for the thumbnail policy and explicit private Admin/data/environment routes returning 404. The legacy `/clips/:id` redirect also intercepted `/clips/*.svg`, breaking schematic posters in production. Restricted it to extensionless page IDs in both the shared canonical router and Vercel configuration, with a regression asserting SVG content returns 200 without redirect. Rendering, prompts, parameter mapping, primary navigation and media permissions are unchanged.

## Actual browser walkthrough

1. Open production Explore and select The Shining card.
2. Inspect authored parameters, source attribution, scene evidence and limitations.
3. Load the official player and press its native Play control; film frames advanced through the opening corridor.
4. Click Try in Compose. The reference identity and supported starting defaults transferred.
5. Change focal length from 50 to 51 with the keyboard, select Dolly in and Rule of thirds, and change duration from 6 to 7 seconds. Scene telemetry and guides update; prompt includes the exact supported values.
6. Click Copy Prompt: Copied appeared; clipboard text matched the entire visible prompt exactly.
7. Click Back to Reference: The Shining detail returned. Browser Back restored the changed Compose prompt exactly; Forward returned to the reference.
8. Direct Compose and Index routes rendered successfully. Generic Static study's simulated analysis explicitly says it is not Muse Spark output and not analysis of the reference. Live Muse button is disabled. No model requests made.

## Viewport results — built bundle

| Size | Frame bottom | Lens + four corners | Horizontal centering | Overflow |
| --- | --- | --- | --- | --- |
| 1440×900 | 827px | Fully visible | <0.01px center error | None |
| 1366×768 | 699px | Fully visible | <0.01px center error | None |
| 1280×720 | 653px | Fully visible | Centered | None |
| 390×844 | 609px | Fully visible | Centered; compact labels below | None |

Frame ratio remains 8:5 (1.6). Canvas CSS and backing-buffer ratios agree within integer device-pixel rounding; the existing ResizeObserver updates renderer size and camera aspect. No internal stage scrolling. Supporting controls/descriptions/prompts intentionally continue below the first screen. Navigation has exactly EXPLORE / COMPOSE / INDEX on the checked public views.

## Public boundary and validation

- All 29 generated public HTML routes returned 200.
- `/admin/references`, `/admin/references/demo`, `/local-film-references/queue.json`, and `/.env.local` returned 404 under the production handler.
- Only two explicit public media projections are selected. The Shining matches the requested tracking scene; Criterion is labeled as a related montage, not an exact verified corridor scene. Vertigo and Grand Budapest retain schematics.
- No private queue, private demo, credentials or source maps included per production/release audits. Public evidence projections are intentional, not private-data leakage.
- TypeScript: pass. ESLint: pass. Tests: **173/173 pass**. Production build and privacy/release checks: pass. Existing non-fatal bundle-size warning remains.
- No application console errors captured during the production browser walkthrough. Provider playback remains subject to network, regional and source availability changes.

## Submission readiness

README, project description, architecture, limitations and 110-second demo script now describe the public journey, not an Admin-only demonstration. No live Muse integration is claimed.

Ready for owner-authorized deployment of the tested bundle, followed by a live smoke test. Remaining submission blockers: deploy the new release (current public route fails), confirm organizer eligibility/live Meta requirements, and resolve live Meta access plus processing permissions if mandatory. Public media review expires 2026-12-04; re-review before then. Record the demo and review the submission wording before sending it. Nothing was automatically deployed or submitted.
