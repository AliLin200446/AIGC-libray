/**
 * Two reference view models — one per page variant. Use them as the target
 * shape when writing the adapter, and as test fixtures. Not production data.
 */
import type { ClipPage } from './clip-model';

/** Film study with the official player (FILM-DISCOVERY-05). */
export const shining: ClipPage = {
  id: 'film-discovery-05',
  collection: 'Film discovery',
  index: 5,
  title: 'The Shining',
  subtitle: '1980 · Danny’s tricycle corridor',
  technique: 'Tracking shot',
  tags: ['Low height', 'Rear follow'],
  media: {
    kind: 'official',
    provider: 'youtube',
    embedUrl: 'https://www.youtube-nocookie.com/embed/CMbI7DmLCNI',
    pageUrl: 'https://www.youtube.com/watch?v=CMbI7DmLCNI',
    uploadTitle: 'The Shining (1980) – Come Play With Us Scene (2/7)',
    channel: 'Movieclips',
    durationSec: 148,
    studied: { start: 0, end: 23, label: 'Corridor passage' },
    marks: [{ at: 23, label: 'Rear view meets two girls' }],
    containsCuts: true,
  },
  status: {
    media: 'Official upload. Rights stay with source.',
    parameters: 'Authored direction, not measured.',
    evidence: 'moderate',
  },
  setup: {
    kind: 'track-follow', height: 'low', distance: 'medium', fov: 'wide', environment: 'corridor',
    subjectLabel: 'Subject · tricycle', cameraLabel: 'Camera · centered',
  },
  params: [
    { family: 'camera', label: 'Camera movement', value: 'Low following track behind a moving subject', status: 'authored' },
    { family: 'composition', label: 'Framing', value: 'Medium-wide rear view; corridor converges around the subject', status: 'authored' },
    { family: 'composition', label: 'Subject position', value: 'Centered; steady camera-to-subject gap', status: 'authored' },
    { family: 'lens', label: 'Lens', value: 'Wide field of view as a creative choice', status: 'unknown' },
    { family: 'camera', label: 'Movement speed', value: 'Smooth, matched to the subject’s travel', status: 'authored' },
    { family: 'composition', label: 'Spatial relationships', value: 'Nearby doorframes pass faster than distant corridor features', status: 'authored' },
  ],
  negatives: ['Zoom', 'Overtaking', 'Sudden pan', 'Cuts', 'Exaggerated shake'],
  prompt: 'A continuous low tracking shot follows a child riding a tricycle through a long corridor. Keep a medium-wide rear view with the rider centered, the camera near wheel height, and a steady gap behind the subject. Use a wide field of view to retain the floor, nearby doorframes and distant vanishing point, without prescribing an exact focal length. Match the rider’s measured pace with smooth forward translation and gentle turns; nearby doorframes should pass faster than distant architectural features. Keep focal length fixed. No zoom, overtaking, abrupt acceleration, cuts, exaggerated shake or impossible passage through walls.',
  composeHref: '/compose/workspace?shot=1&clip=film-discovery-05',
  claims: [
    { claim: 'Medium-wide rear view, rider centered', note: 'Visible across the corridor passage before 00:23.', status: 'observed', strength: 4 },
    { claim: 'Low following track behind the subject', note: 'Supported by successive viewpoint changes at low height, not by any single frame.', status: 'inferred', strength: 3 },
    { claim: 'Film and scene identity', note: 'Matched against visible content and the Movieclips attribution.', status: 'observed', strength: 4 },
    { claim: 'Exact rig, speed and focal length', note: 'Not recoverable from this upload.', status: 'unverified', strength: 0 },
    { claim: 'One continuous 148-second take', note: 'The 2:28 upload includes cuts, so it is not an isolated take.', status: 'not-supported', strength: 0 },
  ],
  inspection: { method: 'Browser inspection · official player', date: '2026-11-04' },
  sources: [
    { role: 'Media · official upload', title: 'The Shining (1980) – Come Play With Us Scene (2/7)', publisher: 'Movieclips · YouTube', url: 'https://www.youtube.com/watch?v=CMbI7DmLCNI' },
    { role: 'Technique research', title: 'The Steadicam and The Shining, Revisited', publisher: 'American Cinematographer · ASC' },
  ],
  rights: 'The Shining © its rights holders. Framefield links to the official upload and stores no frames. Parameters on this page are authored creative directions, not recovered film measurements.',
  backHref: '/clips',
  prev: { href: '/clips/film-discovery-04', label: '04' },
  next: { href: '/clips/film-discovery-06', label: '06' },
};

/** Schematic study with footage pending (/clips/tracking). */
export const trackingSchematic: ClipPage = {
  id: 'tracking',
  collection: 'Schematic',
  title: 'Tracking',
  tagline: 'Move beside the subject. Hold the distance.',
  technique: 'Tracking shot',
  tags: ['Lateral', 'Eye level'],
  media: { kind: 'pending' },
  status: {
    media: 'Original CC0 schematic. No footage.',
    parameters: 'Unavailable until footage is reviewed.',
    evidence: 'insufficient',
  },
  setup: { kind: 'track-lateral', height: 'eye', distance: 'medium', fov: 'normal', environment: 'open', subjectLabel: 'Subject · walking' },
  setupNote: 'Intended motion only. The diagram shows the brief, not an analysis of footage.',
  params: [
    { family: 'camera', label: 'Camera movement', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'composition', label: 'Shot size', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'camera', label: 'Camera angle', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'lens', label: 'Lens', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'camera', label: 'Subject movement', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'camera', label: 'Movement speed', value: 'Unavailable · footage required', status: 'unavailable' },
    { family: 'light', label: 'Lighting', value: 'Unavailable · footage required', status: 'unavailable' },
  ],
  negatives: [],
  prompt: 'A continuous lateral tracking shot alongside a person walking at an even pace through a bright colonnade. Maintain eye-level medium framing and a consistent distance from the subject. Let nearby columns pass across the foreground while the background moves more slowly. Use soft high-key daylight and smooth camera translation with a fixed focal length.',
  promptNote: 'Creative direction · no focal length or technique verified',
  claims: [],
  claimsEmpty: 'No footage reviewed. No visual observations recorded, and no production techniques inferred. Category tags are discovery labels only.',
  sources: [{ role: 'Schematic artwork', title: 'Framefield — original geometric study', publisher: 'CC0-1.0 · schematic artwork only' }],
  rights: 'Original schematic posters are dedicated to CC0. No video is included or licensed. Replace with cleared footage and its specific rights metadata.',
  backHref: '/clips',
  prev: { href: '/clips/dolly-out', label: 'Dolly out' },
  next: { href: '/clips/pan', label: 'Pan' },
};
