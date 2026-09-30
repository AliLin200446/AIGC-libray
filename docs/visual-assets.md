# Visual studies and asset handoff

## Routes

- `/library`: the public visual browser with twelve canonical controls.
- `/library/<control-id>`: a control's visual, behavior, configuration, model evidence, observations, and instruction.
- `/dev/controls`: the unchanged internal inspector, development-only.

All three views read the same canonical objects from `src/controls/index.ts`. Visual-preview metadata is part of `ControlSpecification`, not a second library catalog. Pending previews contain simple labeled schematics and production shot lists. They are not model output, simulations, or evidence.

## Drop in real assets

1. Place actual assets in `public/studies/`. Reference them with `/studies/filename.ext`. Do not include `public` in the URL. Use MP4 or WebM video, and browser-compatible image formats.
2. Find the control in `src/controls/camera.ts`, `lens.ts`, or `composition.ts`. Replace its preview's `asset: null` with a `VisualAsset`, retaining the existing preview metadata and guides. For a factory-generated preview, spread the factory result and supply the asset field. Lens factory entries can accept individually assigned preview objects when assets arrive.
3. Choose `reference` for external/reference media, with attribution; choose `experiment` only for a real controlled experiment, with its experiment ID and run IDs. Add its actual records to `src/experiments/data.ts`. An asset alone never upgrades evaluation ratings.
4. For model comparison, add the media to the relevant translation's `visualEvidence` array in `src/translations/data.ts`. Assign an actual model identity, record repeated runs and update assessed observations separately. All attached media are shown; reference and experiment labels remain distinct.
5. Run typecheck and build. Seed-data tests intentionally assert no evidence exists yet; revise those assertions when replacing the initial placeholders with real evidence.

Example of the **shape** to use with a real recorded video (filenames and IDs below are illustrative, not existing assets or evidence):

```ts
visualPreview: {
  ...motionPreview('Forward camera travel · visible depth parallax'),
  asset: {
    type: 'video',
    src: '/studies/dolly-in.mp4',
    poster: '/studies/dolly-in-poster.jpg',
    alt: 'A stationary subject enlarges as the camera moves forward; background landmarks shift with depth.',
    evidenceStatus: 'experiment',
    experimentId: 'replace-with-real-experiment-id',
    runIds: ['replace-with-real-run-id'],
  },
}
```

For a reference still:

```ts
asset: {
  type: 'image',
  src: '/studies/centered-reference.webp',
  alt: 'Describe the visible subject and its frame position.',
  evidenceStatus: 'reference',
  attribution: 'Actual creator / source / usage permission',
}
```

The renderer uses image/video media, not background images, and preserves the full frame with `object-fit: contain`. Image and video errors return a labeled unavailable-asset state. Videos are muted, looping, inline, and autoplay except when reduced motion is requested; native play/pause controls remain available. A poster is optional. Autoplay is still subject to browser policy.

## Controlled lens comparison

`src/visuals/previews.ts` defines one group with four canonical control IDs. The selector reads each control's asset into the same fixed-size viewport; it does not crop one image to pretend different lenses were tested.

The initial study is **matched framing**: same subject, environment, sensor reference, aperture, and target subject size, with camera distance recorded for each focal length. Repositioning the camera accounts for perspective differences. Assign all four comparable assets to their respective lens controls and keep this protocol consistent. The canonical lens specifications also support a separate fixed-viewpoint experiment; do not mix the two protocols in one comparison set.

## Composition guides

Overlays are normalized SVG/UI coordinates layered above the media, never burned into the asset. Supported layers: center axis, symmetry axis, thirds grid, subject position, and negative-space region. Guides align to the image/video content rectangle, including when it is letterboxed.

The guide toggle is independent of control navigation. Configuring a thirds intersection, symmetry axis, or negative-space region updates the guide. It does not move pixels in a recorded asset. Reset restores canonical defaults.

## Configuration and evidence

`ControlConfiguration` stores the control ID, revision, and typed parameter values. Form edits validate against canonical choices/ranges and modify only this local object. It is displayed downstream as the future translation input. Changing values neither generates instructions nor invents new visuals. State resets on full page navigation/reload.

Model evidence is shown before instructions. The selected model drives the observed-behavior and translation sections. Ratings are displayed only from an experiment with matching control and translation revisions and matching parameter values; otherwise all dimensions remain untested. Translation-level known behaviors/failures can span configurations and are labeled accordingly. Reliability is never inferred from the presence of an image.

## Components

- `src/library/components/preview.ts`: media, labeled empty/error states, motion schematics and independent overlays.
- `src/library/components/lens-comparison.ts`: fixed viewport with four focal-length selectors.
- `src/library/components/configure.ts`: schema-driven inputs, guide updates, and reset.
- `src/library/components/model-evidence.ts`: model visuals, qualitative observations and downstream translation.
- `src/library/state.ts`: local configuration and validation.
- `src/library/library.ts`: browser/detail routes and shared editorial layout.

No new dependency, generation API, backend, or authentication was introduced. The dev inspector's source and stylesheet are unchanged. Production bundles include the shared catalog for the library, but exclude the inspector.
