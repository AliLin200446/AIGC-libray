# Public visual-system migration

Audit before implementation: 2026-09-30.

## Route checklist

- `/`: preserve spatial instrument; audit idle, Lens, Compose inspector/Plan, Reference upload/results/error.
- `/library`: preserve redirect to instrument.
- `/index`: add a dedicated catalog of the existing 12 canonical controls; retain homepage quick index.
- `/library/pan`, `/library/tilt`, `/library/dolly`, `/library/orbit`: shared camera specification template.
- `/library/lens-24mm`, `/library/lens-35mm`, `/library/lens-50mm`, `/library/lens-85mm`: shared lens specification template.
- `/library/centered`, `/library/symmetrical`, `/library/rule-of-thirds`, `/library/negative-space`: shared composition specification template.
- `/recipes`: published assemblies only; technical empty state until a recipe is ready.
- `/recipes/:slug`: shared assembly specification template; no public draft routes. Verify through existing private preview because no recipe is published yet.
- Missing page / missing control / missing recipe / load error: shared archive navigation and recovery.
- All above: narrow viewport, keyboard focus, reduced motion, media integrity.

## Protected boundaries

No control, camera, lens, composition, Compose-state, analysis-provider, recipe-data, approved-reference, experiment or evaluation changes. `/dev/*` tooling is not redesigned. Model evidence publication gates remain unchanged. Media pixels are never filtered or tinted.

## Migration order

Tokens → shared archive shell/spec table → control specification → component catalog → recipe catalog/assembly → Reference/Compose secondary typography → public recovery states → responsive/visual QA → typecheck, lint, tests, build.

## Implemented

- Palette retained: ink `#20211E`, moss `#46503A`, jade `#75845D`, muted moss `#62704C`, paper `#F6F5EF`; media field `#E8EBE1`. Shared display/interface/technical roles, gutters, section spacing, grid gaps and rules live in `src/library/colors.css`.
- Shared archive shell, navigation, footer, title and semantic specification table in `src/library/archive.ts`; document and component-grid styles in `archive.css`.
- All 12 control pages use an asymmetric live deterministic demonstration/specification hero, calibrated parameter ranges, numbered anticipated failure criteria, approved-reference modules and existing gated model evidence/export sections. Demo parameters remain canonical; configuration is explicitly identified as local intent, with composition-guide feedback. No physics or control schema changes.
- `/index` has category descriptions/counts on the left and a consistent component grid on the right. Thumbnails reuse existing schematic paths and composition overlays; they are explicitly marked schematic, not model evidence. The homepage quick index remains and links to the catalog.
- Recipes use catalog and assembly layouts, result/specification heroes, numbered control assemblies, ruled model exports and original Copy/Remix actions. No recipe record or publication gate changed.
- Reference retains its existing image plane, analysis, overlays and suggestions; typography, section rules and error treatment adopt the inspection system. Compose retains its canvas/editor; inspector and Plan adopt document rules, with a scrollable inspector on mobile.
- Public missing-page/control/recipe states share the archive recovery layout. `/index` and the styled 404 are included in the production release.
- Removed public preview brightness treatment and boxed prompt styling; no rounded card or shadow language added. Actual images/videos are not recolored or filtered. Three.js demonstration materials continue using the existing palette, separate from evidence.
- The root mount is a neutral container to avoid nested main landmarks on document pages; the internal inspector keeps its existing dimensions through its mount selector. No internal tool redesign.

## Verification

- Visually inspected every canonical detail route at desktop width: pan, tilt, dolly, orbit, lens-24mm, lens-35mm, lens-50mm, lens-85mm, centered, symmetrical, rule-of-thirds, negative-space. Each mounted one deterministic canvas without horizontal overflow.
- Desktop: catalog, Recipes empty state, private Recipe detail, homepage idle/Lens/Compose/Plan/quick Index, Reference upload/loading/authored analysis/error, public missing-page and missing-recipe states.
- Mobile 390 × 844: catalog, camera/lens/composition documents, calibrated parameters, Recipes catalog and assembly/export, Reference findings, selected Compose object inspector. Corrected caption alignment, heading scale and inspector overflow. Viewport override reset afterwards.
- Keyboard configuration changed the thirds intersection; Copy Recipe preserved the control stack; Copy Prompt preserved exact whitespace; Remix loaded the private UI test at 85mm. The test record existed only in the private preview textarea and was never saved or published. Remix was exited afterwards.
- Reference error used deliberately invalid local PNG bytes. Analysis presentation used the existing authored development fixture, clearly labeled as such; no external model call.
- Focus outlines, native labels/table row headers, reduced-motion handling and media containment retained. Recipe Copy keyboard focus visually checked. No full accessibility certification is claimed.
- Typecheck, ESLint, all 115 tests, production build and release audits pass. Static-server coverage now includes `/index`. Build still reports the non-blocking shared Three.js chunk-size warning (~558 KB minified).

## Evidence limitations

No published recipe video or approved real-world reference media exists in the current data. Recipe layout and actions were verified with the existing private preview and an unsaved UI-only record; real video playback and populated approved-reference layouts could not be visually checked. Publication gates and evidence records remain unchanged. No deployment was performed.
