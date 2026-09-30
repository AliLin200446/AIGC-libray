# Human reference suite checklist

All committed slots start **missing**, with blank annotations. These are selection intentions, not invented image descriptions or expected answers.

- [ ] Reference 01 — obvious centered
- [ ] Reference 02 — obvious symmetry
- [ ] Reference 03 — obvious rule of thirds
- [ ] Reference 04 — obvious negative space
- [ ] Reference 05 — strong wide-like spatial relationship
- [ ] Reference 06 — moderate wide/normal transition
- [ ] Reference 07 — strong normal-like relationship
- [ ] Reference 08 — strong telephoto-like relationship
- [ ] Reference 09 — shallow DOF but insufficient lens evidence
- [ ] Reference 10 — cropped image where focal tendency is ambiguous
- [ ] Reference 11 — composition supporting multiple valid controls
- [ ] Reference 12 — image with insufficient structural cues

Initialize with `npm run reference-eval -- init`. Put user-supplied images under `~/Library/Application Support/Visual Control Library/reference-evaluation/images/`. Edit the adjacent `manifest.json`; never place private pilot imagery in `public/` or the repository.

For each slot, fill this human annotation structure (initially empty):

```json
{
  "referenceId": "reference-01",
  "sourceProvenanceNote": "",
  "expectedObservableTraits": [],
  "compositionExpectations": [],
  "lensTendencyExpectation": [],
  "framingExpectation": [],
  "knownAmbiguities": [],
  "forbiddenClaims": [],
  "acceptableSuggestedControls": [],
  "unacceptableSuggestedControls": [],
  "reviewNotes": "",
  "captureMetadata": null,
  "annotatedBy": "",
  "readyForEvaluation": false
}
```

Expectation array items contain `value`, `state` and a visible-evidence `reason`. State is EXPECTED, ACCEPTABLE, UNSUPPORTED or AMBIGUOUS. Do not copy the slot's purpose into the answers without examining your image.

Composition values: `centered`, `symmetrical`, `rule-of-thirds`, `negative-space`; annotate all four. Lens values: `wide-like`, `normal-like`, `telephoto-like`, `insufficient`. Framing values: `close-up`, `medium`, `medium-full`, `full-body`, `wide-environmental`, `ambiguous`. More than one interpretation may be acceptable. Observable trait values are human-written visible descriptions.

Acceptable/unacceptable suggested controls use existing composition IDs or `lens-24mm`, `lens-35mm`, `lens-50mm`, `lens-85mm`. They assess reconstruction usefulness, not literal capture metadata. Independently available capture information belongs only in `captureMetadata: { "source": "…", "note": "…" }` and is not the primary target.

Before setting ready: record provenance and reviewer; complete expected visible traits, composition/lens/framing judgments; consider crop history, DOF and other ambiguities; identify forbidden claims and useful/unhelpful controls; keep unsupported details unknown. Then follow the one-reference run and offline-review procedure in [the evaluation guide](reference-analysis-evaluation.md).

The next human action is Reference 01 only: add, annotate, run once, review the workflow.
