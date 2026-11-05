# Camera Instrument → Try the Shot

P2 remains the original instrument at `/` (also available through `/compose?workspace=1`). Its frame, ruler, side labels, captions and interactions are unchanged. A centered TRY THE SHOT link follows the instrument/caption section.

P1 is `/compose?shot=1`, an opt-in workspace presentation of the existing `renderPlayground` component. It uses the same Three.js factory, controls, prompt generator, replay and lifecycle. There is no duplicate component or second scene. The existing `/compose` centered route remains unchanged.

The link encodes current selected focal length (24–85mm, including fractional values), supported composition and forward dolly/static motion. Timing and travel use the existing 6s/1m defaults because P2 supplies no matching controls. Orbit, pan, tilt, editable objects, physical camera placement, framing-lock compensation and other unsupported settings are not represented as transferred workspace controls. Values are validated on direct URL visits. Existing clip/film reference mappings take precedence and are unchanged.

P2 stores its supported settings on its own history entry for restoration. P1 already stores edited controls in history. Normal same-tab navigation handles Back/Forward. The new workspace starts at the top; pagehide disposes the scene or pauses it for bfcache, and pageshow resumes a cached scene. No polling or new render loop was added.

## Repository/screenshot difference

The supplied screenshot has a preset strip and playback timeline. The current repository component instead has the continuous lens ruler and Replay Camera Move button. This task reuses those existing controls; it does not fabricate a scrub timeline or add unsupported 135mm optics. Both existing interfaces and their functionality are retained. The side-by-side workspace arrangement is scoped to `shot=1`.

## Validation

182 automated tests, TypeScript, lint and production build/privacy audits pass. Tests cover fractional lens transfer, composition/motion, prompt and recipe synchronization, invalid values and non-interference with reference routes. Browser handoff at 85mm confirmed matching control, preview telemetry and prompt; Back/Forward retained the workflow and one scene canvas. Direct default workspace and responsive behavior checked separately. No deployment.

## P1 layout correction

P1 means the original Camera Instrument; P2 means Try the Shot. The P1 workspace-tools row is removed from the DOM, without removing underlying routes or scene tools. The frame keeps its 8:5 ratio and is centered in the full page, with equal side-control widths. A ResizeObserver measures the header for viewport-height fitting and is disconnected on disposal. Side controls stay visible, moving beneath the frame on mobile.

Validated at 1440×900, 1366×768, 1280×720, and 390×844: no horizontal overflow; full frame and ruler visible; one scene canvas. Existing camera vocabulary remains Pan, Tilt, Dolly, Orbit. The supplied image’s low/high-angle presets are not present in the current control model, so no angle transfer is claimed.
