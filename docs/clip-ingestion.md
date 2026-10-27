# Cinematic clip ingestion and local review

Implemented as a TypeScript CLI, provider adapters, private JSON queue, Vite-only review API/UI, and explicit release preparation. No database, React, background worker, scheduler, or public ingestion API was added. The existing Three.js instrument and reference-analysis API remain separate.

## Try the complete local mock workflow

From the repository root:

```sh
npm run clips:mock
npm run dev
```

Open `/dev/clip-ingestion` on the localhost URL printed by Vite. The current running preview is `http://127.0.0.1:5174/dev/clip-ingestion`.

The mock queue has exactly 12 original synthetic recordings with frame samples and authored analysis fixtures. It calls neither Pexels nor OpenAI. Select a card to play its video, inspect the 12 timestamped samples, review unverified findings, and edit the structured analysis JSON. Enter a reviewer name and notes. Approve requires the review checkbox. Reject records a decision; editing clears any previous approval. Changes persist across refreshes. The mock seed command is idempotent and preserves your decisions.

Mock data lives in `local-clip-ingestion/mock/batch.json`. The twelve supplied recordings and JPEGs live in `scripts/fixtures/clips/`; they are original geometric animations dedicated to CC0 for this project. They are workflow fixtures, not real provider results or evidence of vision-model accuracy. No third-party footage was downloaded, cached, or sent to a model.

Mock approvals remain local. `/clips` continues to show its nine existing briefs unless a separately prepared, verified live release exists. The mock queue cannot be exported to the public library. The review page is development-only and loopback-only; do not expose Vite as a hosted admin service.

## Exact credential locations

Set keys only in `.env.local` in the repository root:

```dotenv
PEXELS_API_KEY=your_existing_provider_api_key
OPENAI_API_KEY=your_openai_project_key
OPENAI_CLIP_MODEL=your_available_image_capable_responses_model
```

`.env.example` contains blank placeholders. `.env.local` is ignored by Git and deployment uploads. Never use `VITE_` prefixes. The CLI reads `.env.local` first, then `.env`, without overriding existing process variables. Normal browsing does not call the provider or the model. Mock mode needs no keys.

The model must support image input and structured JSON output through the Responses API. No model is selected implicitly for paid ingestion. The existing still-image analyzer's model setting is unchanged.

## Permissions to verify before enabling live mode

The general Pexels content license and possession of an API key do not alone prove that this specific integration is permitted. Obtain and record an appropriate provider authorization/terms basis covering:

1. Automated API discovery for FRAMEFIELD's cinematic research/reference-library use, including whether it is permitted under restrictions on similar/competing libraries and systematic collection.
2. Downloading and locally caching the selected video rendition, thumbnails, and derived sample frames; permitted retention duration and any deletion/revocation requirements.
3. Sending sampled frames to a third-party vision provider for this inference task. No training, dataset-building, fine-tuning, or model evaluation rights are assumed.
4. Displaying approved clips, posters, and derived analysis publicly as part of FRAMEFIELD; required creator/provider links, attribution, and any restrictions relating to depicted people, brands, or other third-party rights.

Record the actual source document, correspondence reference, or applicable agreement and human verifier. Do not invent permission or turn the flags on merely because a clip is searchable. Pexels' current API page says new key issuance is paused; use an existing authorized key or obtain access/approval from the provider. A different provider can implement the adapter contract, but its own URL policy, metadata parser, permission scopes and publication checks must also be implemented.

Copy `docs/clip-provider-permission.example.json` to `local-clip-ingestion/live/permission.json` after creating that directory. Populate `verifiedBy`, `reference`, `verifiedAt`, and `expiresAt` with actual verified details and ISO dates, and enable only the authorized scopes. Blank fields, false scopes, future verification dates, and expired records fail closed. The file is a human attestation and technical gate, not a substitute for obtaining permission.

Current primary references (checked October 26, 2026):

