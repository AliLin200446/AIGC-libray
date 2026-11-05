/**
 * Framefield — Studies (Explore → Camera studies) page model (R1)
 * The renderer only reads this shape. Adapt the repo's existing study list to it.
 */
import type { CameraSetup } from '../clips/clip-model';
import type { MosaicScene } from '../pixel/mosaic-heading';

export type StudySource = 'film' | 'original';
export type Movement = 'dolly' | 'tracking' | 'pan' | 'orbit' | 'tilt' | 'crane' | 'handheld' | 'static';
export type ShotSize = 'close' | 'medium' | 'wide';

export type StudyThumb =
  /** Film reference with no cleared still: draw the plan-view schematic. */
  | { type: 'schematic'; setup: CameraSetup }
  /** Original Framefield render. `src` = poster image; `previewSrc` = short loop shown on hover. */
  | { type: 'render'; src?: string; previewSrc?: string; alt: string };

export interface Study {
  no: string;              // "01"
  slug: string;            // route: /clips/<slug>
  source: StudySource;
  movement: Movement;
  movementLabel?: string;  // "Dolly zoom" when more specific than the filter key
  size: ShotSize;
  title: string;
  /** One short line. Film: "1980 · Official player · Movieclips / YouTube". */
  sourceLine: string;
  durationSec?: number;    // omit when no footage
  awaitingFootage?: boolean;
  chips: string[];         // e.g. ["Medium shot", "Evidence · moderate"]
  thumb: StudyThumb;
}

export interface StudiesModel {
  kicker: string;
  titleLines: [string, string];   // ["Camera in", "motion."]
  lede: string;
  disclaimer: string;
  mosaic: { scene: MosaicScene; caption: string; animate?: boolean };
  tabs: { label: string; sub: string; href: string; current: boolean; family: 'camera' | 'lens' }[];
  studies: Study[];
  hrefFor: (s: Study) => string;
}
