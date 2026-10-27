# FRAMEFIELD public release

**Reference enablement update:** the code now includes a Vercel Node function for experimental analysis. The original static-only release notes below are historical for Reference behavior, environment variables and API routing. Follow [production Reference Analysis](production-reference-analysis.md) for the current configuration and verified deployment state.

Target domain: `https://framefield.alilinlab.com`.

## Hosting choice and current status

Use **Vercel static hosting**. The installed CLI is authenticated and its project list confirms the existing portfolio at `alilinlab.com` and other portfolio projects use Vercel. No prior deployment configuration existed in this repository. `vercel.json` now defines the static build, clean URLs, legacy homepage redirect, security headers and asset caching. No new analytics is added; none was present.

This pass prepares the release locally. No Vercel project, deployment or DNS record has been created or modified. There is no verified production URL yet. No reference-evaluation work or paid provider call was performed.

## Routes and metadata

- `/`: interactive deterministic instrument, including Index and local Reference inspection.
- `/library`: permanent redirect to `/`; the client also normalizes this alias during local development.
- `/library/<control-id>`: all 12 existing control detail pages, with individual static HTML titles, descriptions, Open Graph/Twitter metadata and canonical URLs.
- Unknown paths, `/dev/controls`, `/dev/reference-eval`, and `/api/reference-analysis`: no public route; real 404s on the static deployment. No catch-all SPA rewrite is configured.
- `/dev/controls` remains available through the development server only. The evaluation CLI/offline pages remain outside the deployed output.

Unfilled model-comparison and assessment panels are omitted from the public detail rendering. A short research-status note and canonical creative intent remain. The original research UI remains in development; the control catalog, experiments, baseline, study manifests and evaluation methodology are preserved. No fabricated results replace pending studies.

## Reference Analysis and privacy

The first public release is static. The Reference interface accepts images locally, reports dimensions, supports replacement/removal, and labels analysis experimental and unavailable. ANALYZE REFERENCE is disabled. The disabled reconstruction DEMO tab is hidden in production. No readiness requests or analysis POSTs are made by the public provider; no development fixture fallback is available.

No variables are required for core Framefield. Do **not** add an OpenAI key to this Vercel project. The existing local API has no public authentication or durable cost controls and must not be exposed as an anonymous paid endpoint. Enabling public analysis is a separate readiness decision, not a deployment setting in this release.

`.env.example` documents server-only OPENAI_API_KEY, OPENAI_REFERENCE_MODEL and OPENAI_REFERENCE_TIMEOUT_MS for local development and separately authorized evaluation. `PORT` only affects the loopback static preview. `npm start` serves `dist` and does not load provider credentials or mount the API. `npm run dev` retains the local provider adapter.

`.vercelignore` excludes environment files and legacy private asset folders from uploads. `.gitignore` excludes local Vercel state. The deployable `dist` directory contains only public pages/assets. Build audits check all textual output for local machine paths, credentials, development fixtures and source maps. Three.js's library diagnostic dispatcher is retained; application debug logging is rejected.

## Deploy steps

1. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
2. Preview the exact output with `PORT=5176 npm start` (loopback only). Verify `/`, a direct detail URL, `/library` redirect and a 404. The Vite preview command is not the public server.
3. From this directory, run `vercel link --project framefield --scope alilins-projects`. Select/create only the new Framefield project; do not link to the existing portfolio. Use Node 24.x (matching the existing projects), Other/static framework, `npm ci`, build `npm run build`, output `dist`. The repository config supplies the build settings.
4. Run `vercel --scope alilins-projects` to create a preview deployment. Inspect the returned URL, all control routes, Reference unavailability, security headers and console. Keep preview deployment protection enabled if provided by the account.
5. When ready to publish, run `vercel --prod --scope alilins-projects`. Record the actual deployment URL; do not assume a project hostname is available.
6. In the Framefield project's Settings → Domains, add `framefield.alilinlab.com`. Copy the project-specific DNS instructions. Alternatively use `vercel domains add framefield.alilinlab.com framefield --scope alilins-projects` after verifying the linked project.
7. At the authoritative DNS provider, add the **CNAME** with name **framefield** (or full host `framefield.alilinlab.com`, depending on its UI) and the **exact target returned by Vercel for this project**. TTL: provider default. Add any ownership verification TXT record only if Vercel requests it. Do not replace apex-domain or other subdomain records.
8. Wait for Vercel to confirm valid DNS and issue HTTPS. Verify HTTPS, canonical URLs, redirects and direct detail reloads on the custom domain. Record the final CNAME target and production URL here.

**Exact CNAME target: pending project/domain configuration.** Vercel supplies a project-specific value; guessing a shared hostname is inappropriate. No DNS changes have been made.

Official references: [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json), [custom-domain configuration](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Social preview asset still required

The minimal frame/F favicon is included at `/favicon.svg`. Social title, description and URL metadata are present. A large-image social card is not falsely advertised.

Before the polished portfolio launch, capture the actual neutral instrument with the FRAMEFIELD wordmark at **1200 × 630**, export a PNG to **`public/social/framefield-og.png`**, and inspect it at small card size. Preserve the actual architectural demonstration and restrained typography. Do not substitute generated model outputs. Then add `og:image`, `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:image` and change `twitter:card` to `summary_large_image`. This capture is currently missing; metadata deliberately contains no broken image URL.

## Performance and QA record

Before: homepage chunk **571.06 kB / 146.06 kB gzip**, detail/library chunk **34.81 kB / 11.88 kB gzip** loaded on the old homepage path. After: homepage **544.02 kB / 137.07 kB gzip**, shared catalog/DOM **20.54 kB / 6.46 kB gzip**, Reference **27.05 kB / 9.70 kB gzip** loaded on demand, detail rendering **13.75 kB / 5.62 kB gzip** loaded only for detail routes. Entry is about 3 kB. Sizes are uncompressed unless stated.

Three.js is the dominant remaining contributor; there is no React or R3F. The >500 kB warning remains intentionally visible. Splitting the same renderer into another eagerly required chunk would hide the warning without reducing transfer. No visual effects or heavy dependencies were added. A real-device/network performance measurement remains advisable before launch; localhost response is not a mobile performance benchmark.

Browser QA used the production-output server at 1440×900, 1366×768, 768×1024 and 390×844. Confirmed rendered canvas, laptop no horizontal overflow, keyboard lens activation/focus, mobile category discovery, camera/composition activation, Index, Reference entry and detail navigation. No browser warning/error logs were observed in that pass. Mobile viewport testing is not physical touch-device testing.

Source review confirms demand-driven animation settles rather than loops indefinitely, DPR capped at 1.75, hidden/paused handling, reduced-motion endpoints, ResizeObserver resizing and disposal on full-page navigation/HMR. Shared materials are now disposed once. Rendering stops when context is lost, with an existing recovery notice; no-WebGL construction retains catalog/category navigation. These failure/reduced-motion paths are code-reviewed and unit-tested where applicable, not all force-triggered in the browser. There is no server hydration layer.

Automated checks cover upload/type/decode failures, provider errors, validation and cancellation without paid requests. Public-server tests cover route/redirect/404 behavior and security headers. Build auditing verifies canonical metadata for all 12 controls and no evaluation artifacts, local paths or source maps. Manual launch follow-ups: physical touch, screen-reader reading order, constrained network/GPU and the social capture.