- [Pexels API and access status](https://www.pexels.com/api/)
- [Pexels API documentation and attribution guidelines](https://www.pexels.com/api/documentation/)
- [Pexels terms](https://www.pexels.com/terms-of-service/)
- [Pexels license](https://www.pexels.com/license/)
- [Pexels similar-library restrictions](https://help.pexels.com/hc/en-us/articles/900005851943-I-have-a-similar-marketplace-or-photo-library-to-Pexels-can-I-use-the-API-to-add-your-images)
- [OpenAI image inputs, including multiple images](https://developers.openai.com/api/docs/guides/images-vision)

## Controlled live pilot — only after authorization

Install `ffmpeg` and `ffprobe` on the local PATH. Both are prerequisites for live processing, not for mock testing. Then explicitly run:

```sh
npm run clips:ingest
```

This is the only command that performs discovery and paid vision analysis. It makes at most eight searches, one per category query, with six results per search. It selects at most twelve eligible records in round-robin order, deduplicating provider IDs, source URLs and normalized media URLs. Cached video SHA-256 hashes provide a second duplicate check before model analysis. Fewer than twelve eligible unique clips is a valid stopped result; it never searches indefinitely to fill the quota.

Limits: one pilot (`pilot-001`), at most twelve candidates and twelve model attempts, at most 6,000 output tokens per model call, no retries, no pagination, sequential downloads/analysis, 40 MiB maximum per video, selected MP4 rendition at most 1280×720, duration 2–60 seconds, bounded network and decoder timeouts. Every search and model attempt is persisted before dispatch. There is no unattended mode or automatic replenishment.

The adapter uses `https://api.pexels.com/v1/videos/search`, not web scraping. API credentials go only to the provider API. Media requests carry no credentials, accept only approved Pexels CDN hosts, reject redirects, and stream through a byte limit. YouTube, streaming-service pages, and arbitrary media URLs are not ingestion inputs. Unsupported provider renditions/CDNs are rejected rather than followed.

Frame sampling extracts three short windows near the beginning, middle, and end, four ordered JPEG frames per window. A single model request sees all twelve frames with timestamps and window IDs; search labels are omitted. The semantic validator rejects temporal findings without distinct same-window frames and a linked comparative observation. Cross-window comparisons, unsupported references, and numeric focal-length claims are rejected. Model findings remain unverified inferences. Weak classifications are excluded from discovery tags. Reviewers must inspect full playback for cuts and events outside sampled windows.

A second ingestion invocation refuses to start if the live pilot already exists. Interrupted runs leave state and possibly a `.lock` file for investigation; do not remove the batch or lock to bypass request limits. There is intentionally no auto-resume after an ambiguous model/network outcome. Resolve the first pilot before implementing an explicitly authorized next batch. Media is retained privately until manually deleted or the authorized retention period ends; there is no automatic deletion scheduler. Expired permission blocks further processing, cached live-media review, and release preparation/build.

## Approval is separate from publication

In the review page, switch to LIVE QUEUE. Each approval requires prepared media, validated analysis, unchanged asset hashes, a named reviewer, notes, and the usage-rights checkbox. Current scope permission is rechecked. Each edit invalidates approval, and each edit/rejection removes that clip from a locally prepared release manifest. Already deployed copies would require a separate rebuild/deployment or takedown; this pipeline never deploys.

Only when intentionally preparing a public release, run:

```sh
npm run clips:prepare-release
npm run build
```

These commands were NOT run against live data in this implementation. The first command prepares a verified snapshot in `clip-publication/`. Mock records are categorically rejected. The build revalidates the snapshot's permissions, approvals and hashes, then emits only sanitized public clip records and approved video/poster assets. Private queue data, review notes, model payloads, permission evidence, mock media, and API keys are not emitted. Dynamic detail pages and sitemap entries are produced for approved clip IDs.

Release preparation refuses to overwrite an existing prepared snapshot. Archive an old snapshot intentionally before preparing a replacement. Include a reviewed `clip-publication/` snapshot in the build workspace when you eventually deploy; private `local-clip-ingestion/` is intentionally excluded. Expired or revoked rights require removing the relevant snapshot entry and rebuilding. Building does not fetch provider content or call a model.

## Validation and limits

`npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` validate the implementation. Tests cover permission gates before requests, URL allowlists, deduplication, request ceilings, no retries, temporal evidence validation, malformed output, approval invalidation, stale-write protection, hash checks, private HTTP access, range playback, mock exclusion, and publication permission expiry.

Chromium testing exercised all twelve mock cards, real local video playback, twelve sample images, approval validation, approval persistence, edit invalidation, rejection, empty live state, tablet/mobile layout, private Vite file protection, and the unchanged public library. Browser testing made zero external requests.

Live provider responses, actual vision quality, and system ffmpeg processing have not been exercised with third-party footage. They require credentials, installed media tools, and verified permissions. Authored fixtures validate plumbing and review behavior; they do not measure classification quality.

## Modified and added files

- `server/clips/`: provider adapters, contracts, semantic validation, bounded media extraction, vision transport, persistent batch/review state, publication checks, Vite middleware, and tests.
- `src/dev/clip-ingestion.ts`, `src/dev/clip-ingestion.css`: local review queue.
- `scripts/clip-ingest.ts`, `scripts/fixtures/clips/`: explicit commands and twelve synthetic fixtures.
- `src/clips/catalog.ts`, `src/clips/virtual.d.ts`, `src/clips/types.ts`, `src/clips/pages.ts`: approved catalog integration, unverified labeling and sampling limitations.
- `src/main.ts`, `vite.config.ts`, `server/site.ts`, `scripts/prepare-release.ts`: local admin routing, private-file exclusions, approved media emission and detail routes.
- `scripts/check-production.mjs`: guards against shipping ingestion/admin code or credential names.
- `package.json`, `.env.example`, `.gitignore`, `.vercelignore`: commands, server-side placeholders and private state exclusions.
- `docs/clip-provider-permission.example.json`, this guide: permission configuration and operating instructions.

## Film reference local pilot

Open `/admin/references` under `npm run dev`. The twelve research candidates are
seeded from `docs/research/film-discovery-2026-10-26.json`. Review changes persist
atomically in ignored `local-film-references/queue.json`. This is a loopback-only
development route; production builds exclude its UI and API. No keys are needed.

Select a film, inspect its source/evidence, edit metadata and all four prompt forms,
then enter a reviewer name and review notes before saving or rejecting. Direct
links use `/admin/references?id=film-discovery-01`; back/forward is supported.
The prompt drafts are authored research scaffolds, not completed AI analyses.

Approval requires a display permission record: choose `display`, enter the exact
permission document/terms reference and scope explanation, reviewer, notes, and a
future expiry, then Verify Rights. Save the intended display method first; changing
it clears its permission. Approve is a local review decision only. All edits and
permission changes clear approval. Revoke Rights removes a grant immediately.
Download, edit, hosting, and third-party analysis are separate grants; display
permission never unlocks processing. Expired grants fail closed on every check.
The current pilot has **no execution or publication endpoint**, including after
permissions are documented. No film records feed the public release manifest.
Only a rights-cleared embed can be loaded, explicitly by the reviewer; otherwise
use the source link. No thumbnails or frames are fetched during normal browsing.

Run `npm run references:discover -- research` for the offline twelve-film metadata
batch. Optional live metadata discovery uses `npm run references:discover -- youtube`.
Configure `YOUTUBE_API_KEY` and verified `YOUTUBE_CHANNEL_IDS` in root `.env.local`
using `.env.example`; never use `VITE_` variables. Existing `PEXELS_API_KEY` and
`OPENAI_API_KEY` remain server-only and are not used by film review/discovery.
The live adapter uses the official YouTube search/videos APIs, checks channel IDs
against the configured allowlist, deduplicates URLs, caps at twelve results and
24 requests, spaces searches, stops on errors, and never calls a media endpoint.
Reports are private and cached for 24 hours; a fresh report prevents another run.
They are suggestions for review and never overwrite the curated queue or confer
rights. Live discovery has not been exercised without credentials. Before enabling
it, verify API project access, current provider terms, channel identity, and metadata
retention obligations. Delete stale private metadata reports when no longer needed.

Before local processing can be implemented/enabled, verify permission to obtain
and store the actual source file, trim/transcode it, send sampled frames to the
chosen AI provider, and host/distribute derivatives if desired. A YouTube upload,
license label, or embeddable flag is not that authorization. The existing Pexels
processing pipeline remains separate; movie URLs are never routed through it.

## Video import workflow (supersedes the pilot's processing-disabled notes above)

The local `/admin/references` detail now has **Import Video**. It updates an existing
ID; it cannot create extra film records. A replacement invalidates all previous
permissions and approval. Source attribution is preserved separately from permission
records. Production/public library data is not changed by an import or approval.

**URL:** expand Import Video, enter Import reviewer and Import notes, paste a public
YouTube watch/short/embed URL or public Vimeo URL, and click Import URL. Only fixed
provider oEmbed endpoints are contacted; iframe HTML from the response is ignored.
Import does not verify official publisher identity or grant usage rights. Inspect the
returned attribution, then use Permission scope **embed** below to record the actual
embedding authorization/terms reference, reviewer, notes, and future expiry. Verify
Rights unlocks Load Embed Preview. A source link remains available otherwise. Edit
Embed start (seconds) and Save Clip Selection with Import reviewer/notes filled in.
Provider seeking is approximate, not a frame-accurate extract. YouTube/Vimeo media
is never downloaded, proxied or submitted to AI by this workflow.

**Local:** choose an MP4 or WebM (128 MiB maximum), fill Upload attribution, Storage
authorization evidence and expiry, and check the storage-authorization attestation.
Click Upload Local Video. The server checks MIME, extension, magic bytes and FFprobe
container/codec/duration/dimensions before association. Maximum one hour / 7680×4320;
MP4 supports H.264, HEVC, AV1; WebM supports VP8, VP9, AV1. Browser codec support can
vary. The original is stored under ignored `local-film-references/media/<id>/` with
an immutable UUID filename. That directory is denied by Vite's file server and
excluded from deployment. Only the loopback review API can serve permitted files.

Verify **display** (private local playback) to show the original player. Verify
**edit** to enable the timeline and 0–12-second selection. Fill Import reviewer/notes,
choose start and end with the sliders or numeric inputs, Preview Selected Range,
then Prepare Optimized Clip. FFmpeg creates a separate H.264/AAC MP4 (max width 1280,
aspect ratio preserved, faststart) and JPEG poster. Optional source audio is retained.
No original is overwritten. Old originals and derivatives remain private when
replaced; their paths are not served unless currently associated and permitted.
FFmpeg and FFprobe are installed as development dependencies; no system installation
is required. No AI analysis runs. **host** means public redistribution and is separate
from private playback; it does not publish anything. **download** remains a separate
record and does not create a downloader. **thirdPartyAnalysis** never follows from
any other permission. **store** authorizes local retention.

Revoke Rights blocks new media/range requests immediately. The open UI rechecks every
four seconds and removes players after changes or expiry; it also tears down players
on navigation. Already delivered bytes cannot be recalled. A selection change clears
prepared-output pointers so an old trim cannot masquerade as the new range.

**Batch:** expand Batch Import / JSON or CSV, choose a manifest file or paste it, then
Import Manifest. Use `docs/examples/reference-video-import.json` or `.csv` as the
sample; replace reviewer and revision numbers with those displayed in the current
queue. The entire batch (maximum twelve) fails if a record, revision, URL, duplicate,
or metadata lookup is invalid. URL normalization detects watch/embed/short aliases;
local uploads are deduplicated by SHA-256. No permissions are granted by a manifest.

The public `/clips` library remains unchanged. Imported media is previewed only in
the private reference detail until a separately implemented release is authorized.
Tests use original synthetic media and isolated queues, never assume film rights.
For isolated development QA only, `FRAMEFIELD_REVIEW_ROOT` can point the Vite review
plugin at a temporary root containing the research seed. It is server-side only.
