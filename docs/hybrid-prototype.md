# Six-card hybrid prototype

Default Explore contains exactly six cards. Existing film records are not renamed, duplicated, deleted or newly cleared. The other four film-study URLs remain accessible in All camera studies.

| Card | Type | Cover | Playback | Compose |
|---|---|---|---|---|
| The Shining / Danny tricycle | Film, existing reviewed source | Honest typography; no cleared scene cover | Existing official 0–18s embed | Centered, static fallback; tracking unsupported |
| Vertigo / Bell Tower | Film source-link study | Honest typography; no cleared scene cover | External source link only; no public grant added | Centered, static fallback; dolly zoom unsupported |
| Courtyard / approach | Original FRAMEFIELD rendered demonstration | Frame 48 of dolly.mp4 | Muted hover, native detail player | Dolly + centered |
| Colonnade / lateral passage | Original FRAMEFIELD rendered demonstration | Frame 48 of tracking.mp4 | Muted hover, native detail player | Centered; tracking unsupported |
| Gallery / horizontal reveal | Original FRAMEFIELD rendered demonstration | Frame 48 of pan.mp4 | Muted hover, native detail player | Centered; pan unsupported |
| Terracotta / orbit | Original FRAMEFIELD rendered demonstration | Frame 48 of orbit.mp4 | Muted hover, native detail player | Centered; orbit unsupported |

Original clips are silent six-second 768×432 H.264 renders of project-created geometry, not stock footage, movie scenes, photoreal captures or AI-generated film analysis. Each camera path is explicit in `scripts/render-original-demos.py`; no footage, stills or streams were downloaded. Project provenance and authorized use are bundled in `public/media/originals/PROVENANCE.txt`. Poster images come from the same rendering, not an unrelated illustration. Four videos total approximately 736KB plus 104KB of posters.

No external provider credentials are needed for these originals. No new film download, editing, public-display or AI permissions were inferred. Original assets are tracked separately from the private film queue; private records stay private.

## Validation

- Browser: all four hosted hover previews advanced with muted playback; only one active at a time. Leaving restored pause, time zero and poster state.
- All six production detail routes, exact clipboard copies, Compose navigation and back navigation passed.
- Native original-video detail playback advanced with duration 6 seconds and no media error.
- Reduced-motion, offscreen, failure and single-active behavior are covered by existing automated media lifecycle tests. Mobile uses static posters and tap-to-open.
- TypeScript, lint, full tests and production build/privacy audits run; no deployment performed.

Local entry: http://127.0.0.1:5186/explore . Browser-visible poster/video assets are original project content. Film cards intentionally do not pretend to have cleared film stills.
