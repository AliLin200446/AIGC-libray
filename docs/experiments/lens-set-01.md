# Lens set 01 — execution sheet

Status: **AWAITING HUMAN REVIEW. ALL OUTPUTS UNTESTED.** This sheet supersedes the earlier Dolly-first recommendation. No generation is authorized by this preparation step.

## Research Question 

Can a generative model respond to focal-length intent while preserving the same visual world strongly enough for the difference to function as meaningful control evidence? Does explicit focal-length wording differ from a description of the corresponding visual relationships?

One model/version per complete batch: four focal lengths × two instruction conditions × three repeats = **24 fresh experimental stills**, plus **one separately approved 50mm baseline master** (25 images if no baseline exists). The six 50mm experimental outputs are fresh reference-preservation trials, not repeated file copies of the master and not evidence of a focal-length change.

## Baseline

Use the existing baseline_scene_v01 and study_lens-24mm_v01 / 35mm / 50mm / 85mm manifest entries. No approved reference exists yet. Do not begin the 24 outputs until this gate is complete.

Fill before generation:

- Reviewer / approval date: __________
- Actual provider / model / exact version: __________
- Unique lowercase provider-model-version key: __________
- Baseline source model/version (may differ from study model; disclose): __________
- Baseline master path / SHA-256 / dimensions: __________
- Reference bundle paths / checksums / reference strength: __________
- Native output format, resolution and aspect-ratio support: __________
- Model settings, sampler, steps, guidance, quality and edit mode where available: __________
- Seed for Run 01 / 02 / 03, or explicitly unavailable: __________
- Exact provider-specific instruction revisions, if adaptation is necessary: __________

### Baseline master instruction — copy after review

> A quiet pale limestone courtyard, one adult woman standing neutrally on the central architectural axis. A low foreground stone plinth and paving joints establish depth. Paired columns and a recessed doorway establish the background. One small left-side wall recess breaks fine-detail symmetry; the right wall remains quiet. Neutral editorial daylight, natural skin and visible textile weave. Same adult woman, short dark bob, brown eyes, oval face, small mole on left cheek. Approve one reference identity; text traits alone do not lock identity. Matte slate-blue crew-neck top, straight charcoal trousers, plain dark flat shoes; no loose layers, patterns, jewelry or logos. Full body, feet hip-width, arms relaxed, hands open without an interaction, head and torso facing the original camera location. No walking, turning or compensatory gaze tracking. Same courtyard, column spacing, doorway, paving lines, wall dimensions and landmark world positions. One subject, one foreground plinth, paired columns, centered doorway and left-only recess. Right wall is quiet; no extra objects. 10:00 AM in the same fixed scene setup; no moving sun, clouds or weather. Broad daylight from high camera-left/front, fixed in world coordinates. Soft natural daylight, modest shadow definition, no dramatic rim light, haze or artificial glow. Manual baseline exposure and neutral white balance; preserve tone mapping. Record actual shutter/ISO/WB if exposed by the tool. No automatic relighting. (0,-6,0.86)m; no translation. Aim +y, level pitch, zero roll. No automatic face tracking. 50mm rectilinear full-frame equivalent; no digital zoom or post-crop. 36×24mm reference, consistent 36×22.5mm active 8:5 crop. Never change sensor/crop between arms. f/8 target; depth landmarks must remain legible. Aperture is not a styling instruction. Focus on the subject plane, nominally 6m; no excessive bokeh, focus pumping or selective blur. Midpoint of full-body bounding box at normalized (0.50,0.50), top-left origin. Full body roughly 64% of image height, feet and head clear of edges, ample space on both sides. 8:5 frame. World layout in meters: subject at (0,0,0); camera-start at (0,-6,0.86); foreground-plinth at (-0.55,-1.5,0.35); left-column at (-2.3,5,0); right-column at (2.3,5,0); doorway at (0,7,0); left-recess at (-3,6,1.4). Produce one neutral photographic still at 8:5, target 1600×1000 or a preregistered supported native size. Keep the foreground corner and at least two background landmarks legible. No dramatic styling, mirrors, added text or guides. This is the baseline master, not a treatment output.

