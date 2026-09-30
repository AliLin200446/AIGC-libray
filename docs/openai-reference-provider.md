# OpenAI Reference Analysis

## Run locally

Requires Node 22.12 or later.

1. Run `npm install` (or `npm ci`).
2. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` there, or supply it in the server process environment. Never use a `VITE_` prefix. Environment files are ignored by git.
3. Run `npm run dev -- --port 5175`. Restart after changing environment configuration.
4. Open `/library`, select Reference, choose an image, then click **ANALYZE REFERENCE**. Choosing/dropping an image does not submit it.

With no key, the status endpoint returns not-connected and Analyze remains disabled. A configured key means configured readiness, not guaranteed account/model access; an invalid key or unavailable model is reported safely on analysis. The development fixture remains available only when the provider is unavailable, is always labeled, and is never a failure fallback.

For a production build: `npm run build`, then `npm start`. The small Node server serves only `dist/` and the analysis endpoint, binds to `127.0.0.1`, and defaults to port 5175. `npm run preview` also installs the API middleware but is intended for local preview, not deployment. A static-only host cannot run analysis. Before exposing this single-user endpoint publicly, place it behind authenticated access and deployment-specific quotas; this implementation does not create accounts or an authentication framework.

## Server boundary

`GET /api/reference-analysis` returns readiness, provider/model name and upload limit, never the credential. `POST /api/reference-analysis` accepts the raw image bytes with Content-Type `image/jpeg`, `image/png` or `image/webp`, plus `X-Reference-Analysis: 1`. This binary upload avoids base64 expansion between browser and server. No provider parameters are accepted from the browser. Cross-origin browser submissions are rejected, no CORS is enabled, and at most two analyses run concurrently per process.

The key exists only in server configuration (`server/openai.ts`). There is no OpenAI SDK in the browser. Node's fetch calls the Responses API; returned model JSON passes the existing strict schema and consistency validator on the server. Only normalized ReferenceAnalysis crosses the HTTP boundary, and the browser revalidates that normalized result before publication. Derived overlays are rebuilt from validated evidence. There are no automatic retries that might duplicate paid requests.

Errors distinguish missing key/image, unsupported/corrupt input, oversized input, timeout, rate limit, provider request failure, refusal, malformed/incomplete output, schema violation, consistency violation, cancellation and unavailable server. Production responses contain only known safe codes/messages. Standalone server diagnostics log code and HTTP status, not image data, keys, raw provider bodies or auth headers.

## Model, prompt and detail policy

Default: **gpt-5.4-mini**, configurable with server-only `OPENAI_REFERENCE_MODEL`. It currently supports image input, Responses and Structured Outputs and provides a smaller-model latency/cost profile suitable for this bounded analysis. This is an initial engineering selection, not a claim of benchmarked accuracy. See the [official model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

The server reads `docs/reference-analysis-prompt.md` directly on each request. It uses developer instructions plus an image and explicit task, with `text.format.type = json_schema`, `strict = true`, and the existing exported response schema. The OpenAI syntax adapter changes const values into typed enums and removes the JSON Schema dialect marker; it does not replace the authoritative local validator. See [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Image detail is **high**, not original. For this model the documented high budget is smaller than low (2,500 vs 6,144 patches) while retaining useful spatial detail. No microscopic-texture or full-resolution analysis is requested. See [image sizing behavior](https://developers.openai.com/api/docs/guides/images-vision). Reasoning effort is low, output is capped at 10,000 tokens, and the default request timeout is 60 seconds (`OPENAI_REFERENCE_TIMEOUT_MS`, bounded to 1–120 seconds). Changing models requires checking its supported schema/detail/reasoning settings and evaluating reference quality.

## Image processing and privacy

Limit: **10 MB encoded input, 20 megapixels decoded**; the lossless PNG sent upstream must also fit 20 MB. MIME type and decoded format must agree. Empty, corrupt, unsupported and animated images are rejected. Sharp fully decodes in memory, applies EXIF display orientation, removes metadata, and losslessly re-encodes PNG. It does not resize or crop. Metadata records original encoded dimensions/format and submitted dimensions/format and these transformations. Large temporary buffers are bounded by the input pixel limit and released after the request; no upload is written to disk, public assets, study folders or evidence records.

Analysis transmits those normalized image pixels to OpenAI only after the explicit action. The request sets `store: false`; this does not claim zero provider retention or override OpenAI account/data policies. See [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data). Image selection alone remains local. Replacing/removing the image, leaving Reference Mode or pressing Cancel aborts the client request, which aborts upstream fetch when the connection closes. Sequence protection prevents late responses from replacing a newer selection. Cancellation is best effort and cannot undo provider work already performed or guarantee zero billing.

## Metadata and evaluation

Results record provider, returned model identifier, schema/prompt versions, request timestamp, latency, original and submitted dimensions/format, transformations and detail. The OpenAI request ID and actual token usage are included when available; no cost estimate is fabricated. Full model responses are not exposed or stored.

In development, **DEV / EXPORT NORMALIZED JSON** appears only after a successful real result. It manually downloads a JSON result with metadata and image dimensions, not the image itself. See `local-reference-suite/README.md` for a future private evaluation suite. No images have been added and no benchmark is run.

## Verification

Tests mock only the upstream provider boundary. They cover real HTTP upload handling, image decoding, readiness, request construction, structured parsing, authoritative validation, safe errors, cancellation, stale responses, normalized metadata and client state integration. No automated test calls OpenAI. Live verification requires an explicitly configured key and an image approved for analysis. No credentials were available during this implementation, so live model quality, latency and account access remain unverified.
