# Film covers and hover previews — 2026-11-04

Result: **zero cleared, scene-matched film covers added; zero film hover previews; one working attached detail player.** This is a content/permissions blocker, not a completed real-film-cover library. No download, extraction, processing, AI submission, publication or deployment took place.

Existing private records, public manifest and official oEmbed adapter were rechecked. TMDB and YouTube search configuration are absent. All six official oEmbed lookups succeeded; these prove provider metadata availability, not scene correctness or usage permission. The private queue has no cover grants on these films and only existing local embed grants for Shining, Vertigo and Mood. No permission scopes were changed.

| Film | Actual provider-returned thumbnail candidate (withheld) | Scene / cover blocker | Cover available | Hover | Attached detail playback | Display rights |
|---|---|---|---|---|---|---|
| The Shining | https://i.ytimg.com/vi/CMbI7DmLCNI/hqdefault.jpg | Twins cover mismatches selected 0–18s tricycle passage; removed previously | No | Unavailable | Working | Existing conditional video embed verified; this scene cover not cleared |
| Vertigo | https://i.ytimg.com/vi/GjPCk494e5Q/hqdefault.jpg | Tower source exists; exact zoom interval and public image permission unresolved | No | Blocked | Unavailable | Public display unverified; local embed grant only |
| Grand Budapest Hotel | https://i.ytimg.com/vi/QklK1xKA1FI/hqdefault.jpg | New Lobby Boy facade alternative; public source/thumbnail review pending | No | Blocked | Unavailable | Unverified |
| In the Mood for Love | https://i.ytimg.com/vi/AfZbh4cteqI/hqdefault.jpg | Related montage; requested corridor passage unresolved | No | Blocked | Unavailable | Existing montage grant does not establish requested-scene match or clear a new scene cover |
| Goodfellas | https://i.ytimg.com/vi/KczaVhsrsH4/hqdefault.jpg | Cinematico uploader authorization and long-take match unresolved | No | Blocked | Unavailable | Unverified |
| Seven Samurai | https://i.ytimg.com/vi/8V4dEWPJKNk/hqdefault.jpg | Criterion montage; exact sustained pan and public thumbnail approval pending | No | Blocked | Unavailable | Unverified |

“Unavailable” in the detail column means absent from the public reference page, not proof the provider URL fails. Earlier candidate playback tests are documented in `six-reference-review.md`. No placeholder is counted as a film cover.

## Implementation

- Curated cards without cleared media covers now use neutral, explicitly labeled empty frames instead of schematic artwork. Original nine camera-study diagrams remain untouched. Grid proportions, navigation, detail rendering and permissions are unchanged.
- Cleared film thumbnails retain exact provider URL validation and independent expiry checks; failed/revoked images fall back with honest labels. No runtime discovery requests.
- Authorized hosted-video previews retain lazy loading, muted loop and playsInline. Added time reset and poster restoration on leave/offscreen/reduced motion, exclusive active preview and visible loading-failure handling. Touch events never invoke hover playback through the existing card handler.
- YouTube remains a static-cover/play-affordance path with playback in the detail page. The existing three-column cards can be shorter than YouTube's 200px minimum embedded-player height. Inserting an interactive iframe inside the card link would also compete with tap/click navigation. No hidden-branding or extracted-stream workaround was added.

Official requirements checked: https://developers.google.com/youtube/iframe_api_reference (minimum 200 × 200 viewport, playback/autoplay event handling) and https://developers.google.com/youtube/terms/required-minimum-functionality (player identity and functionality). No evidence supports enabling reliable hover playback inside the current unchanged card dimensions.

## Next required content actions

Use the existing Admin review workflow to attach an exact-scene source and a separately cleared provider thumbnail. Shining needs a provider-supplied cover that depicts its selected passage; do not invent an alternate thumbnail path or extract a still. Other records need their scene/public-display reviews completed. A hosted hover preview additionally requires authorized hosting/download rights (and editing rights if creating a derivative), independently of embedding, thumbnails and AI processing. API credentials improve discovery but grant none of these rights.

Validation: TypeScript, lint, 177 automated tests and production build/privacy checks pass. Automated media lifecycle checks cover lazy source assignment, play, pause/reset, reduced motion, offscreen stop, failure, revocation and exclusive playback; they use an explicitly synthetic media stub, not a claimed film preview. Browser verified six cards, no eager iframe or remote film-image requests through the rendered elements, 390px no overflow, card-to-detail navigation and actual Shining playback after pressing the provider Play button. There is no authorized hosted film file for a real-browser hover test. Detail player minimum height is now 200px on phones to meet the official embed minimum; card proportions are unchanged.
