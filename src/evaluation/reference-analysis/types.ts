import type { ReferenceAnalysis, ProviderMetadata } from '../../library/reference/types';
import type { FailureId } from './failures';

export const expectationStates = ['EXPECTED', 'ACCEPTABLE', 'UNSUPPORTED', 'AMBIGUOUS'] as const;
export type ExpectationState = typeof expectationStates[number];
export interface Expectation { value: string; state: ExpectationState; reason: string }
export interface Annotation {
  referenceId: string;
  sourceProvenanceNote: string;
  expectedObservableTraits: Expectation[];
  compositionExpectations: Expectation[];
  lensTendencyExpectation: Expectation[];
  framingExpectation: Expectation[];
  knownAmbiguities: string[];
  forbiddenClaims: string[];
  acceptableSuggestedControls: string[];
  unacceptableSuggestedControls: string[];
  reviewNotes: string;
  captureMetadata: { source: string; note: string } | null;
  annotatedBy: string;
  readyForEvaluation: boolean;
}
export interface DatasetSlot {
  referenceId: string; purpose: string; assetStatus: 'missing' | 'present';
  assetFile: string | null; annotation: Annotation;
}
export const supportStates = ['SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED', 'NOT_ASSESSABLE'] as const;
export const uncertaintyStates = ['OVERCONFIDENT', 'UNDERCONFIDENT', 'APPROPRIATE_UNCERTAINTY', 'NOT_ASSESSABLE'] as const;
export const usabilityStates = ['USEFUL', 'USEFUL_WITH_CAVEATS', 'NOT_USEFUL', 'INVALID'] as const;
export interface ReviewItem {
  target: string;
  statement: typeof supportStates[number] | null;
  evidence: typeof supportStates[number] | null;
  region: typeof supportStates[number] | null;
  confidence: typeof supportStates[number] | null;
  uncertainty: typeof uncertaintyStates[number] | null;
  reason: string;
}
export interface HumanReview {
  runId: string; reviewer: string; items: ReviewItem[];
  observationQuality: string; inferenceQuality: string; uncertaintyQuality: string; controlMappingQuality: string;
  failures: { id: FailureId; target: string; reason: string }[];
  usability: { status: typeof usabilityStates[number]; reason: string } | null;
}
/** Provider neutral history. A review is an immutable sibling snapshot, never a run update. */
export interface EvaluationRun {
  formatVersion: '1'; runId: string; referenceId: string; timestamp: string;
  imageReference: string; imageSha256: string; annotation: Annotation;
  provider: string; model: string; modelVersion: string | null;
  promptVersion: string; promptSha256: string; schemaVersion: string; schemaSha256: string;
  modelConfiguration: Record<string, string | number | boolean>;
  normalizedAnalysis: ReferenceAnalysis | null; providerMetadata: ProviderMetadata | null;
  errorCode: string | null; latencyMs: number;
  humanReview: HumanReview | null; failures: HumanReview['failures']; usability: HumanReview['usability'];
}
export interface ReviewSnapshot extends EvaluationRun { reviewId: string; reviewedAt: string; humanReview: HumanReview }
export const productGate = { status: 'EXPERIMENTAL', requires: 'A named human decision after the complete pilot review; never inferred from schema validation.' } as const;
