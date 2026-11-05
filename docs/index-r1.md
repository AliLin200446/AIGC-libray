# Index R1 integration

The new Index replaces only `/index`; header/footer and all twelve control detail routes remain intact. Renderer input is `IndexModel`. No duplicate `index-data.ts` is shipped.

| Field | Source |
|---|---|
| slug / destination | Existing registry `id`, `/library/<id>` |
| title | Registry `name` |
| behavior | Registry `shortDescription`, verbatim, all 12 |
| family | Registry `category` |
| publication status | Registry `status`, including draft/experimental/deprecated support |
| experiment status | Registry `experimentStatus`; planned/in-progress/evaluated are retained rather than mislabeled as tested |
| C-01–C-12 | Registry order, display ordinal |
| SVG kind | Registry ID; rule-of-thirds maps to thirds |
| focal value | Existing lens ID; 24/35/50/85mm |
| horizontal FOV | Supplied formula, 36mm reference sensor width |
| Intro, steps, family explanation | Supplied design copy |
| About this build | Both existing disclaimer paragraphs preserved verbatim |

No fallback behavior descriptions were needed. No behavior lines require human confirmation. Pixel values appear only on four lens cards. Section numbers use ink to obey the supplied no-pink-text rule. Data and experiment statuses remain separate.

Filter state uses `?family=camera|lens|composition`; invalid values fall back to All. Filter actions push history entries so Back/Forward works; reload restores the selected family. Buttons retain aria-pressed and visible focus. Route/HMR teardown removes listeners. Existing pixel mounting still follows render through the app's observer.

Removed old Index markup and unused toolbar/thumbnail/caption CSS. Shared family/grid CSS remains because Recipes uses it; the shared control thumbnail/preview engine is unchanged elsewhere.

Validation: all twelve card URLs are checked against the canonical registry. Tests check original descriptions/statuses and four horizontal FOV labels. Browser checks cover All, lens filter, reload, Back and invalid query; 375px has a two-column grid without horizontal overflow. TypeScript, lint, tests and build are run with the updated Index document-title release assertion. No deployment.