Approve recognizable identity, fixed clothing/pose, the plinth corner, paired columns, doorway and asymmetric recess before freezing the master. Record file checksum and provenance. If 8:5 is unsupported, stop and preregister a supported ratio for the entire batch; do not silently crop. Target 1600×1000, or one fixed supported native size. Save original output without a misleading extension; the matrix currently reserves PNG paths, so change the helper extension for native JPG/WebP if needed, never merely rename the file.

## Controlled Variables

Same baseline/reference bundle and conditioning strength; same person, face, wardrobe, pose, world geometry/object count, 10:00 AM lighting, exposure and white balance. Same camera height (.86m), orientation and roll; same sensor crop, output dimensions, full-body anchor (.50,.50), target height ~64%, f/8 policy and subject-plane focus target. Keep provider settings fixed. No beautification or stylistic embellishment. Coordinates/tolerances are production targets, not measured outcomes.

## Necessary Dependencies

| Arm | Nominal camera distance | Interpretation |
| --- | --- | --- |
| 24mm | 2.88m | Wider angular coverage; closer viewpoint for matched framing |
| 35mm | 4.20m | Moderately wider coverage; somewhat closer viewpoint |
| 50mm | 6.00m | Reference-preservation arm |
| 85mm | 10.20m | Narrower angular coverage; farther viewpoint |

Distances are setup predictions from 6m × focal length / 50mm, not asserted recovered model coordinates. They are deliberately **not fed as per-arm numerical distance instructions**: that would add geometric coaching to the literal condition. Both conditions permit axial movement to hold framing. Record actual distance if available; otherwise mark unknown.

Focal length changes angular field of view. Moving to retain subject framing changes perspective and foreground/background scale relationships. Refocus on the same subject plane when distance changes. Equal f/8 and focus target do not imply equal depth of field. Facial perspective may be too small to assess in a full-body image; record unobservable rather than beautification-based success. Environmental coverage must be interpreted by depth plane, not merely counting background objects.

## Instructions — shared exact block

Paste this block, then exactly one arm-specific paragraph below. That concatenation is the complete instruction stored in every planned run record. Use the same approved baseline in each independent invocation; do not feed one treatment into the next. The baseline camera location is a reference, not a distance lock.

> Use the supplied approved baseline_scene_v01 as the identity and environment reference. Preserve the same adult woman, face, short dark bob, slate-blue top, charcoal trousers, shoes and relaxed standing pose. Preserve the limestone courtyard, foreground plinth, paired columns, centered doorway, left-only wall recess and their world positions. Preserve the soft 10:00 AM front-left daylight, exposure and neutral white balance. Keep the camera level at 0.86m, looking along the original axis, with no roll. Keep the same 8:5 sensor crop, full-body center at (0.50,0.50), and body height approximately 64% of the frame. Keep f/8 and focus on the subject plane, allowing focus distance to follow camera distance; retain readable depth landmarks. Camera distance may change along the viewing axis only to maintain this framing. Do not crop, digitally zoom, beautify, relight, change pose or regenerate the environment. Produce one photographic still at the preregistered native resolution without added text or guides.

Condition A adds only the literal focal-length term. Condition B substitutes provider-neutral relationship language. B is a candidate translation, not demonstrated model-specific expertise. Freeze any provider-required syntax before the batch and record it; do not optimize B after seeing outputs.

## Condition A — Literal

### 24mm

Paste the shared block above, then:

> Photograph with a 24mm rectilinear full-frame lens.

### 35mm

Paste the shared block above, then:

> Photograph with a 35mm rectilinear full-frame lens.

### 50mm

Paste the shared block above, then:

> Photograph with a 50mm rectilinear full-frame lens.

### 85mm

Paste the shared block above, then:

> Photograph with an 85mm rectilinear full-frame lens.

## Condition B — Translated

### 24mm

Paste the shared block above, then:

> Use substantially wider angular coverage than the reference. Move the viewpoint closer only enough to retain the same full-body framing. Relative to the subject, show stronger near/far scale separation: the foreground plinth becomes larger and the distant columns and doorway smaller, with more of the distant background visible. Preserve rectilinear architectural edges; do not add fisheye distortion or stretch anatomy.

### 35mm

Paste the shared block above, then:

