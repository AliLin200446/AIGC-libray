# Visual study protocol — v01

**SAME WORLD. ONE VARIABLE CHANGES.**

This is a production plan, not experimental evidence. No baseline, model, asset or result has been generated or approved. The UI remains unchanged. The machine-readable authority is `src/experiments/studies/manifest.ts`; it joins the existing controls and creates a complete provider-neutral handoff for each of the twelve studies.

## 1. What an experiment can establish

A study supports visual conformance to a stated control under declared conditions. It cannot prove that a generative model internally simulates optics or physically moves a camera. A beautiful image, a lens label in an instruction, or a high numerical similarity score is not sufficient evidence.

Use paired baseline/treatment outputs, multiple depth cues, predefined criteria, repeated runs, and preserved originals. Ask whether a simpler competing explanation—crop, uniform zoom, subject movement, scene replacement or generic styling—fits the output. If the cues cannot distinguish explanations, mark the relevant assessment **untested with an inconclusive note**, rather than declaring success. Use **failed** for an observable contradiction, not for a service error.

## 2. Canonical scene

A quiet limestone courtyard with one adult woman, 1.72m target height, short dark bob, brown eyes, oval face and a small left-cheek mole. She wears a matte slate-blue crew-neck top, charcoal straight trousers and plain flat shoes. Feet remain planted, arms rest naturally, and hands do nothing. Her head/body face the original camera, including during an orbit.

Pale paired columns and a recessed centered doorway provide major structural symmetry. A low off-axis foreground stone plinth, paving intersections and background edges provide depth cues. A small left-only wall recess makes environmental orientation recognizable. The right wall provides low-detail space. No mirrors, text, crowds, floating objects, busy fabric or dramatic lighting.

The major architecture is symmetric; fine details deliberately are not. The symmetry control asks for structural correspondence, not artificial pixel mirroring. If a composition cannot be achieved without inventing geometry or deleting objects, record infeasibility instead of accepting a different world.

Coordinates are production targets in meters: x right, y into the scene, z up. Subject feet `(0,0,0)`; camera `(0,-6,0.86)`; foreground plinth `(-0.55,-1.5,0.35)`; columns `(±2.3,5,0)`; doorway `(0,7,0)`; left recess `(-3,6,1.4)`. The plinth is close enough to show differential depth change while remaining in the proposed wide-lens framing. Verify actual visibility before approving the master; if geometry must change, revise the baseline for every arm.

### Baseline approval bundle

First produce and approve a scene master, identity crop/reference and, if necessary, a wider scene reference. Do not generate them during this planning phase. Freeze their content, original dimensions, checksums, provenance, model/version/settings/seed and approval notes. Use the same bundle in each arm, with identical reference strength where supported. Textual identity traits are not an identity lock.

The world beyond a single image is underconstrained. Orbit and reveal studies require a sufficiently defined reference world. If the model invents an unobserved side, do not treat agreement with an invented reference as proof. A later photographed or calibrated 3D reference can establish geometry more strongly, but is not required to begin the diagnostic pilot.

## 3. Baseline locks and allowable dependencies

| Group | Locked baseline |
| --- | --- |
| Subject | Approved identity, fixed outfit, pose and world position; no gaze-following |
| Environment | Courtyard geometry, landmark identities/count/world positions, 10:00 AM setup |
| Light | Soft daylight from high front-left in world coordinates; fixed exposure, neutral WB and tone mapping |
| Camera | Position `(0,-6,0.86)`, aim +y, level, no roll; 50mm rectilinear full-frame reference |
| Optics | f/8, subject-plane focus at nominal 6m; legible depth cues |
| Composition | Full-body midpoint `(0.50,0.50)`, height ~64%; full head and feet |
| Output | 8:5; consistent 36×22.5mm active crop of a 36×24mm sensor reference |

Normalized coordinates use top-left origin. Proposed placement tolerances of ±0.05 per axis are acceptance targets, not invented measurements or benchmark precision. Record actual observed placements if measurable. Provider settings may not expose physical camera fields: mark them instruction-only or unsupported and record that limitation.

The manifest explicitly subtracts the intentional variable and necessary dependencies from the lock list. Every other variable stays locked. Controls can require multiple physical changes: the **creative decision** is isolated; its causal dependencies are disclosed, not denied.

