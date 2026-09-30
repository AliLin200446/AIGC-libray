# Reference Analysis

Reference mode lives inside `/library`; it does not create experiment records or alter the controlled study baseline. The image and analysis live only in the page's runtime. Leaving the document/reloading clears them (a browser back/forward cache may retain the same live document). Images are never saved to public assets or localStorage. Explicit Analyze requests send image pixels through the in-memory server adapter to OpenAI; see the provider setup document for privacy details.

## Provider boundary

`src/library/reference/provider.ts` exports a same-origin transport whose readiness comes from the server. Without a server key, uploads display **ANALYSIS PROVIDER NOT CONNECTED**. Selecting an image never auto-submits; only dimensions and aspect ratio are measured locally. The explicit Analyze Reference action requests model analysis when configured. No semantic heuristics, filename analysis, random predictions or fallback fixtures run.

A future explicitly approved transport implements `ReferenceAnalysisProvider.analyzeImage(image, signal)` and returns untrusted structured output. The engine performs validation and normalization before the UI receives a result. Configure it in provider.ts only after deciding the image transmission policy; the UI names configured providers. The canonical prompt and versioned schema define the evidence contract. Never put credentials in browser source.

Findings distinguish observed, inferred and unavailable, with qualitative evidence strength, evidence text and source. Suggested lens IDs are reconstruction intentions, never capture metadata. Still-image movement is structurally unavailable. `FutureVideoMotion` reserves temporal evidence types only; no video upload or analysis is implemented.

## Development fixture

In the Vite development server, when the provider is unavailable, Reference Mode offers **DEV / LOAD DEMO REFERENCE — NOT MODEL ANALYSIS**. This replaces the current reference with an authored SVG diagram and matching authored findings. It never attaches fixture conclusions to an uploaded user image. The viewport, status, finding sources and limitations label the fixture. Its module is dynamically imported behind `import.meta.env.DEV` and excluded from the production build. This is UI testing, not computer vision.

## Stack and demonstration

Only existing composition and lens IDs can enter a reconstruction stack. Selecting a new lens replaces the prior lens. Multiple composition intentions remain available, and apply in order: thirds sets horizontal and vertical placement, negative space changes horizontal placement, and a later centered/symmetrical entry restores centered placement. This is explicit in the UI. It is not a scene-reconstruction solver.

Apply to Demo changes the actual PerspectiveCamera focal length and matched-framing distance, then reframes the same world. Nothing scales the canvas or moves the subject mesh. Reference / Demo toggles preserve the image and stack. Explore and Home / Reset restore the original instrument while retaining the reference for comparison. Remove Image clears the entire reference, result and stack. Clear Stack clears reconstruction controls only.

## Image lifecycle and limits

JPG, PNG and WEBP up to 10 MB and 20 megapixels are accepted after decoding. Failed replacements retain the previous usable reference. `LocalReference` owns/revokes object URLs on replacement, failed decode, canceled decode, removal, and disposal. Async versions and AbortController prevent stale results from replacing newer selections. A ResizeObserver fits an image plane to its natural aspect ratio; overlays share that plane and normalized coordinate system.

## Validation

Automated coverage includes input limits, failed and overlapping decodes, URL ownership, provider absence, fixture provenance, vocabulary mappings, lens exclusivity, camera projection and combined composition/lens behavior. Existing reduced-motion camera tests cover stack interpolation too, which uses the same renderer path. UI validation covers keyboard picker, JPG/PNG, rejection, replacement/removal, fixture overlays, stack actions, Apply, compare toggles and mobile layout.

## Evidence-first engine contract (version 1)

The canonical instruction is [reference-analysis-prompt.md](reference-analysis-prompt.md). The executable JSON Schema is `referenceAnalysisSchema` in `src/library/reference/schema.ts`; it is also the schema used by the dependency-free runtime validator. Do not duplicate the schema in a vendor adapter.

`ReferenceAnalysis` now contains observations, composition candidates, lens tendency, framing, perspective, unavailable camera movement, rich suggested controls, limitations, trusted provider metadata, provenance, derived overlays, and a null captureMetadata slot. Observation statements and concrete visual evidence are distinct. Findings link observations through `evidenceObservationIds`; reconstruction suggestions link the same evidence rather than free-floating labels. All findings retain qualitative confidence and source. `VerifiedCaptureMetadata` is reserved for a future explicit EXIF reader; the vision output schema cannot supply it.

The four confidence strings remain `strong evidence`, `moderate evidence`, `weak evidence`, and `insufficient evidence`. They are defined in `confidenceDefinitions`. Unsupported findings use unavailable/insufficient; supported findings require existing non-insufficient observation evidence. The complete set of supported composition candidates may include both supported and unavailable entries. Framing may be ambiguous and its anchor/scale nullable. All coordinates refer to the full uploaded image, not its letterboxed viewport.

The transport interface is now `ReferenceAnalysisProvider.analyzeImage(image, signal): Promise<unknown>`. `ReferenceAnalysisEngine.analyzeReference` owns the transport call, strict schema validation, cross-field constraints, normalization, cancellation and publication. State is one of not-connected, ready, analyzing, completed, error. An unavailable server remains not-connected. Development fixtures do not mark the provider completed: they run the same normalizer with explicit fixture provenance. Errors expose a safe message, never raw transport output. Stale or canceled responses cannot overwrite a newer result.

Validation rejects unknown nested fields, malformed shapes, noncanonical IDs, motion suggestions, invalid confidence/coordinates, invalid evidence references, duplicate candidates/IDs, incompatible lens mappings, confidence escalation, unsupported suggestions and common numeric capture claims in free text. Pure style/blur descriptions cannot support lens inferences. Lens suggestions must be marked reconstructionSuggestion true. Mandatory limitations are appended by the normalizer, provider identity comes from trusted adapter configuration, and movement remains unavailable. The UI presents observations before inferences and suggestions, and only explicit Add to Stack actions modify the user's stack. Hover/focus on supported findings previews their existing spatial annotations.

No validator can prove that a prose observation is visually correct, or detect every paraphrase of a false capture claim. The schema isolates reconstruction suggestions from metadata, while prompt discipline and future provider evaluations must address semantic reliability. Numeric optical values in prose are conservatively rejected even when intended as benign examples; canonical control IDs supply labels instead.

### Provider integration

The first server-side OpenAI integration is implemented. See [OpenAI provider setup](openai-reference-provider.md) for environment configuration, model policy, request/response handling, privacy and outstanding live verification. The existing schema and consistency validator remain authoritative.
