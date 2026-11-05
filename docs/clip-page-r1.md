# Shared clip-detail layout (R1)

All nine schematic and six curated film routes now adapt to `ClipPage` and use the supplied hero → setup → prompt → evidence → sources renderer. Existing `/clips/:id` aliases still resolve to `/explore/:id`. Navigation, footer, prompts, Compose mappings and media grants remain owned by their existing modules. Downloaded fixtures are test-only imports, not catalog data.

## Adapter mapping

| Existing data | View model |
|---|---|
| ID, title, curated film/year/scene, description | Identity, subtitle, technique; collection-relative index and previous/next |
| Reviewed `film` + source/embed match + unexpired grant | Official facade; YouTube privacy-enhanced host; existing start/end retained; expiry rechecked on click and while open |
| Missing or expired cleared film | Footage pending; no candidate upgraded into an embed |
| Source upload duration | Full-upload timeline; card selection duration remains separate |
| Curated parameter rows or existing Finding values | Parameters; unavailable/unknown badges; family mapped by label |
| Negative constraints | Short separated chips; original prompt untouched |
| Movement category and authored parameter text | Relative plan/elevation geometry, with explicit illustrative defaults |
| Record confidence | Strong/moderate/weak/insufficient status (no promotion from prose) |
| Evidence prose | De-duplicated empty-claims body; no invented 0–5 strengths |
| Source, license, research and related controls | Source cards; raw URL text removed but destination retained |
| Prompt and current Compose route | Exact copy and unchanged parameter handoff |

## Defaults / records needing authored structured claims

Every current record lacks explicit claim-level numeric strengths. All therefore use `claims: []` and retain available evidence prose, or the existing no-footage sentence:

- `dolly-in`, `dolly-out`, `tracking`, `pan`, `tilt`, `orbit`, `crane`, `handheld`, `static`: movement from category/slug; all geometry defaults to eye/medium/normal/open. Findings remain unavailable. Tracking is lateral.
- `film-discovery-05`: following track; low height, wide view, corridor from authored rows; medium distance default.
- `film-discovery-10`: static illustrative geometry only; explicitly states this does not depict dolly zoom. Eye/medium/normal/open defaults.
- `film-discovery-02`: static; eye/medium/normal/open defaults (no measured production geometry).
- `film-discovery-01`: static; corridor from authored rows; eye/medium/normal defaults.
- `film-discovery-11`: following track, wide view from authored rows; eye/medium/open defaults.
- `film-discovery-13`: pan; eye/medium/normal/open defaults.

## Data and supplied-code corrections

- Shining repeated its scene-review prose under both observations and inference evidence. The adapter renders that paragraph once; stored review history remains untouched. No sample-fixture claims or confidence ratings are shipped as facts.
- Full upload duration (148s) and selected range duration (18s) were conflated in presentation. Both are now separately retained.
- Collection link still said “CURATED FOUR”; corrected to six.
- Supplied copy handler announced success on failure; now reports failure honestly and ignores async completion after disposal.
- Supplied renderer omitted expiry, offscreen/hidden-tab pause and iframe disposal; these protections are retained.
- Protocol-relative URLs are rejected. Supplied TypeScript was adapted to strict optional/index checks.
- Supplied pink section-number text conflicted with the brief's “pink never text” rule; numbers use ink.
- No remote poster is requested on this detail facade before intent. The diagram and player graphic remain original; approved grid media behavior is unchanged.

## Validation

TypeScript, ESLint, 177 tests, production build and release/privacy audits pass. Browser: all 15 `/clips/*` aliases render four shared sections at 375px with no horizontal overflow or initial iframe. Plan/Elevation swaps the SVG, exact clipboard copy succeeds, and the explicit-click Shining player uses youtube-nocookie with start=0/end=18 and visibly plays. Source grants remain unchanged. No deployment.