- Pan/tilt: orientation changes; image anchor and coverage must change.
- Dolly: camera position changes; subject scale and subject focus distance must change. Lens and world remain fixed.
- Orbit: position changes; aiming direction follows the subject and projected silhouette/coverage changes.
- Matched-framing lens set: focal length changes; camera distance and focus distance change. Perspective differences come from the new viewpoint.
- Composition: world stays fixed; minimal aiming changes may be necessary. Record resulting coverage and any small scale deviation.

Do not silently normalize outputs by cropping, warping, exposure matching or stabilization. A presentation derivative may later be made, but keep the untouched original and disclose the transform; evaluate originals.

## 4. Camera production sheets

All four are six-second continuous shots, with 5–8 seconds allowed only for a documented provider constraint. Request 24fps or record native supported frame rate. Paired baseline is the same subject/scene held still for the same duration. Start from the same approved image where conditioning allows. Constant motion is the initial test profile, not an aesthetic requirement.

| Study | Start → end / path | Speed | Required evidence | Confounds / reject |
| --- | --- | --- | --- | --- |
| Pan | Canonical frame → right-side reveal. Fixed center, yaw 0→12° right; no pitch/roll | 2°/s | Coherent leftward landmark motion and consistent newly revealed architecture | Reject lateral tracking, subject movement or scene replacement. A crop shift alone is inconclusive |
| Tilt | Canonical frame → more upper wall/lintel. Fixed center, pitch 0→8° up | 8/6°/s | Coherent downward image motion, plausible changed vertical convergence | Reject crane motion, roll, architectural stretch. Feet leaving frame may be expected |
| Dolly In | Canonical frame → larger subject. `(0,-6,0.86)` → `(0,-5,0.86)`, fixed 50mm and orientation | 1/6 m/s | Foreground/subject/background differential change, coherent occlusion, stationary subject | Reject zoom-only behavior, walking subject, compensated lens change, identity/environment drift |
| Orbit | Canonical frame → 20° clockwise arc viewed from above. Radius 6m, height .86m, aim at body center; end ~`(-2.05,-5.64,.86)` | 20/6°/s | Newly visible subject surfaces corroborated by background parallax | Reject turntable subject, pan-only output, morphing surfaces or spiral radius |

All original subject/environment/light locks apply. Dolly's final height is approximately 77%, not a mandatory pixel measurement without calibration. Orbit may change apparent highlight/shadow shapes with view angle; fixed world lighting does not imply identical shading pixels.

These are directional clips. Loop playback may jump from end to start. Do not create a return movement, reverse/ping-pong edit, crossfade or fabricated seamless loop to hide that jump.

## 5. One lens comparison set

Use the same full-body target: center `(0.50,0.50)`, body height ~64%, same pose/world/light, same sensor crop and orientation. Focus on the same subject plane, f/8 for every member. Avoid deliberately exaggerated bokeh or generic portrait styling.

| Focal length | Initial distance | Role |
| --- | --- | --- |
| 24mm | 2.88m | Treatment relative to 50mm |
| 35mm | 4.20m | Treatment relative to 50mm |
| 50mm | 6.00m | Reference arm |
| 85mm | 10.20m | Treatment relative to 50mm |

Distances follow the initial approximation `distance = 6m × focalLength / 50mm`. They are setup targets. Adjust axial camera distance only as required for matched framing; record it. Do not crop or resize the subject into compliance. Actual calibrated optics, subject depth and framing may require small deviations from the approximation.

Compare field coverage, facial projection and foreground/background relative scale. At equal framing, shorter lenses require closer viewpoints; longer lenses require farther viewpoints. This changes perspective and apparent compression. At a fixed viewpoint, focal length changes field of view and magnification **without** changing perspective. Do not claim the set independently isolates perspective from distance.

Equal f-number does not imply equal depth of field. Focus distance also changes; label that dependency. Blur is neither the primary success criterion nor proof of focal length. Keep depth landmarks readable; if they become unusable, reject the set for this purpose rather than changing aperture in one member.

The 50mm member is a no-op reference, not evidence that a model followed a focal-length change. A later fixed-viewpoint or 35→50mm treatment needs its own explicit protocol revision. The manifest keeps the comparison baseline at 50mm even for this reference arm.

