# Real Muse Glimmer analysis — local validation

Validated 2026-11-04. No deployment performed.

## Local entry

http://127.0.0.1:5194/analyze (production bundle served by `PORT=5194 npm start`).

Provider: NVIDIA NIM. Model: `meta/muse-glimmer-30b`.
Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`.
Server environment: `NVIDIA_API_KEY`; ignored `.env.local` for local use.

## Actual browser result

An original 384 × 256 geometric PNG was uploaded through the file picker. The final real request returned validated analysis describing an orange circle in the upper-right area of a light-blue background above a gray band. The UI displayed real model attribution, six validated readings, and an explicit notice that one malformed/unsupported reading was omitted. No simulated provider was used.

Six real requests were made during implementation QA: two successful analyses and four rejected responses while hardening JSON parsing and validation. These were explicit development retries, not automatic application retries. Model responses remain nondeterministic and can fail validation; the application surfaces errors instead of inventing results.

Verified through the browser:
- Uploaded image preview and explicit Analyze action.
- Indeterminate processing, sanitized failure and explicit retry.
- Real model attribution and evidence/confidence labels.
- Composition, creative focal length and intended motion edits update the visible prompt.
- Copied text exactly equals the visible generated prompt.
- Try the Shot transfers 35 mm, symmetrical composition, dolly motion and 5-second duration.
- Changing workspace composition updates its prompt; Three.js scene renders without console errors.
- Browser Back/Forward and workspace refresh.
- Mobile upload and workspace: document width equals scroll width (375 CSS px in the browser's mobile override).

Automated checks: TypeScript, lint, all 196 tests, production build and release/privacy audits passed. Existing large-chunk build warning remains. The actual credential was absent from both generated browser and server bundles; its value was never printed.

## Limits

- Still images cannot establish camera motion or measured focal length. Lens settings are creative choices.
- Model semantic judgments can be wrong even when JSON is valid. Review readings and deselect inappropriate prompt fragments.
- Partial results disclose omitted readings. Fewer than three valid readings, malformed JSON, truncated output, incorrect model attribution or simulated responses are rejected.
- Pan/tilt/orbit, camera angle, lighting and original geometry do not transfer to the current canonical workspace. Static/dolly, supported composition and creative lens values transfer. The workspace regenerates its own prompt; the original image prompt and uncertainty remain in the imported notes.
- The uploaded image is held in memory and is not saved by FRAMEFIELD. Returning to Analyze starts a new upload. Textual handoff context is retained in tab session storage.
- 10 MB / 20 megapixel limit; 90-second upstream timeout; three requests per minute per server process. The limiter is not a distributed user quota.
- Deployment needs server-side `NVIDIA_API_KEY` and the included Node API function. Hosting platform body/time limits may impose lower limits and need a deployment smoke test. No deployment is authorized by this report.

## Files changed for this integration

- `server/analyze.ts`
- `server/analyze.test.ts`
- `server/analyze-function.ts`
- `server/main.ts`
- `api/analyze.mjs`
- `src/analyze/analyze-model.ts`
- `src/analyze/analyze-page.ts`
- `src/analyze/simulated-provider.ts` (shared HTTP transport only)
- `src/navigation/analyze.ts`
- `src/playground/analyze-handoff.ts`
- `src/playground/page.ts`
- `vite.config.ts`
- `scripts/build-reference-server.mjs`
- `vercel.json`
- `package.json`
- `README.md`
- `docs/live-analysis-validation.md`

Existing navigation, Three.js engine, film rights and private reference records were not changed by this integration.
