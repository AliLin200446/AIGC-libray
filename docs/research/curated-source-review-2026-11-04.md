# Curated film source review — 2026-11-04

## Outcome

Three existing official-player sources were confirmed playable in the permitted local Admin context. Two match the intended technique: The Shining’s following track and In the Mood for Love’s foreground occlusion. Vertigo’s film and bell-tower scene match, but its dolly-zoom moment remains unverified. No supported Grand Budapest video was found in the existing records.

No new YouTube search was possible: `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_IDS` are empty. The existing discovery adapter’s documented fallback was run for all four IDs. Official oEmbed metadata was refreshed using the existing `videoMetadata` function; it returned video IDs, canonical URLs, titles, publishers and thumbnail URLs, but no durations. Durations below were read from the official player UI. No footage or thumbnail files were downloaded, and no AI analysis requests were made.

| Film / existing ID | Scene | Source / publisher | Scene and technique review | Embed / duration | Display rights / attachment | Thumbnail | Prompt |
|---|---|---|---|---|---|---|---|
| The Shining / film-discovery-05 | Danny’s tricycle corridor / Come Play With Us | [CMbI7DmLCNI](https://www.youtube.com/watch?v=CMbI7DmLCNI) · Movieclips | Film/scene verified. Opening views before 00:23 support low following tracking; at 00:23 the rear view faces two girls. Physical rig and exact lens unverified. | Playback confirmed · 2:28 | Existing attachment retained privately; local Admin embed grant only. Public display blocked pending separate documented approval. | [Official oEmbed thumbnail](https://i.ytimg.com/vi/CMbI7DmLCNI/hqdefault.jpg), metadata available; separate public image display not verified | Curated Camera Prompt complete |
| Vertigo / film-discovery-10 | Bell tower | [GjPCk494e5Q](https://www.youtube.com/watch?v=GjPCk494e5Q) · Movieclips | Film/scene verified from mission/tower content. Technique **unverified**: no temporal verification of the dolly-zoom moment. | Playback confirmed · 2:53 | Existing attachment retained in private review; public display blocked. Preview start restored to 0 after inspection. | [Official oEmbed thumbnail](https://i.ytimg.com/vi/GjPCk494e5Q/hqdefault.jpg), metadata only | Curated Camera Prompt complete; exercise, not verified capture settings |
| The Grand Budapest Hotel / film-discovery-02 | Hotel interior / symmetrical composition target | No supported video URL. [Searchlight source page](https://www.searchlightpictures.com/thegrandbudapesthotel) · Searchlight Pictures | **Scene Unverified**; title/production page is not evidence of the requested shot | No embed; duration unavailable | Source link retained. No attachment or display grant. Missing API configuration prevents new search. | No video thumbnail available | Curated Camera Prompt complete |
| In the Mood for Love / film-discovery-01 | Window/doorway passage in Three Reasons montage | [AfZbh4cteqI](https://www.youtube.com/watch?v=AfZbh4cteqI) · CRITERION | At approximately 00:26 a vertical foreground frame conceals one side of the man’s head/shoulder while his face stays readable. Occlusion/framing verified for this composition. Not a verified continuous corridor/noodle-shop sequence; no camera motion inferred from the still composition. | Playback confirmed · 1:22; provider start 26s | Existing attachment retained privately; local Admin embed grant only. Public display blocked. | [Official oEmbed thumbnail](https://i.ytimg.com/vi/AfZbh4cteqI/hqdefault.jpg), metadata only | Curated Camera Prompt complete |

## Rights and public prototype

The three existing grants explicitly cover conditional local Admin embedding only, with a 2026-11-25 internal re-review deadline. They do not authorize public FRAMEFIELD display, downloading, rehosting, editing or third-party AI processing. All four records remain candidates. No grants, approval status or publication manifest were changed.

Explore retains the four designed schematic placeholders and source links. The current curated prompts, Copy Prompt and supported Compose mapping remain available. Provider thumbnails appear only as metadata unless a relevant display basis is verified; the provider’s own player retains its native preview. Nothing was scraped from arbitrary image sites.

## Saved review and small workflow corrections

- Reused existing record IDs and the three already attached URLs; no duplicate records or replacement imports.
- Saved separate playback, scene-match and technique-match results through the existing review workflow. Admin no longer conflates a playing video with a verified technique.
- Added source-specific observations and moderate-confidence interpretations only for the two matched techniques; no exact focal lengths or rigs claimed.
- Synchronized the four authored prompts into the existing private records, explicitly marked Curated Camera Prompt in their short labels. The public detail sections remain labeled Curated Camera Prompts.
- Discovery now reuses a current-source, explicitly scene-and-technique-reviewed candidate before making another search. It does not turn prior playback into a rights grant or a current availability guarantee.
- Rights/status snapshots were checked during the update: unchanged. All twelve records remain present.

## Validation

TypeScript, lint, all 171 tests, and production build passed, including production privacy and release audits. The regression covers playback without scene verification, source reuse with a configured mock API and no network request, preservation of candidate state, and no rights grants. Browser checks confirmed all three existing players, saved review evidence, displayed durations and separate statuses. Public placeholders and rights gates remain intact.

No deployment or submission performed. Live Muse and third-party film analysis remain disabled.