Deliver all four together, with a common `comparisonSetId`, model/version, reference bundle, replicate number and settings policy. Keep paired seed policy consistent where supported. Do not select the best image from four different models or runs. If one member fails scene/identity comparability, withhold the complete set and preserve all failures.

The existing UI comparison group is `lens-matched-framing`; each study references that same group and its control-owned asset slot.

## 6. Composition production sheets

Use the same world and 50mm lens, camera center approximately unchanged, body scale approximately 64%, same wardrobe/pose/light. Re-aim minimally; never reposition the person or erase architecture. Record necessary aiming and resulting frame coverage.

| Control | Observable target | Existing guide | Reject |
| --- | --- | --- | --- |
| Centered | Full-body bounding-box midpoint `(0.50,0.50)` | Center axes and midpoint | Wrong anchor, digital scale/crop change, forced symmetry |
| Symmetrical | Paired major forms balanced around vertical x=.50; subject on axis | Vertical symmetry axis | Mere subject centering, pixel mirroring or duplicated recess/plinth |
| Rule of Thirds | Face center `(1/3,1/3)` | Upper-left intersection and thirds grid | Body center used instead of face, wrong intersection, grid baked into asset |
| Negative Space | Right region x=.60–1.00 is quiet; body near x=.30 | Right 40% region, left subject anchor | Wrong side, new props/text, excessive subject shrinkage, deletion of still-visible objects |

The canonical master already satisfies centering and major structural symmetry. To test control instead of rewarding a no-op, create a **derived off-target baseline frame** using +6° yaw in the same world, at the same lens/position. Treatment returns orientation to the canonical alignment. Document this reference variant and use it identically across the paired comparison. It is not a second environment. If six degrees does not establish an observable off-target baseline, stop and preregister a revised angle; do not retroactively tune the threshold after viewing the treatment.

Negative-space feasibility depends on the actual approved architecture. An object leaving the view through legitimate reframing differs from an object being erased while its location remains visible. If 40% quiet space cannot coexist with the locks, mark the study infeasible and revise the protocol openly.

Manifest overlays reuse the exact existing control overlays. They stay UI layers; do not generate the guides into images. If a target changes, version the study and synchronize the overlay deliberately before attaching the asset.

## 7. Generation handoff and records

Every manifest entry exposes:

1. **Reference/baseline:** canonical baseline ID, approval prerequisite and any derived starting frame.
2. **Control being tested:** existing control ID/name/revision and canonical creative intent.
3. **What must change:** treatment target plus its production path/anchor.
4. **What must not change:** resolved baseline lock values.
5. **Generation instruction:** provider-neutral experimental directions.
6. **Negative/preservation constraints:** explicit rejection conditions, not a magical negative prompt.
7. **Output requirements:** format, dimensions, timing and provenance.
8. **Evaluation checklist:** study checks plus canonical criterion IDs.

A model adapter may translate these directions into provider wording/settings, but it must not redefine intent. Keep provider instructions in the existing `ModelTranslation`, and save exact baseline/treatment snapshots in `Experiment` and `ExperimentRun`. No model translation was drafted or evaluated by this phase.

`Experiment` now references `studyId` and `baselineId`; optional `comparisonSetId` links lens members. Existing repeated runs, assessments, output references, seed strings and failure modes remain the result store. Do not create a parallel results table in the manifest. `status: specified` means production planning only; it does not change the control's `untested` evidence status.

For each actual run, preserve reference hashes, source identity, model/provider/version, generation date, exact instructions, settings, native dimensions/frame rate/duration, seeds when available, raw outputs and rejection notes. Record attempts even if transport errors or unusable outputs occur. Keep the same settings/reference strength between paired arms except declared changes. Same-seed comparisons are useful where supported but do not guarantee identical latent conditions across different model families.

## 8. Asset naming

Baseline master: `baseline_scene_v01__<source-model-key>__master.png`; accompanying metadata uses the same stem with `.json`. Do not imply a generated baseline exists yet.

Run artifacts use the helper in `src/experiments/studies/naming.ts`:

`<baselineId>__<studyId>__<provider-model-version>__runNN__attemptNN__<baseline|treatment>__<output|poster|metadata>.<ext>`

