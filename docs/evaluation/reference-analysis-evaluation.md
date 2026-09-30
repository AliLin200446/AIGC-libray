# Reference Analysis Evaluation — Phase 5

This harness evaluates visual reliability for creative decisions. Schema-valid JSON is not visual truth. The product gate is **EXPERIMENTAL** (`src/evaluation/reference-analysis/types.ts`). There is no score, ranking, accuracy percentage, automatic promotion, or prompt tuning in this phase.

## Four independent judgments

- **Observation quality:** are the visible statements correct? Review statement, evidence, region and confidence independently for every observation. A plausible rectangle cannot validate a false statement.
- **Inference quality:** does visible evidence support each composition, lens tendency, framing and perspective claim? Review all four compositions, including omissions. Multiple compositions can be valid.
- **Uncertainty quality:** mark OVERCONFIDENT, UNDERCONFIDENT, APPROPRIATE_UNCERTAINTY or NOT_ASSESSABLE, with reasons. Twelve references do not justify statistical calibration estimates.
- **Control mapping quality:** are suggested reconstruction controls supported and useful? Also review missed useful controls. An 85mm reconstruction control is not a claim that the original capture used 85mm.

The harness does not recover capture metadata, evaluate image generation, or compare providers. Capture metadata has its own independently sourced annotation field. EXIF never becomes an automatic target for visible inference. Shallow DOF, unknown cropping and aesthetic style must be treated as possible confounds.

## Local setup and first reference

Run from the project directory:

```sh
npm run reference-eval -- init
```

The fixed private directory on this Mac is:

`/Users/alilin/Library/Application Support/Visual Control Library/reference-evaluation/`

On another machine it uses that user's home directory. It is outside the repository, public directory, build output and normal Vite filesystem allowlist. Vite also explicitly denies `reference-evaluation` and legacy `local-reference-suite` paths, including filesystem URLs. Do not relocate assets into `public/`. Nothing is downloaded or generated for the pilot.

1. Place your own permitted image at `images/reference-01.jpg` (PNG and WebP also supported; existing upload size/decoding rules apply).
2. Edit the first object in `manifest.json`: set `assetStatus` to `present`, `assetFile` to `reference-01.jpg`, and fill its annotation based on what you can actually see. Filenames cannot contain directory components or symlinks.
3. Fill provenance, annotator, visible traits, all four composition expectations, lens and framing expectations, ambiguities, forbidden claims, acceptable/unacceptable reconstruction controls and notes. Use empty arrays when there genuinely are no items; do not fill them from the slot's intended purpose. Select a better image or document a mismatch if the image does not fit that purpose.
4. Set `readyForEvaluation` to `true` only after your human annotation is complete. `npm run reference-eval -- check` validates the manifest and reports slot readiness; it makes no API calls.

Each expectation is `{ "value": "…", "state": "EXPECTED|ACCEPTABLE|UNSUPPORTED|AMBIGUOUS", "reason": "…" }`. These are qualitative states, never percentages. Annotation arrays allow more than one valid answer. The committed dataset defines 12 empty slots, not expected answers. Initialization preserves an existing manifest. You may replace assets or add slots later; historical runs keep their own image and annotation snapshots.

## Exactly one paid request

Configure server-only `OPENAI_API_KEY` in `.env.local` as described in `docs/openai-reference-provider.md`. The existing optional model and timeout variables apply. Never put keys in the manifest or review notes.

```sh
npm run reference-eval -- run --reference reference-01 --confirm-paid
```

This selects exactly one reference and invokes the existing `analyzeOpenAI` adapter once. It retains the existing image preprocessing, schema validation and consistency validation, then validates the normalized envelope again. Missing files, missing annotations or absent explicit confirmation stop before the adapter. There is no bulk command and no retry. Repeating the command is a new explicit paid action, with a new UUID. Failures produce a historical error record with a safe code, no unvalidated provider payload and no fixture fallback. A failed request may still incur provider usage that is not exposed by the adapter.

The command prints provider, requested model, prompt ID, schema version, saved path, result status and review command. API keys and source image bytes are not in run JSON. Image snapshots are private, orientation-corrected PNGs, with content hashes; they ensure a later asset replacement cannot silently change the reviewed reference. No resize or crop is introduced.

## Offline human review

Use the run UUID printed by the command:

```sh
npm run reference-eval -- review --run RUN_UUID
```

Open the printed local HTML file in a browser. It is deliberately an offline developer tool, with no `/library` changes, web endpoint, production navigation entry or remote network requests. The private HTML includes the image; treat it as private imagery when sharing or deleting it. It is not a public deployment artifact.

