# Compose V1 — canvas blocking

Supersedes the three-anchor V0 interface. Compose edits the same deterministic Three.js world used by Explore, Lens, Camera, Composition and Reference's Apply Demo. No uploaded assets or backend scene storage.

## Interaction

Choose Block, Plane or Frame, then click/tap the ground. A raycast ghost follows the pointer before placement. The scene always contains one primary Subject; its palette item and deletion are disabled. The limit is eight objects, including the canonical three.

Drag an object over the ground to move X/Z. Ground positions snap to 0.25m; hold Alt for free placement. The selected object has height, yaw and uniform-scale handles. Yaw lightly snaps within 3° of 45° intervals. Arrow keys move 0.25m (Shift: 1m), brackets rotate 5°, Delete/Backspace removes non-subject objects, and Escape cancels placement/deselects. Typing fields retain normal keyboard behavior.

The collapsed Precision strip provides selection, label and numeric X/Y/Z/yaw/scale alternatives. Labels do not change semantic roles. Objects can overlap; no physics or collision handling. Position limits: X/Z ±14m, Y 0–6m; scale 0.25–3. Pointer capture and canvas-local touch-action support mouse, pen and touch ground dragging; real-device touch validation remains a manual check.

## Camera and measurements

Plan is an optional top-down diagram of live object/camera positions and actual perspective FOV. Drag its camera marker to position the active PerspectiveCamera; numeric X/Z and a 0.3–2.5m height slider are alternatives. Camera placement targets the primary subject and keeps at least 0.75m horizontal separation. The plan reports Euclidean camera-to-anchor distance, yaw and pitch; selection adds object distance and relative bearing.

One scene unit is one meter in this deterministic demo only. The grid marks 1m intervals. These measurements do not describe generative-model calibration or capture metadata. Standalone two-point measurement is deferred; camera-to-object measurement is available in Plan.

Lens retains 24–85mm, using distance compensation around the semantic subject. A manually placed camera retains its direction during lens changes. Camera and composition demonstrations transform the camera only. Compose retains the chosen view when leaving a control to edit objects.

## Ownership and resets

`createComposeState` owns object identity, transforms and primary-subject protection. `scene.ts` owns the actual camera's target/current animation poses. The version-1 diagnostic snapshot combines objects, primarySubjectId and that camera; no second camera model or focal-length store is introduced. Scene data survives mode switches within the mounted page. Reloading starts the canonical scene; no localStorage migration is needed.

- Reset Control: neutral 50mm camera/composition, keep objects.
- Reset Camera: canonical camera placement at the current focal length, keep objects.
- Reset Scene: restore the three canonical objects, keep camera placement.

Tests cover primitive creation, limits, subject protection, transforms, semantics, raycasting, grid snapping, keyboard deltas, plan mapping, bounded camera placement, distances, optics, camera motion, composition, state version and mode persistence. Browser checks cover placement, drag, handles, precision editing, plan dragging, lens compensation and responsive layout.