> Use moderately wider angular coverage than the reference. Move the viewpoint somewhat closer only enough to retain the same full-body framing. Relative to the subject, modestly increase the foreground plinth scale and reduce the distant columns and doorway scale, revealing somewhat more distant background. Keep these differences less pronounced than the substantially wide condition; preserve straight architectural edges.

### 50mm

Paste the shared block above, then:

> Retain the reference angular coverage and viewpoint. Preserve its foreground-to-subject and background-to-subject scale relationships and the same environmental coverage. Reproduce the same full-body framing without reframing, changing facial projection or adding blur.

### 85mm

Paste the shared block above, then:

> Use narrower angular coverage than the reference. Move the viewpoint farther away only enough to retain the same full-body framing. Relative to the subject, make the foreground plinth smaller and the distant columns and doorway larger, showing less of the distant background. Reduce near/far scale differences through the farther viewpoint, not blur, beautification or cropping.

### Why each translated phrase belongs

- Wider/narrower angular coverage → canonical field-of-view intent.
- Closer/farther viewpoint with fixed body framing → declared distance dependency.
- Plinth versus subject versus columns/doorway scale → observable near/far perspective relationships.
- More/less distant-background coverage → same environment projected from the new viewpoint.
- Straight edges and preserved anatomy → rectilinear scene preservation, not invented wide-angle styling.
- 50mm relationship preservation → no-op reference stability.

B supplies a visual hypothesis; it is not a claim of optical calibration. A vs B can support condition-specific response differences, not a proof of the model's internal understanding.

## Output Matrix

Paths are relative to the repository root. **model-unassigned is a reserved planning token, not a real model.** Before Run 01, assign the real model key and regenerate paths with prepareLensSet01(realKey, actualModelIdentity). Existing studyAssetName generates every basename below unchanged. Condition folders prevent A/B collisions; do not flatten them. Attempt 01 is reserved; retries use the same helper with incremented attemptNumber and must retain the originals.

The `baseline` filename arm on 50mm follows its existing manifest reference-arm role; it is a fresh output compared with the frozen master. All other focal lengths use `treatment`.

| Condition | Lens | Run | Exact save path | Status |
| --- | --- | --- | --- | --- |
| A literal | 24mm | 01 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 24mm | 02 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 24mm | 03 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 35mm | 01 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 35mm | 02 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 35mm | 03 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 50mm | 01 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run01__attempt01__baseline__output.png` | UNTESTED / planned |
| A literal | 50mm | 02 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run02__attempt01__baseline__output.png` | UNTESTED / planned |
| A literal | 50mm | 03 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run03__attempt01__baseline__output.png` | UNTESTED / planned |
| A literal | 85mm | 01 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 85mm | 02 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| A literal | 85mm | 03 | `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 24mm | 01 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 24mm | 02 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 24mm | 03 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 35mm | 01 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 35mm | 02 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 35mm | 03 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 50mm | 01 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run01__attempt01__baseline__output.png` | UNTESTED / planned |
| B translated | 50mm | 02 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run02__attempt01__baseline__output.png` | UNTESTED / planned |
| B translated | 50mm | 03 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run03__attempt01__baseline__output.png` | UNTESTED / planned |
| B translated | 85mm | 01 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run01__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 85mm | 02 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run02__attempt01__treatment__output.png` | UNTESTED / planned |
| B translated | 85mm | 03 | `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run03__attempt01__treatment__output.png` | UNTESTED / planned |

## Evaluation Checklist

Evaluate original pixels at a fixed display scale, first against the frozen master and then against the paired 50mm output from the same condition/run. Rate using the existing strong / partial / weak / failed / untested vocabulary and notes; no invented numeric score. "Strong" Collateral Change means successful preservation.

- Is full-body anchor and scale comparable (target .50,.50 and .64 height, predefined tolerance ±.05 normalized units)? Record actual deviation where observable.
- Are face, clothing, pose, architecture, plinth, doorway, asymmetric details and lighting preserved?
- Do foreground/subject/background relative scales and distant coverage change in the predicted direction? Examine all depth planes, not one silhouette.
- Does plausible facial perspective support the interpretation where resolvable? Otherwise mark unobservable.
- Could crop/uniform scaling explain the entire change? Could blur, beautification or regenerated architecture explain it instead?
- For 50mm, does the world remain stable without requested geometric change? Do not label stability as focal-length-control success.
- If reference-preservation outputs drift, retain all results but withhold causal claims that depend on a stable world.

