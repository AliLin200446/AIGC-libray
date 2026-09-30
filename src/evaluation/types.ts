export type EvidenceStatus = 'strong' | 'partial' | 'weak' | 'failed' | 'untested';

export interface Assessment {
  status: EvidenceStatus;
  notes: string[];
  /** Run IDs supporting this judgment; empty for untested dimensions. */
  evidenceRunIds: string[];
}

export interface Evaluation {
  intentFidelity: Assessment;
  consistency: Assessment;
  collateralChange: Assessment;
  notes: string[];
}

export const evaluationDimensions = {
  intentFidelity: {
    label: 'Intent Fidelity',
    question: 'Did the requested visual behavior occur?',
  },
  consistency: {
    label: 'Consistency',
    question: 'Does the behavior survive repeated comparable generations?',
  },
  collateralChange: {
    label: 'Collateral Change',
    question: 'Were unrelated aspects preserved when this control was requested?',
  },
} as const;

/** All statuses describe control success: strong collateral-change performance means preservation. */
export const statusGuidance: Record<EvidenceStatus, string> = {
  strong: 'The relevant criteria are clearly met in the cited evidence.',
  partial: 'Some criteria are met; meaningful deviations remain.',
  weak: 'Only limited evidence of the requested behavior or preservation.',
  failed: 'The requested behavior or preservation did not occur.',
  untested: 'Insufficient evidence to assess; this is not a performance claim.',
};

export function untestedEvaluation(): Evaluation {
  const dimension = (): Assessment => ({ status: 'untested', notes: [], evidenceRunIds: [] });
  return {
    intentFidelity: dimension(),
    consistency: dimension(),
    collateralChange: dimension(),
    notes: [],
  };
}