Example name only:

`baseline_scene_v01__study_dolly_v01__provider-model-version__run01__attempt01__treatment__output.mp4`

Lens IDs are `study_lens-24mm_v01`, `study_lens-35mm_v01`, `study_lens-50mm_v01`, `study_lens-85mm_v01`. Composition uses names such as `study_rule-of-thirds_v01`. Full model identity belongs in metadata even if the slug is abbreviated. Register unique model slugs. Repetitions increment run number; retries increment attempt number. Never reuse a path to overwrite a failure. Link the chosen attempt explicitly in the run record.

## 9. Deferred recommendation: Dolly In diagnostic pilot

The current first study is **Controlled Lens Set**, per the approved task scope. Use [lens-set-01.md](experiments/lens-set-01.md) for human review and execution preparation. The Dolly checklist below is retained for a later study and is not authorized for execution now.

Dolly makes the main methodological problem visible: does the requested behavior occur while the world stays stable, or does a simpler imitation explain the output? It is more diagnostic than a crop-achievable composition and cheaper to interpret than an entire lens set. It also exercises temporal identity, depth cues, paired video baselines and collateral-change assessment in one bounded pilot.

### Exact production checklist

- [ ] Approve `baseline_scene_v01` and freeze master/reference hashes. Confirm face, full body, foreground corner and at least two background landmarks are legible.
- [ ] Reserve `study_dolly_v01`; keep all other studies specified only. Select **one** actual video model/version; record supported conditioning, seed, resolution and duration settings. Stop if required conditioning is unavailable rather than quietly changing protocol.
- [ ] Set direction=in, distance=1m target, duration=6s, subject-lock=true, speed-profile=constant, lens=50mm, f/8, camera height=.86m. Start 6m from the fixed subject and finish 5m away; allow focus-distance change only.
- [ ] Write the provider translation from the manifest handoff; save its revision. Do not upgrade reliability from a plausible instruction.
- [ ] Baseline arm: six seconds of the approved scene, fixed camera and subject, no intended motion. Treatment arm: same setup, one constant forward translation. Use the same approved starting image and settings in both.
- [ ] Preregister **three paired runs** (six clips), with an independent seed per pair if supported and the same seed within each pair. This is a diagnostic sample, not a benchmark or statistical confidence claim. If seeds are unavailable, mark null and record six independent invocations.
- [ ] Record each original output and attempt before review; no cherry-picking or hidden rerolls. A service error gets an error record and an explicit retry attempt.
- [ ] Inspect baseline drift first. A baseline that already moves/deforms is a confound. Preserve the treatment but withhold causal claims for that pair.
- [ ] Inspect original start, midpoint and end frames and the continuous clip. Track body/face identity, plinth corner, column edges and doorway. Do not rely on just three stills to rule out temporal jumps.
- [ ] Test zoom-only explanation: can uniform image scale/translation account for all landmark trajectories? Seek coherent depth-dependent residual motion, relative scales and changing occlusions. Warping that mimics parallax but bends rigid lines is a failure, not success.
- [ ] Reject zoom substitution, walking subject, lens compensation, material identity drift, geometry morphing or cuts. Missing/blurred landmarks mean inconclusive evidence. Do not assert exact one-meter travel from an uncalibrated render.
- [ ] Record per-run Intent Fidelity and Collateral Change with notes and cited run IDs. Assess Consistency only across the comparable completed pairs. Three successes do not automatically justify a “strong” general model claim.
- [ ] Gate: proceed to a larger batch only if null baselines are sufficiently stable and reviewers can distinguish motion from the competing explanations using the recorded cues. Otherwise revise the baseline or conditioning protocol, increment its version where content changes, and repeat the pilot.
- [ ] Keep every original result, including failures. Attach a clearly identified representative clip to the control only after review, and attach its run IDs/provenance. Accompany any selected success with the overall repeatability notes; do not label it a benchmark.

## 10. Practical limits

Generated scenes may violate physical constraints even when instructions are exact. This protocol reveals those failures; it does not guarantee control. Report condition-specific evidence and uncertainty. The strongest claims require matched references, stable baselines, multiple consistent observations and an explanation that survives competing hypotheses—not attractive output alone.