The stored run `evaluation.collateralChange` is the form's Collateral Preservation field. Failure checklist values begin untested; after review write observed / not observed / inconclusive and explain. Record observed canonical failures in failureModeIds and others in unexpectedFailures. Never treat an unchecked box as a passed test.

## Rejection Criteria

Reject as positive control evidence when identity, pose, wardrobe, light or world geometry materially changes; when cropping/digital zoom substitutes for the predicted depth relationships; when blur/beautification alone changes; or when composition drifts outside the preregistered tolerance. Legitimate axial-distance/focus changes are necessary dependencies, not collateral failures. Blur that prevents reading landmarks makes that criterion inconclusive. Inconclusive assessments remain untested with an explicit note; service errors remain error records.

Retain rejected outputs and classify them. One failed member prevents presenting that replicate as a fully controlled four-lens set. Do not quietly cherry-pick across seeds, conditions or models.

## Recording Procedure

1. Human reviews this sheet, chooses the model/version, approves the baseline gate and preregisters settings, format, seeds and any instruction adaptation.
2. Populate the concrete batch prepared by `src/experiments/lens-set-01.ts`; its committed snapshot is `lens-set-01.records.json` beside this sheet. It contains eight existing-shape experiment templates, eight draft instruction records, 24 planned ExperimentRun records, per-output forms and 36 pairwise records. Null model and empty settings/reference fields mean not ready; never substitute fake provider metadata.
3. Before real generation assign all translation records to the selected actual model slot and retain both condition-specific IDs; do not overwrite A with B. Copy the configured experiments/translations into their existing data arrays and preserve IDs. Model metadata must be non-null to use the existing Experiment type. No schema changes are needed.
4. Run each output independently from the approved master. Use the same seed across all eight cells within a replicate where supported, with independently chosen seeds across replicates. If seeds are unavailable, leave null and match conditions/settings; do not claim matched latent samples. Hold the selected model/version fixed throughout.
5. Preregister order: Run 01 A24, B24, A35, B35, A50, B50, A85, B85; Run 02 B85, A85, B50, A50, B35, A35, B24, A24; Run 03 A50, B50, A24, B24, A85, B85, A35, B35. Record actual order/times and deviations. This is a diagnostic counterbalanced schedule, not a powered statistical design.
6. For each saved image record actual generation timestamp, original asset hash/dimensions/format, exact submitted instruction/settings/reference paths and seeds. Planning createdAt is not generation time. If a provider rewrites instructions, retain both versions.
7. Set the run's baselineOutput to the **same approved baseline master** and output to its own actual file. This does not require 24 more baseline generations. Change status to completed only when the asset exists. Log errors/retries separately, retain attempt paths and identify the selected attempt in notes; do not reroll silently.
8. Fill every output form below and the corresponding existing run assessments/notes. Cite the real run ID only after review. Group Consistency starts untested and is assessed separately for each focal-length/condition across its three comparable runs. Three examples cannot establish broad model reliability.
9. For every model repeat the full batch in a separate model-key folder, keeping the same approved baseline when conditioning permits. Different baselines/settings invalidate a direct cross-model comparison unless explicitly disclosed. Do not create charts or a case study during execution preparation.

## Pairwise View

The records snapshot contains 24 within-condition focal-length pairs (24↔35, 35↔50, 50↔85, 24↔85 × two conditions × three runs) and 12 literal↔translated pairs (four focal lengths × three runs). Each points to exact run IDs and starts untested.

Compare within the same model, version, baseline and replicate. Read original images at a shared viewport without stretching/cropping; blind condition labels during review where practicable. Record whether the pair is comparable before describing which condition follows intent more faithfully. No UI changes are required.

## Asset Placement

Use `public/studies/lens-set-01/<actual-model-key>/literal/` and `public/studies/lens-set-01/<actual-model-key>/translated/`. Put the approved master under `public/studies/lens-set-01/baseline/` using `baseline_scene_v01__<source-model-key>__master.png` (actual native extension). Browser URLs omit the leading public/. Keep draft/rejected media unattached to the library. Files under public/ are served by Vite even when not attached; use a private working directory instead if a baseline must remain private, and record that path.

