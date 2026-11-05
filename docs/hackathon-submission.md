# FRAMEFIELD — Hackathon submission materials

Prepared 2026-11-04. No deployment or hackathon submission performed. Confirm organizer eligibility, required links and deadline in the submission portal; the user reports 9 PM ET tonight.

## Project description

FRAMEFIELD turns visual inspiration into editable camera intent. Its cinematic study library connects reference playback, evidence, camera parameters and reusable generative-video prompts. A live Three.js instrument lets creators explore composition, lens choices and supported camera movement while the prompt stays synchronized.

AI Analyze adds real Meta Muse Glimmer 30B image understanding through NVIDIA NIM. Upload an authorized screenshot, inspect observations and uncertain interpretations, choose creative camera settings, copy a prompt, and transfer supported settings into Try the Shot. The system distinguishes visible evidence from inference: one still does not establish camera motion or a measured focal length.

The prototype combines two film studies with four original motion demonstrations. Official embeds remain permission-gated; unavailable film media uses honest schematics or source links. FRAMEFIELD does not download movie footage, generate video, or claim to reconstruct the original physical camera rig.

## Meta AI integration explanation

The Node endpoint `/api/analyze` sends a validated, resized image to NVIDIA NIM's chat-completions API using `meta/muse-glimmer-30b`. `NVIDIA_API_KEY` stays server-side. Meta returns structured visual readings covering composition, subject position, shot size, apparent camera angle, perspective, foreground/background relationships, lighting and depth cues where supported.

FRAMEFIELD validates that response against its `AnalysisResult` contract, labels observations/inferences/unknowns and confidence, and deterministically assembles prompt fragments. The user can deselect readings and adjust creative composition, focal length and intended movement. Supported controls transfer into the existing Three.js workspace; unsupported properties remain notes. Model output is treated as data, never executable code.

The real application integration passed a local browser walkthrough with an original geometric image: successful model response, correct subject/background description, exact clipboard output, camera-state transfer and synchronized workspace prompt. This is actual Muse Glimmer inference, not Muse Spark and not a simulated UI. Responses remain nondeterministic; malformed readings are disclosed/omitted and unusable responses produce a retryable error. See `live-analysis-validation.md` for the complete QA record, including failed development requests.

## Demo script — target 2 minutes 45 seconds

Use the local production build. Prepare one original/authorized image before recording. Keep credentials and Admin out of the recording. Do not submit copyrighted film imagery for AI analysis merely because it can be embedded.

**0:00–0:20 — Problem and Explore.**
“Visual references are easy to collect but hard to translate into precise camera instructions. FRAMEFIELD connects references, evidence and editable camera intent.” Show the six studies. Open an original demonstration, play it briefly and point out its authored prompt and attribution.

**0:20–0:35 — Start the real AI request.**
Open AI Analyze, choose the prepared image and click Analyze image. “This sends my authorized still to Meta Muse Glimmer 30B through NVIDIA NIM. The key stays on the server.” Show the real indeterminate processing state.

**0:35–1:20 — Explain while it processes.**
“One frame can show subject placement and depth cues, but it cannot prove camera movement or an exact lens. FRAMEFIELD separates observations from inference. Movement and lens settings remain creative choices.” Keep the processing visible; describe the original demonstrations and the twelve-control Index without navigating away from the pending request. Do not invent a percentage or promise a response time.

**1:20–1:50 — Inspect the real result.**
Show actual model attribution, image and readings. Compare a reading to the image, point out confidence/uncertainty, and deselect an unsuitable fragment if necessary. Choose Dolly, a creative 35 mm lens and a supported composition. “These are choices for a new shot, not measured production metadata.” Show the prompt updating.

**1:50–2:25 — Try the Shot.**
Click Copy Prompt and show confirmation; paste into a prepared scratch editor if recording permits. Click Try the Shot. Show the transferred lens/composition/dolly controls and live scene. Change composition and show the synchronized workspace prompt. Explain that the preview is a canonical scene, not image reconstruction.

**2:25–2:45 — Close honestly.**
“The result is a reusable camera prompt, backed by visible evidence and editable intent. The MVP supports still-image analysis and a focused set of camera controls; it does not generate video.”

If the provider is slow or fails, show the actual error. Use an existing recorded successful run only if clearly labeled as recorded; do not portray a fixture as live inference. Rehearse once and keep the final recording under three minutes.

## Working versus incomplete

Working locally: six-study library, original motion playback, evidence and authored prompts, twelve-control Index, camera instrument, Try the Shot, real image analysis, validated readings, prompt copying and supported parameter transfer.

Incomplete/limited: generated video, temporal analysis from footage, exact physical-camera recovery, full scene reconstruction, all motion types in the workspace, distributed rate limits and retained uploaded-image history. Provider output can be wrong or rejected. Film sources remain subject to scene matching, permission and availability constraints.

## Submission links and actions

- Public code: https://github.com/AliLin200446/AIGC-libray
- Local entry: http://127.0.0.1:5194/explore
- Local AI flow: http://127.0.0.1:5194/analyze
- Public deployment target: https://framefield.alilinlab.com — the newly frozen build has not been deployed or verified there; do not claim otherwise.

Remaining owner actions: record/upload the demo, provide any organizer-required public deployment after separately authorizing it, configure the hosting secret if deployed, verify submission rules and complete the form before the deadline. Do not put a localhost URL into a field requiring a publicly accessible demo.
