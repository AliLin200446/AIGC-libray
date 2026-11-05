# FRAMEFIELD

FRAMEFIELD is a cinematic reference and camera-control workbench for generative video prompting. Study a visual technique, inspect its evidence, adjust a Three.js camera, and copy a reusable prompt. Upload an authorized still image to analyze its visible composition with **Meta Muse Glimmer 30B via NVIDIA NIM**.

## What works

- **Explore:** six curated studies — The Shining, Vertigo, and four original procedural motion demonstrations (dolly, tracking, pan, orbit). Original clips have posters, muted hover previews and detail playback. Film playback is permission-gated; unavailable film imagery uses labeled schematics or source links.
- **Camera Instrument:** centered lens ruler, composition and camera controls; Try the Shot opens the existing interactive workspace.
- **Try the Shot:** supported camera settings drive both a Three.js preview and a deterministic prompt; exact clipboard copying and reference handoff.
- **Index:** twelve canonical camera, lens and composition controls and detail pages.
- **AI Analyze:** image preview → explicit Analyze action → real Muse Glimmer response → validated observations/inferences, confidence and evidence → editable prompt → Copy Prompt → Try the Shot.

Top navigation is **EXPLORE / INDEX / AI ANALYZE**. The logo returns to `/`; the workspace is a subpage, not a fourth navigation item.

## Tech stack

Framework-free TypeScript, Vite, Three.js, Node.js HTTP handlers, Sharp image validation/resizing, native browser APIs and CSS. NVIDIA NIM provides the Meta vision inference. No React or new backend framework.

## Setup

Requires Node.js **22.12+**, npm and a WebGL-capable browser.

```sh
npm ci
npm run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/explore`. The reference library, instrument, Index and prompt controls work without credentials.

For real AI Analyze, create `.env.local` next to `package.json` and add your own key:

```dotenv
NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY
```

This is a placeholder, not a usable credential. `.env.local` is Git-ignored. Never prefix secrets with `VITE_`, put them in browser code, or commit them. Restart the server after changing configuration. Open `http://127.0.0.1:5174/analyze`, choose an image, review the preview and click **Analyze image**. Only submit media you are authorized to send to NVIDIA.

For the local production bundle:

```sh
npm run build
PORT=5175 npm start
```

Open `http://127.0.0.1:5175/explore` or `/analyze`. Do not expose the development server or private Admin tools publicly.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | Required only for live `/analyze`; server-side NVIDIA NIM credential |
| `PORT` | Optional local production server port; default `5175` |
| `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_IDS` | Optional private metadata discovery |
| `TMDB_API_READ_ACCESS_TOKEN`, `TMDB_ATTRIBUTION_LOGO_URL` | Optional private cover discovery; not a media rights grant |
| `PEXELS_API_KEY` | Optional private stock discovery; permissions remain required |
| `OPENAI_API_KEY`, `OPENAI_REFERENCE_MODEL`, `OPENAI_REFERENCE_TIMEOUT_MS`, `OPENAI_CLIP_MODEL` | Separate legacy/experimental adapters; not used by `/analyze` |

`.env.example` contains placeholders and non-secret defaults. No other provider key is needed for the hackathon AI Analyze flow.

## Meta AI integration

`server/analyze.ts` handles `/api/analyze` using `meta/muse-glimmer-30b` at NVIDIA's `https://integrate.api.nvidia.com/v1/chat/completions`. The server validates JPG/PNG/WebP content, decodes/resizes in memory, sends the image using the official image-input format, validates the response and returns FRAMEFIELD's `AnalysisResult`. The browser never receives the API key.

Readings distinguish observations, inferences and unknowns. A still cannot establish temporal camera movement or measured focal length. Motion is chosen by the user; lens values are creative choices. The prompt is deterministically assembled from validated readings and user choices. Only static/dolly motion, supported composition and creative focal settings transfer to the current canonical workspace; unsupported properties remain contextual notes.

**Actual end-to-end integration passed locally:** an original geometric image was uploaded through the UI, a real response correctly described its subject/background, edited prompt text was copied exactly, and camera settings transferred into the live workspace. See [validation evidence and limitations](docs/live-analysis-validation.md). No simulated fallback is mounted on `/analyze`; separate historical/private demo fixtures remain explicitly simulated.

## Architecture and routes

| Route | Purpose |
| --- | --- |
| `/` | Original Camera Instrument |
| `/explore`, `/explore/:id` | Curated studies, evidence and prompts |
| `/index`, `/library/:id` | Canonical controls |
| `/analyze` | Real still-image analysis |
| `/compose/workspace` | Try the Shot; existing camera preview and synchronized prompt |
| `/admin/references` | Private local development review queue; excluded from production |

`src/analyze` contains the UI, contract and deterministic prompt builder. `src/playground/analyze-handoff.ts` maps validated analysis to existing workspace controls. `src/library/instrument` owns the Three.js engine. The serverless entry is `api/analyze.mjs`; local development and production use the same handler. Legacy routes remain supported.

## Privacy, media and limitations

- FRAMEFIELD does not save uploaded image files. NVIDIA service terms govern provider processing. Textual handoff context is kept in tab session storage; returning to Analyze starts a new upload.
- Analysis can be wrong or fail validation. Invalid readings are omitted with disclosure; unusable output produces an explicit error. Retry is manual. There is no fabricated progress or silent model substitution.
- Limits: 10 MB, 20 megapixels, still images only, 90-second upstream timeout, three requests per minute per server process. This MVP limiter is not a distributed user quota. Hosting platforms may enforce lower request limits.
- The Three.js scene is schematic; it does not reproduce uploaded subjects, physical lens measurements, film sets, lighting or all camera motions. No video generation or measured downstream model fidelity is claimed.
- Film references use official players or links, never downloaded/rehosted movie footage. The Shining uses its reviewed opening tricycle segment; Vertigo remains a source-link study. Platform availability and permission expiry can disable playback.
- Original media provenance: [public/media/originals/PROVENANCE.txt](public/media/originals/PROVENANCE.txt). Test media under `scripts/fixtures/clips` are original synthetic fixtures.
- Private queues, imported assets, environment files and deployment credentials are ignored. `src/references/film-publication.json` is an explicitly curated public projection, not a copy of the private review queue. No automatic publication is enabled.

## Validation and submission

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The submission freeze passes TypeScript, lint, **196 tests**, production build and release/privacy audits. Existing large-bundle warning is non-fatal. See [submission description, Meta integration explanation and 2:45 demo script](docs/hackathon-submission.md) and [release audit](docs/submission-freeze.md).

The current release is prepared for local demonstration, not claimed deployed. Git-triggered Vercel deployments are disabled in `vercel.json` for this freeze. Deployment requires a separate authorized action, server-side environment configuration and a hosting smoke test. No hackathon submission is performed automatically.

Older reports under `docs/` are historical snapshots; this README and `docs/hackathon-submission.md` describe the submission version.
