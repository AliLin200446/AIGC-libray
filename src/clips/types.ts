import type { ControlId } from '../controls/types';
import type { EvidenceState, Finding, Observation, FutureVideoMotion } from '../library/reference/types';

export const filterGroups = {
  cameraMovement: ['Dolly In / Out', 'Tracking', 'Pan', 'Tilt', 'Orbit', 'Crane', 'Handheld', 'Static'],
  composition: ['Close-Up', 'Medium Shot', 'Wide Shot', 'Symmetrical', 'Over-the-Shoulder'],
  lens: ['Wide Angle', 'Normal', 'Telephoto'],
  lighting: ['Backlight', 'Silhouette', 'Low-Key', 'High-Key'],
} as const;
export type FilterGroup = keyof typeof filterGroups;
export type ClipCategories = { [K in FilterGroup]: readonly (typeof filterGroups[K][number])[] };
export type ClipFilters = { [K in FilterGroup]: string[] };
export interface ClipReference {
  id: string;
  title: string;
  description: string;
  /** Null explicitly represents a placeholder, never a fabricated media URL. */
  videoUrl: string | null;
  posterUrl: string;
  duration: number | null;
  categories: ClipCategories;
  controlIds: ControlId[];
  cameraMovement: Finding<string>;
  framing: Finding<string>;
  cameraAngle: Finding<string>;
  lens: Finding<string>;
  lighting: Finding<string>;
  subjectMotion: Finding<string>;
  movementSpeed: Finding<string>;
  prompt: string;
  source: { title: string; url: string | null; attribution: string; kind: 'placeholder' | 'licensed' };
  license: { name: string; url: string | null; notes: string };
  observations: Observation[];
  inferences: Finding<string>[];
  confidence: EvidenceState;
  evidence: FutureVideoMotion['temporalEvidence'];
  limitations?: string[];
}
