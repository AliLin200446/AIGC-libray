# One-screen Camera Instrument and Try the Shot

P1 is `/`; P2 is `/compose?shot=1`. No deployment performed.

## Cause and correction

Previously P1 fitted only its camera frame, then added 220px of editorial clearance, a 134px CTA row and footer below it. P2 sized its preview from column width and appended the prompt and secondary links underneath. Neither layout budgeted the whole application height.

Desktop now uses a single 100dvh app grid with an automatic header row and a minmax(0,1fr) content row. P1 includes separate ruler, contain-sized frame, editorial, CTA and footer rows. P2 places the prompt below the preview in the left column and controls in the right column. Existing 8:5 frames use size-container units to fit available width and height. No overflow-hiding workaround is used. The existing Three.js ResizeObserver updates renderer size, camera aspect and projection; the renderer is not recreated on resize.

Mobile retains document scrolling, readable controls and a complete frame. P2 retains its existing Replay action; there is no scrub timeline in this implementation.

## Browser measurements

At 1440×900 before the change, P1 document height was 1288px (CTA bottom 1228px) and P2 was 1308px (Copy bottom 1029px).

| Viewport | P1 document height | P2 document height | P1 CTA bottom | P2 Copy bottom |
| --- | ---: | ---: | ---: | ---: |
| 1920×1080 | 1080 | 1080 | 1042 | 878 |
| 1440×900 | 900 | 900 | 862 | 684 |
| 1366×768 | 768 | 768 | 730 | 552 |
| 1280×720 | 720 | 720 | 682 | 504 |
| 390×844 | 1155 | 1767 | 994 | 1343 |

Detailed header, main, footer/action-row, frame and button rectangles are in `viewport-fit-measurements.json`. P2 has no footer component; its secondary action row is recorded as footer. No horizontal overflow at any size. Exactly one scene canvas per page. Desktop frames remain 8:5 and fully visible. Mobile scrolling is intentional.

## Interaction and checks

Verified 85mm handoff through the visible CTA, Dolly control and synchronized prompt, Replay, exact clipboard content after Copied confirmation, Reset to Default, direct URL loading and Back/Forward. TypeScript, ESLint, all 182 tests, production build, privacy check and release audit pass. Existing large Three.js bundle warning remains.

## Changed implementation files

- src/library/instrument/home.ts — separate ruler/frame/editorial layout rows, reuse the existing scene workspace.
- src/library/instrument/instrument.css — desktop viewport shell, contain sizing and mobile flow.
- src/playground/page.ts — place the existing prompt within the shot workspace grid.
- src/playground/playground.css — budget title, preview, controls, prompt and actions together.
- src/pixel/pixel.ts — prefer the dedicated focal-number source after DOM reordering, avoiding punctuation from the lens label.
