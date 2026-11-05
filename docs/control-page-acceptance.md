# Control page template — acceptance notes

Local entry: http://127.0.0.1:5174/library/tilt

All twelve existing routes use one template and the canonical registry. No second control registry, new engine, dependency, deployment, model request, or media-permission change was introduced.

## Registry versus supplied example

Definitions, canonical intents, observable behaviors and failure text match the supplied dataset. Registry title casing is retained for **Rule of Thirds** and **Negative Space**. Registry parameter descriptions, units, option values, defaults and bounds remain authoritative, rather than replacing them with the shorter example schema.

Notable key differences: `speed-profile` / `ease-in-out` rather than `speed` / `ease`; `subject-lock`; `counterclockwise`; `fixed-viewpoint` / `matched-framing`; `baseline-focal-length`; `focus-target`; full anchor and intersection names such as `face-center` and `upper-left`; `area-fraction`. Adapters and decorative mosaics use these registry keys. Specs are authored from current values. Evidence is empty because the experiment registry has no runs.

The existing mosaic-heading lifecycle was preserved while adding the supplied shared cell painter. The supplied demo's evidence toggle and fabricated tested rows are not shipped.

## Preview limits

- Camera motion: existing recipe renderer handles pan, tilt, dolly and orbit parameters. Dolly travel is bounded before crossing the subject.
- Lens: field of view and comparison protocol work; aperture and focus do not simulate depth of field.
- Centered: canonical placement; anchor and tolerance remain evaluation intent.
- Symmetrical: axis guide changes; strict structural correspondence does not rebuild or mirror geometry.
- Rule of thirds: intersection and face/subject anchors work; object-center uses a subject proxy. Tolerance is an evaluation target.
- Negative space: side and area affect framing; detail level does not remove scene objects.
- Mini mosaics are decorative summaries, not physical simulations of every parameter.

Compose receives only its supported subset: focal length, supported composition presets, dolly-in/travel and timing. Unsupported motion, anchors, comparison protocols, speed profiles and geometry requirements are disclosed in imported-settings notes and use existing defaults. Pan/tilt/orbit work in the control-page study but are not represented as working movements in the narrower Try the Shot workspace.

## Validation

- TypeScript and ESLint passed.
- 187 automated tests passed, including registry/template integration, query validation and unsupported-motion fallback.
- Production build and privacy/release audits passed; existing large-chunk advisory remains.
- Browser: all twelve routes rendered their title and Three.js canvas at 375px without horizontal overflow or captured console errors.
- Browser: tested parameter edits and reset on every control page; spec updated and default state restored. Tested Tilt direction/angle, playback pause/replay, exact visible-spec clipboard copying, C-12 → C-01 navigation, Back navigation and 85mm transfer into Compose with synchronized prompt.
- Desktop two-column hero and mobile stacked layout visually inspected. Reduced-motion and offscreen mini-mosaic guards retained; no Lighthouse score is claimed.

## Files

Added: `src/controls/control-model.ts`, `control-adapter.ts`, `control-page.ts`, `control-study.ts`; `src/pixel/mini-mosaic.ts`; `src/playground/control-handoff.ts`; `src/styles/control-page.css`.

Updated: `src/library/library.ts`, `src/library/library.css`, `src/main.ts`, `src/pixel/mosaic-heading.ts`, `src/playground/page.ts`, `src/controls/catalog.test.ts`.
