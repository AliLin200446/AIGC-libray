import type { ControlId } from '../../controls/types';

export type CompositionId = Extract<ControlId, 'centered' | 'symmetrical' | 'rule-of-thirds' | 'negative-space'>;
export type LensId = Extract<ControlId, `lens-${string}`>;
export type ReconstructionControlId = CompositionId | LensId;
export const evidenceStates = ['strong evidence', 'moderate evidence', 'weak evidence', 'insufficient evidence'] as const;
export type EvidenceState = typeof evidenceStates[number];
export const confidenceDefinitions: Record<EvidenceState, string> = {
  'strong evidence': 'Multiple visible cues support this interpretation with limited plausible alternatives.',
  'moderate evidence': 'Useful evidence exists, but alternative interpretations remain.',
  'weak evidence': 'Plausible interpretation with limited evidence.',
  'insufficient evidence': 'The image does not support a responsible inference.',
};
/** Coordinates on the uncropped uploaded image: top-left (0,0), bottom-right (1,1). */
export interface Point { x: number; y: number }
export interface Region extends Point { width: number; height: number }
export interface EvidenceLine { from: Point; to: Point }
export type ObservationCategory = 'subject-placement' | 'symmetry' | 'negative-space' | 'depth' | 'perspective' | 'framing' | 'architecture' | 'foreground-background' | 'other';
export interface Observation {
  id: string;
  category: ObservationCategory;
  statement: string;
  /** Concrete visible cues, separate from the later interpretation. */
  evidence: string[];
  confidenceState: EvidenceState;
  region: Region | null;
  anchor: Point | null;
  lines: EvidenceLine[];
}
export interface Finding<T> {
  value: T | null;
  status: 'observed' | 'inferred' | 'unavailable';
  evidence: string[];
  evidenceObservationIds: string[];
  confidenceState: EvidenceState;
  source: string;
}
export interface CompositionCandidate extends Omit<Finding<never>, 'value' | 'status'> {
  controlId: CompositionId;
  status: 'inferred' | 'unavailable';
}
export interface SuggestedControl {
  controlId: ReconstructionControlId;
  reason: string;
  confidenceState: EvidenceState;
  reconstructionSuggestion: true;
  evidenceObservationIds: string[];
}
export interface ProviderMetadata {
  providerId: string;
  model: string | null;
  contractVersion: '1';
  promptVersion: '1';
  requestTimestamp?: string;
  latencyMs?: number;
  input?: { width:number; height:number; format:'jpeg'|'png'|'webp' };
  submitted?: { width:number; height:number; format:'png' };
  transformations?: string[];
  imageDetail?: 'high';
  providerRequestId?: string;
  usage?: { inputTokens:number; outputTokens:number; totalTokens:number };
}
/** Structured image interpretation. It cannot contain physical capture metadata. */
export interface AnalysisContent {
  mediaType: 'image';
  observations: Observation[];
  composition: CompositionCandidate[];
  lensTendency: Finding<'wide-like' | 'normal-like' | 'telephoto-like' | 'insufficient'> & { status: 'inferred' | 'unavailable' };
  framing: Finding<{
    descriptor: 'close-up' | 'medium' | 'medium-full' | 'full-body' | 'wide-environmental' | 'ambiguous';
    anchor: Point | null;
    /** Approximate subject height / image height, not confidence. */
    subjectScale: number | null;
  }> & { status: 'inferred' | 'unavailable' };
  perspective: Finding<string> & { status: 'observed' | 'unavailable' };
  cameraMovement: Finding<never> & { status: 'unavailable'; value: null };
  suggestedControls: SuggestedControl[];
  limitations: string[];
}
export interface ReferenceAnalysis extends AnalysisContent {
  provenance: 'provider' | 'development-fixture';
  providerMetadata: ProviderMetadata;
  /** No EXIF extraction is performed. Inferences cannot be promoted into this slot. */
  captureMetadata: null;
  /** Derived from validated observations, not independent model labels. */
  overlays: { anchor?: Point; negativeSpace?: Region; perspectiveLines?: EvidenceLine[] };
}
/** Reserved for a separate explicit metadata reader, never supplied by a vision provider. */
export interface VerifiedCaptureMetadata {
  source: 'explicit-exif';
  focalLengthMm: number;
}
export interface ReferenceImage { file: Blob; url: string; width: number; height: number; name: string }
export interface ReferenceAnalysisProvider {
  id: string;
  model: string | null;
  resultFormat?: 'raw' | 'normalized';
  available?: boolean;
  checkReadiness?: () => Promise<boolean>;
  /** Untrusted transport response; the engine validates before publication. */
  analyzeImage(image: ReferenceImage, signal: AbortSignal): Promise<unknown>;
}
export type ProviderStatus = 'not-connected' | 'ready' | 'analyzing' | 'completed' | 'error';
export type ProviderState =
  | { status: 'not-connected' | 'ready' | 'analyzing'; result: null; error: null }
  | { status: 'completed'; result: ReferenceAnalysis; error: null }
  | { status: 'error'; result: null; error: string };
/** Future video results require temporal evidence; not part of the image response schema. */
export interface FutureVideoMotion {
  mediaType: 'video';
  movement: Finding<'static' | 'pan' | 'tilt' | 'dolly' | 'orbit' | 'zoom-like'>;
  temporalEvidence: { startSeconds: number; endSeconds: number; cue: 'global translation' | 'parallax' | 'rotational flow' | 'changing perspective' | 'subject-relative movement' }[];
}
