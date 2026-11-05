/**
 * Framefield — clip page view model (R1)
 * Every clip detail page (schematic studies and film studies) renders from
 * this one shape. Write an adapter from the repo's existing clip data to it;
 * never let the renderer read raw clip records directly.
 */

export type MovementKind =
  | 'track-follow'   // camera behind (or ahead of) a moving subject, same axis
  | 'track-lateral'  // camera beside a moving subject, parallel travel
  | 'dolly-in'
  | 'dolly-out'
  | 'pan'
  | 'tilt'
  | 'orbit'
  | 'crane'
  | 'handheld'
  | 'static';

export type CameraHeight = 'low' | 'eye' | 'high';
export type Distance = 'close' | 'medium' | 'far';
export type FieldOfView = 'wide' | 'normal' | 'narrow';
export type Environment = 'corridor' | 'open';

/** Relative, authored geometry for the diagram. Never measured values. */
export interface CameraSetup {
  kind: MovementKind;
  height: CameraHeight;
  distance: Distance;
  fov: FieldOfView;
  environment: Environment;
  /** Short diagram labels, uppercase is applied by CSS. Defaults per kind if omitted. */
  subjectLabel?: string;
  cameraLabel?: string;
}

export type ParamStatus = 'authored' | 'unknown' | 'unavailable';
export type ParamFamily = 'camera' | 'composition' | 'lens' | 'light';

export interface ClipParam {
  label: string;           // "Camera movement"
  value: string;           // "Low following track behind a moving subject"
  family: ParamFamily;     // drives the pixel module in the row
  status: ParamStatus;     // unknown → UNKNOWN badge, unavailable → greyed row
}

export type ClaimStatus = 'observed' | 'inferred' | 'unverified' | 'not-supported';

export interface ClipClaim {
  claim: string;
  note: string;
  status: ClaimStatus;
  /** 0–5. 0 for unverified / not-supported. */
  strength: 0 | 1 | 2 | 3 | 4 | 5;
}

export type EvidenceLevel = 'strong' | 'moderate' | 'weak' | 'insufficient';

export type ClipMedia =
  | {
      kind: 'official';
      /** Existing reviewed grant expiry; checked again on click and during playback. */
      expiresAt?: string;
      provider: 'youtube' | 'vimeo';
      /** Embed URL, loaded only after the viewer clicks. */
      embedUrl: string;
      /** Public page URL for "open on …". */
      pageUrl: string;
      uploadTitle: string;   // "The Shining (1980) – Come Play With Us Scene (2/7)"
      channel: string;       // "Movieclips"
      durationSec?: number;
      /** Range the study actually covers, in seconds. */
      studied?: { start: number; end: number; label: string };
      /** Notable moments, in seconds. */
      marks?: { at: number; label: string }[];
      containsCuts?: boolean;
      /** Optional cleared still. Omit unless rights allow. */
      posterUrl?: string;
    }
  | {kind:'hosted';url:string;posterUrl:string;attribution:string}
  | { kind: 'schematic'; note?: string }      // original CC0 study artwork, no footage
  | { kind: 'pending'; note?: string };       // footage required, nothing to show

export interface ClipSource {
  role: string;            // "Media · official upload", "Technique research"
  title: string;
  publisher: string;       // "Movieclips · YouTube"
  url?: string;
}

export interface ClipPage {
  id: string;              // "film-discovery-05" / "tracking"
  collection: string;      // "Film discovery" / "Schematic"
  index?: number;          // 5 → "05"
  title: string;           // "The Shining"
  subtitle?: string;       // "1980 · Danny’s tricycle corridor"
  tagline?: string;        // schematic pages: "Move beside the subject. Hold the distance."
  technique: string;       // "Tracking shot"
  tags: string[];          // ["Low height", "Rear follow"]

  media: ClipMedia;
  /** Three-cell status strip. */
  status: {
    media: string;         // "Official upload. Rights stay with source."
    parameters: string;    // "Authored direction, not measured."
    evidence: EvidenceLevel;
  };

  setup?: CameraSetup;     // omit → diagram block hidden
  setupNote?: string;
  params: ClipParam[];
  negatives: string[];     // ["Zoom", "Overtaking", …]

  prompt: string;
  promptLabel?: string;    // "Camera · Tracking · R1"
  promptNote?: string;
  composeHref?: string;

  claims: ClipClaim[];     // empty → empty state
  claimsEmpty?: string;    // "No footage reviewed. No visual observations recorded."
  inspection?: { method: string; date: string };

  sources: ClipSource[];
  rights: string;

  backHref: string;
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}

/** Default evidence meter fill for the status strip. */
export const EVIDENCE_CELLS: Record<EvidenceLevel, number> = {
  strong: 4, moderate: 3, weak: 1, insufficient: 0,
};
