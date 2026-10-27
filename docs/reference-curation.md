# Curated Visual Control Database — V1 foundation

The database separates taxonomy coverage from authored content. The supplied list contains 48 entries: 12 preserved canonical IDs and 36 draft slots across CAMERA_MOVEMENT, LENS, CAMERA_ORIENTATION, COMPOSITION, FRAMING, FOCUS_DEPTH, CAMERA_BEHAVIOR and SUBJECT_CAMERA_RELATION. Draft slots intentionally have no invented definitions, demos, translations or evidence. They are available only in the development database/view.

The Gold pilot IDs are `dolly`, `orbit`, `lens-24mm`, `lens-85mm`, `rule-of-thirds`, `negative-space`. Dolly In is the `dolly` specification with `direction: in`; its ID, existing bidirectional specification and detail route are preserved. Dolly Out is a draft taxonomy slot, not a new published route.

## Parameters and readiness

`src/controls/metadata.ts` defines continuous, discrete, enum, directional and composite semantics independently of the existing research configuration widgets. Existing research parameter definitions are not rewritten. The Lens ruler consumes the shared 24–85mm exploration bounds and 24/35/50/85 landmarks. Intermediate values and draft lens entries never create canonical routes.

Readiness records definition, demonstration, real-world reference, translation and evaluation separately. The original 12 controls retain canonical identity, with definition/demo ready and remaining content checks incomplete. This does not imply validated analysis or completed experimental evidence. Future promotion uses `promoteControl`, which rejects incomplete readiness and deprecated entries. Readiness is an explicit editorial assessment, not an automatically generated evidence claim.

## Human curation

Run `npm run dev` and open `/dev/reference-curation` on that server. The current local preview uses http://127.0.0.1:5181/dev/reference-curation.

1. Select Dolly In (Gold). Paste an official source URL and record it as a candidate. Ingest records the supplied URL only: it does not scrape metadata or download media.
2. Edit metadata to supply title, work, creator, year where known, medium, source type, attribution, control mapping, optional timestamps and rights status. Do not infer missing capture metadata. Empty or unknown attribution must be resolved before approval.
3. Supply **Observe**, **Demonstrates** and **Not to confuse with**. For Dolly In, examine visible depth/parallax and distinguish physical translation from optical zoom. These are review questions, not pre-filled findings about an unseen reference.
4. A human reviewer inspects the source, records their name and the rights/source basis, and marks reviewed, approves or rejects. Approval validates required evidence and provenance fields. Editing any record resets it to candidate and removes its review.
5. Export approved JSON. Review the diff and place only approved records into `src/references/approved.json`. Run tests/build. Local approval or export does not change the production database or deploy anything. Approved references mapped to drafts cannot be exported for the existing canonical production catalog.

Drafts are stored in this browser's localStorage under a versioned key. They are not a server/shared database. Back up candidates with the separate backup action before clearing browser data; that backup contains unapproved records and must not be used as production data. Metadata editing is intentionally a plain JSON editor in this utilitarian development view.

The provider-neutral discovery interface accepts future adapters but always downgrades their output to candidate and removes review claims. No discovery provider or bulk content population is included.

## Sources, rights and public display

`RealWorldReference` supports work/creator/year, medium (including cinematography-test), source type/URL, optional embed/thumbnail/timestamps, attribution, control mapping, evidence, rights, verification and human review provenance. Runtime validation rejects unknown mappings, unsupported statuses, unsafe URL schemes, invalid timestamps and incomplete approval records.

Rights statuses are official-embed, official-link, licensed and metadata-only. Metadata-only never loads a thumbnail/player. No media download mechanism or local movie-asset requirement exists. A URL being technically downloadable is not a permission grant.

The reusable detail component renders **In Practice** only for valid, approved records mapped to a canonical control. Candidates, reviewed-only, rejected or invalid records produce no public section. Text is rendered as text, not injected HTML. Every approved record displays all three evidence explanations, attribution and a source link.

Embeds load only after a button click and never request autoplay. The renderer currently recognizes official YouTube/Vimeo embed URL formats; unrecognized providers fall back to source links without changing the provider-neutral data schema. Existing production CSP/deployment settings are unchanged and can block external players or thumbnails. The source link remains available in that case. Supporting an additional embed provider or permitting embeds under deployment policy requires a separate reviewed change; restrictions are never bypassed.

`approved.json` starts empty. No film clips, stills, real-world reference claims or approvals were populated in this pass. Tests exercise schema, lifecycle, rendering boundaries, promotion gates and production records. Release checks exclude the curation UI and draft taxonomy from client assets.
