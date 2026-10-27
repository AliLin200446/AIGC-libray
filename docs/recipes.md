# Recipes V0

A Recipe is a curated control configuration. ModelTranslation owns the exact submitted prompt, model attribution and optional settings. RecipeResult links that execution to a local video, SHA-256 digest, rights confirmation and optional human notes/observations/deviations. No generated result is treated as proof that every intended control succeeded.

## Recipe 01 handoff

Recipe 01 is **draft**. No video, submitted prompt, model, creator name or control interpretation has been supplied. The portfolio URL comes from this project's existing domain; confirm the display name yourself.

Place these files here (paths relative to the repository):

- `local-recipes/recipe-01/result.mp4` (or `result.webm`): your actual video.
- `local-recipes/recipe-01/prompt.txt`: exact submitted prompt, including meaningful whitespace.
- `local-recipes/recipe-01/controls.json`: your human-curated control mapping.

The single metadata record is `src/recipes/content/recipe-01.json`. Unknown metadata stays `null`. Recipe creation date records the ingest event; result generation date remains unknown unless entered by you. Do not substitute the earlier conversational prompt without confirming it was actually submitted for this video.

## Local ingest

Run `npm run recipe:ingest -- --help`. Example (replace all illustrative metadata; these are not claims about Recipe 01):

```sh
npm run recipe:ingest -- \
  --video local-recipes/recipe-01/result.mp4 \
  --prompt local-recipes/recipe-01/prompt.txt \
  --title 'Your title' --creator 'Your display name' --model 'Actual model'
```

`--model-version` and `--notes` are optional. This command copies only local files, preserves prompt bytes, verifies the video container and digest, and updates the single record. It performs no network request. Content edits default back to draft; publication is explicit.

Map canonical IDs using the existing catalog. For example, this is valid **illustrative syntax only**, not a mapping for Recipe 01:

```json
[
  {"controlId":"lens-85mm","parameters":{"protocol":"matched-framing"}},
  {"controlId":"dolly","parameters":{"direction":"in","distance":1,"duration":5,"speed-profile":"constant"}},
  {"controlId":"rule-of-thirds","parameters":{"intersection":"upper-left","anchor":"face-center"}}
]
```

Use `dolly`, not `dolly-in`; distance is numeric meters, not “medium”; `intersection`, not a new “left anchor” vocabulary. The lens landmark is encoded in its canonical ID. Unrecognized IDs, parameter names, enum values and out-of-range values are rejected. No Framing control is currently canonical; draft database slots cannot be added to recipes. Omitted parameters remain unspecified in the copied recipe; the deterministic adapter uses existing catalog defaults when it needs a value.

```sh
npm run recipe:ingest -- \
  --controls local-recipes/recipe-01/controls.json \
  --rights creator-owned --confirmed-by 'Your name' \
  --source 'Your actual generation source and publication-rights statement' \
  --status curated
```

Use `licensed` with actual license/source information for licensed work. V0 deliberately accepts only locally supplied MP4/WebM; external embeds are not implemented. You must confirm publication rights yourself. File signatures/digests confirm integrity, not ownership or perceptual quality.

## Preview and publish

1. Run the development server and open `/dev/recipes`.
2. Review the real video, exact prompt, model and human control mapping. A local JSON editor supports temporary previews without saving or publishing. Copy and Remix work in private preview when the necessary fields exist.
3. Optional `sceneState` is the version-1 Compose snapshot (`objects`, `primarySubjectId: "subject"`). Optional `cameraState` contains position/target tuples and focalLength. Incompatible snapshots fail validation; absence uses the canonical scene. Do not derive either from the video.
4. After reviewing, run `npm run recipe:ingest -- --status published`. All readiness fields and the real video digest are checked. Verified media is staged in `recipe-assets/recipe-01/result.mp4` for the build. Draft originals in `local-recipes/` are ignored by Git and Vercel uploads.
5. Run tests and build, then deploy when ready. Publication status changes local build output; the ingest tool itself never deploys.

Public routes are `/recipes` and `/recipes/recipe-01` once published. Until then, the index has an honest empty state and the draft detail is unavailable publicly. Vite includes only verified published records and media in production. `prepare-release.ts` emits deep-link HTML with recipe-specific title, description and canonical metadata; no fabricated OG image is emitted. New local curated entries use one JSON record per recipe and unique stable IDs/slugs. Do not rename a published slug casually.

## Copy and Remix

Copy Prompt reads only the selected result's translation prompt, unchanged. Copy Recipe is a readable numbered stack with canonical IDs/parameters and optional deterministic snapshots; it excludes model exports. Clipboard errors reveal a selected textarea for manual copying.

Remix stores a cloned versioned payload in sessionStorage, then opens `/?remix=1`. The instrument consumes it once and never edits the source record. Existing Lens/Camera/Composition controls replace their family in the working stack. Continuous lens edits override the active deterministic focal length; exact landmarks update the canonical lens instance. Compose edits use the same world. Reset Control clears the working controls while preserving objects. Exit Remix returns to neutral controls. Reloading the consumed URL does not restore the temporary remix.

The adapter composes actual lens geometry, motion parameters (direction, travel/angle/radius, duration, speed profile, subject lock), and composition placement. Motion is previewed once; changing a control replays it. The world remains fixed. Explicit fixed-viewpoint lens protocol uses the declared baseline position; matched-framing changes distance. Dolly travel stops before crossing the subject. Aperture/focus/blur are not simulated. Symmetry/negative-space controls cannot manufacture suitable geometry. Composition takes precedence over final pan/tilt aiming. These limitations are visible in the Remix indicator.

## Verification

Automated tests cover schema validation, canonical parameters, readiness/rights, exact prompt copying, portable recipe text, immutable remix state, optional snapshots, lens/motion/composition math and verified-media publication. Static-route tests cover recipe index/deep links and missing drafts. Development ingest stays outside production bundles. UI uses native video controls, semantic buttons/links, single-column mobile flow and reduced-motion-aware autoplay. Index videos use `preload="none"`; detail uses metadata preload.

No accounts, public uploads, engagement counts, remote storage, automatic control inference, automated video evaluation or social feed are implemented.
