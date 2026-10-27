# Experimental production Reference Analysis

This pass enables the existing OpenAI adapter behind a Vercel Node 24 function. Availability does not change the evaluation product gate: **EXPERIMENTAL**. The analysis contract, canonical prompt, validation and still-image epistemic safeguards remain authoritative.

## Production configuration

Linked Vercel project: `aigc_libray`, scope `alilins-projects`. Existing production address: https://aigclibray.vercel.app (not updated by this pass).

On 2026-09-30, `vercel env ls production` returned no configured environment variables. **OPENAI_API_KEY production environment variable required.** This is the only provider configuration blocker. No live OpenAI test or production deployment was performed.

Set `OPENAI_API_KEY` through Vercel's secure Production environment settings, never in source or any `VITE_*` variable. Optional `OPENAI_REFERENCE_MODEL` defaults to `gpt-5.4-mini`; `OPENAI_REFERENCE_TIMEOUT_MS` defaults to 60000 and the public endpoint caps it at 60000. Deploy after configuring the key. A readiness response confirms configuration presence, not that credentials or model access have been validated.

## Runtime and privacy

`api/reference-analysis.mjs` exports the built Web Request handler. `npm run build` bundles server code into ignored `server-build/`, outside public `dist/`. The exact canonical prompt is embedded server-side to avoid runtime filesystem assumptions. Sharp remains a traced runtime dependency. Vercel uses a 90-second function duration with cancellation support.

GET returns safe readiness metadata. Only an explicit Analyze action sends POST image bytes. The endpoint reuses image decoding, strict structured-output validation, consistency checks and normalization from the existing adapter. Images remain in memory; application code neither saves nor logs images or analysis. OpenAI requests use `store:false`; provider retention policies still apply. No analytics was added. Cancellation aborts processing when possible but cannot guarantee a request already sent incurred no cost.

Local production preview: `npm run build`, then `npm start`. It serves the same public handler and static build; `.env.local`/`.env` are server-only. The Vite development endpoint remains separate.

## Lightweight cost protection

- Public analysis accepts JPEG, PNG and WebP up to 4 MiB, below Vercel's 4.5 MB request ceiling. Local inspection still accepts 10 MB.
- Existing full image decode rejects invalid signatures, animation, excess pixels and oversized decoded output.
- Streamed body limit and 10-second upload timeout; provider timeout at most 60 seconds; cancellation; no automatic retries.
- Best-effort instance-local limit: one active request per client IP, two active requests per instance, five attempts per IP per ten minutes. Failed/cancelled attempts count. Bounded, salted IP hashes are held only in memory, with expiring active leases.
- Same-origin checks and explicit request header reduce cross-site browser requests; they are not authentication.

**Remaining risk:** these limits are not distributed and are not a spending cap. Cold starts, multiple instances and IP rotation can evade aggregate limits. Before public traffic grows, configure a platform-level firewall/rate rule for POST `/api/reference-analysis` and monitor provider usage. No distributed limiter, database, authentication system or platform firewall rule was added in this pass.

## UI and verification

The explicit Analyze action is enabled only when readiness is configured and an eligible image is present. Upload never triggers analysis. Results follow Observed → Inferred → Suggested Controls → Limitations; the user chooses stack entries. Lens controls remain reconstruction suggestions and camera movement remains unavailable from stills.

Desktop image height is capped at 60vh/680px with contain sizing. Wide screens place results beside the image; mobile stacks naturally with a 48vh/460px inspection area. Per-observation overlays share the contained image plane and have textual evidence.

Verified with a local mocked upstream: upload, explicit/loading analysis, normalized result, observation overlay, composition/lens/movement labels, stack add/remove/clear, Apply to Demo, Reference/Demo switch, replace/remove, timeout/cancel preservation, desktop portrait/landscape and mobile square. This is interaction verification, not live-provider quality validation. Automated tests cover request rejection, rate limits, safe failures and existing stale-result protection. The packaged handler was smoke-tested with real image decoding/normalization and mocked network output; its embedded prompt matches canonical bytes.

Protected research data, judgments, failure taxonomy, control definitions, `/dev/controls` and controlled-generation studies were not modified.