The image appears on the left and normalized analysis on the right. Toggle individual observation regions, anchors and lines over the complete image. Review observations, all four compositions, lens, framing, perspective, camera-movement refusal, each suggested control, omissions and limitations. For each item select SUPPORTED, PARTIALLY_SUPPORTED, UNSUPPORTED or NOT_ASSESSABLE separately for statement, evidence, region and confidence, plus a qualitative uncertainty judgment and short reason. NOT_ASSESSABLE covers inapplicable fields, such as a region for a limitation.

Write four separate quality summaries, select any applicable failures and their targets/reasons, then assign USEFUL, USEFUL_WITH_CAVEATS, NOT_USEFUL or INVALID with a short creative-decision reason. A rejected provider result must be INVALID; do not guess its unseen raw claims. A code such as `consistency_check` alone does not establish which visual failure occurred.

Download the review JSON, then validate and archive it:

```sh
npm run reference-eval -- save-review --run RUN_UUID --file /absolute/path/to/RUN_UUID.review.json
```

The browser does not autosave. Download before closing the page. Import rejects unfinished fields, missing targets, unknown failure IDs and absent usability reasons. Every import creates a new review snapshot containing the original run plus human assessment. Original run files are never updated. To revise a review, edit its downloaded JSON and import again; preserve both revisions. Keep downloaded reviews private too. This is filesystem-level append-only behavior through the harness, not tamper-proof archival against manual file edits.

## Failure taxonomy

The reusable definitions live in `src/evaluation/reference-analysis/failures.ts`:

- hallucinated-precision
- exact-focal-length-overclaim
- dof-lens-shortcut
- aesthetic-lens-shortcut
- motion-from-still
- unsupported-composition
- missed-composition
- overconfident-inference
- underconfident-inference
- evidence-inference-mismatch
- invalid-control-mapping
- missed-useful-control
- spatial-overlay-mismatch
- subject-anchor-error
- crop-history-confound
- ambiguous-image-overinterpretation

Multiple failures remain structured entries. Do not merge them into generic notes. Capture claims and temporal claims are also guarded by existing validation; human review remains necessary for subtler prose and visual errors those guards cannot detect.

## Attribution and immutable history

Every run stores reference/run IDs, timestamp, normalized result or safe error, image reference/hash, annotation snapshot, provider, requested configuration, returned model string, prompt/schema IDs and SHA-256 hashes, provider metadata, latency, exposed usage, and initially empty human review/failures/usability. Review snapshots fill those human fields without mutating the original. `modelVersion` is null because the current adapter exposes no independent model-version field; any dated model string returned by the provider is preserved verbatim.

The canonical prompt remains `docs/reference-analysis-prompt.md`, version 1. Its explicit evaluation identifier is **reference-analysis-v1**, declared in `server/evaluation/run.ts`; its exact existing bytes are hashed without changing the instruction. Future changes must increment both the canonical version and evaluation identifier, update compatible contract metadata where necessary, and retain all historical records. Schema version and hash are separate. Configuration is derived from the existing request builder (requested model, reasoning effort, token limit, storage policy) plus image detail and timeout. No configuration change rewrites earlier attribution.

## Pilot and manual product gate

First add and annotate Reference 01, run one real analysis, and assess whether the evaluation workflow itself is usable. No real calls were made to populate this harness.

Once the workflow is usable, complete the 12-reference pilot with one explicitly requested run per reference. Review the complete pilot before changing prompts. Only a recurring failure across multiple references or a conceptual contract problem justifies a prompt change. Do not cherry-pick adjustments to one image. Any modification creates a new version; a later comparison must retain old results. Decide afterward whether three runs per reference are necessary for repeatability; never start 36 calls automatically.

After the pilot, write a qualitative review of observed strengths, weaknesses, recurring failure modes, uncertainty behavior and reconstruction-control usefulness. Answer separately whether obvious composition is recognized, lens descriptions stay broad, ambiguous cases produce appropriate insufficiency, observations support conclusions and controls help creative decisions. Inspect latency/usage only where actually exposed; there are no cost estimates or charts.

Moving EXPERIMENTAL to AVAILABLE requires a named human's explicit decision, date, cited reviewed run IDs, unresolved failure modes and rationale recorded in a decision document under this directory. It is a deliberate source/document change after review, never a test result or automatic metric. Current state remains EXPERIMENTAL, without adding customer-facing badges. Provider-neutral records can support later comparisons, but this phase implements only the existing OpenAI adapter.

## Verification

Evaluation tests use generated in-memory pixels and mocked adapters, never paid calls or pilot assets. They cover manifest validation, empty slots, expectation vocabulary, ambiguity/multiple compositions, missing inputs/paid confirmation, taxonomy and multiple failures, attribution, historical immutability, complete review validation, traversal/symlink rejection and offline HTML escaping. Existing adapter tests cover motion and focal-length rejection. Production build checks reject evaluation UI/taxonomy/private-path markers in emitted client bundles.