Use the same naming helper with artifact=metadata, extension=json for provenance sidecars, in the same condition folder. The committed records snapshot is a batch plan, not a provider metadata substitute. After review, existing VisualAsset experimentId/runIds can link the selected actual evidence; do not attach placeholders as evidence.

## Per-output Evaluation Forms

Every form is independent and begins UNTESTED. Record source evidence and concrete observations before rating. Shortcut flags: untested initially; after inspection observed / not observed / inconclusive. Notes can qualify any judgment.

### A / 24mm / Run 01

- Run ID: `lens-set-01:model-unassigned:literal:24:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 24mm / Run 02

- Run ID: `lens-set-01:model-unassigned:literal:24:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 24mm / Run 03

- Run ID: `lens-set-01:model-unassigned:literal:24:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 35mm / Run 01

- Run ID: `lens-set-01:model-unassigned:literal:35:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 35mm / Run 02

- Run ID: `lens-set-01:model-unassigned:literal:35:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 35mm / Run 03

- Run ID: `lens-set-01:model-unassigned:literal:35:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 50mm / Run 01

- Run ID: `lens-set-01:model-unassigned:literal:50:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run01__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 50mm / Run 02

- Run ID: `lens-set-01:model-unassigned:literal:50:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run02__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 50mm / Run 03

- Run ID: `lens-set-01:model-unassigned:literal:50:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run03__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 85mm / Run 01

- Run ID: `lens-set-01:model-unassigned:literal:85:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 85mm / Run 02

- Run ID: `lens-set-01:model-unassigned:literal:85:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### A / 85mm / Run 03

- Run ID: `lens-set-01:model-unassigned:literal:85:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/literal/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 24mm / Run 01

- Run ID: `lens-set-01:model-unassigned:translated:24:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 24mm / Run 02

- Run ID: `lens-set-01:model-unassigned:translated:24:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 24mm / Run 03

- Run ID: `lens-set-01:model-unassigned:translated:24:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-24mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 35mm / Run 01

- Run ID: `lens-set-01:model-unassigned:translated:35:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 35mm / Run 02

- Run ID: `lens-set-01:model-unassigned:translated:35:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 35mm / Run 03

- Run ID: `lens-set-01:model-unassigned:translated:35:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-35mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 50mm / Run 01

- Run ID: `lens-set-01:model-unassigned:translated:50:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run01__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 50mm / Run 02

- Run ID: `lens-set-01:model-unassigned:translated:50:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run02__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 50mm / Run 03

- Run ID: `lens-set-01:model-unassigned:translated:50:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-50mm_v01__model-unassigned__run03__attempt01__baseline__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 85mm / Run 01

- Run ID: `lens-set-01:model-unassigned:translated:85:run01`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run01__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 85mm / Run 02

- Run ID: `lens-set-01:model-unassigned:translated:85:run02`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run02__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________

### B / 85mm / Run 03

- Run ID: `lens-set-01:model-unassigned:translated:85:run03`
- Asset: `public/studies/lens-set-01/model-unassigned/translated/baseline_scene_v01__study_lens-85mm_v01__model-unassigned__run03__attempt01__treatment__output.png`
- Generation timestamp / actual model-version / settings / seed / asset hash: __________
- Intent Fidelity: **UNTESTED** — observations: __________
- Collateral Preservation: **UNTESTED** — identity / environment / lighting / pose / framing: __________
- Crop: **UNTESTED**; digital zoom: **UNTESTED**; DOF shortcut: **UNTESTED**
- Beautification: **UNTESTED**; environment regeneration: **UNTESTED**; composition change: **UNTESTED**; identity change: **UNTESTED**
- Confounds / rejection reason / criteria that cannot be assessed: __________
- Notes / reviewer / review date: __________


## Exact next human action

Review and approve this sheet, fill in the actual provider/model/version and settings, then use the Baseline master instruction to produce and approve baseline_scene_v01. Freeze that file before Run 01. Next attach that approved master, paste the shared block plus A / 24mm, use the preregistered Run 01 seed/settings, generate one still, and save it to the A24 Run 01 path with the real model key. No generation is performed by this sheet or its preparation code.
