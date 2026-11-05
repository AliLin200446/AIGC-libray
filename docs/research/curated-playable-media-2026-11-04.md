# Curated playable media — 2026-11-04

This follow-up supersedes the earlier report's zero-public-projection outcome. The latest user request authorizes attaching supported media to the public-facing local prototype. No deployment has taken place. The private queue, candidate statuses, processing permissions and other ten records remain private and unchanged apart from audit entries for the two prepared projections.

## Actual results

| Reference | Source / publisher | Result |
| --- | --- | --- |
| The Shining (1980), Danny’s tricycle corridor | https://www.youtube.com/watch?v=CMbI7DmLCNI · Movieclips | Attached. Actual playback tested in Admin and Explore detail. Opening passage tracks at low height behind Danny; source is a full 2:28 scene with cuts, not an isolated continuous shot. |
| Vertigo (1958), staircase | https://www.youtube.com/watch?v=GjPCk494e5Q · Movieclips | Private candidate retained. Official oEmbed metadata still available; earlier playback/film/bell-tower match reviewed. Exact dolly-zoom passage remains unverified. No new public-display projection. |
| The Grand Budapest Hotel (2014), symmetry | https://www.searchlightpictures.com/thegrandbudapesthotel/ · Searchlight Pictures | Distributor page lists an official clip, but no supported playable video URL was recovered. Scene, embedding and display basis remain unverified. Schematic retained. |
| In the Mood for Love (2000), doorway occlusion | https://www.youtube.com/watch?v=AfZbh4cteqI · CRITERION | Attached. Actual playback tested. Criterion Three Reasons montage contains the reviewed window/doorway foreground occlusion; it is not a verified continuous corridor/noodle-shop sequence. The prior 00:26 timestamp did not reproduce the claimed doorway image (it showed eating). Playback starts at 0; exact corridor scene/timestamp remain unverified. Count: two playable sources, one exact requested scene match and one related montage. |

The two attached records reuse their existing IDs and curated prompts. No third-party video files or thumbnails are downloaded into the repository. YouTube's exact oEmbed thumbnail URLs are remotely displayed as attributed video previews, not as licensed standalone film stills. Other cards retain the original schematics. Cards navigate to details; players load on explicit intent, with no grid autoplay. A small play affordance appears on hover/keyboard focus.

## Scope and supporting sources

- YouTube Terms: https://www.youtube.com/static?template=terms — Permissions and Restrictions explicitly permits showing videos through the embeddable player; License to Other Users is limited to service-enabled features. This is the platform embedding basis, not a separate film copyright license or a guarantee of worldwide availability.
- Official embed instructions: https://support.google.com/youtube/answer/171780 . Provider controls, links and branding remain intact.
- Movieclips provenance: https://editorial.rottentomatoes.com/article/rotten-tomatoes-and-movieclips-are-joining-forces/ . Exact source attribution was returned by the existing official oEmbed adapter and shown in the working player.
- Criterion provenance and Three Reasons listing: https://www.criterion.com/films/198-in-the-mood-for-love . The official oEmbed result attributes the exact upload to CRITERION.
- Provider-supplied thumbnail role: https://oembed.com/ section 2.3.4; YouTube attribution/data/display restrictions: https://developers.google.com/youtube/terms/developer-policies . Remote preview only, attributed YouTube, linked to the exact embedded video; no extracted frames, local caching, or standalone image reuse.

The explicit sanitized manifest records these conditional display bases separately from the private Admin grants. It expires on 2026-12-04 for internal re-review (not a claimed provider license expiry). Expired or missing video grants exclude the record; expired or wrong-video thumbnail grants fall back to the schematic. To revoke a prepared source immediately, remove its entry or revoke its publicDisplayGrant in src/references/film-publication.json and rebuild. Private Admin review is not an automatic publication pipeline.

No downloading, trimming, rehosting, AI processing, publishing to a remote site or deployment performed. YouTube search credentials remain unavailable; the existing metadata adapter was reused for all three stored URLs. General web search and the official Searchlight page did not yield a supported fourth source. No successful API search or scene match was fabricated.

## Validation

TypeScript, ESLint, 173 tests and production build passed, including private-data exclusion and release audits. New regression checks cover two selected IDs, four unique curated cards, absent/expired display grants, missing playback review, expired thumbnails and mismatched thumbnail/video IDs. The existing bundle-size warning remains.
