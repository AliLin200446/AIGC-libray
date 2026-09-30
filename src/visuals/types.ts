import type { ControlId } from '../controls/types';

export type AssetEvidence =
  | { evidenceStatus: 'reference'; attribution: string }
  | { evidenceStatus: 'experiment'; experimentId: string; runIds: string[] };

export type VisualAsset = AssetEvidence & {
  type: 'image' | 'video';
  src: string;
  alt: string;
  poster?: string;
};

/** Normalized coordinates keep guides aligned to the uncropped media viewport. */
export type CompositionOverlay =
  | { type: 'center-axis' | 'thirds-grid' }
  | { type: 'symmetry-axis'; axis?: 'vertical' | 'horizontal' }
  | { type: 'subject-position'; x: number; y: number }
  | { type: 'negative-space'; x: number; y: number; width: number; height: number };

export interface VisualPreview {
  type: 'image' | 'video' | 'comparison' | 'overlay';
  title: string;
  alt: string;
  /** Null is an intentional placeholder, never experimental evidence. */
  asset: VisualAsset | null;
  requiredAsset: readonly string[];
  overlays: readonly CompositionOverlay[];
  comparisonGroupId?: string;
}

export interface LensComparisonGroup {
  id: string;
  name: string;
  controlIds: readonly ControlId[];
  protocol: 'fixed-viewpoint' | 'matched-framing';
  conditions: readonly string[];
}
