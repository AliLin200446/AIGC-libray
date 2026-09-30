import type { BaselineId, StudyId } from './studies/types';
import type { ControlId, ParameterValue } from '../controls/types';
import type { Evaluation } from '../evaluation/types';
import type { ModelIdentity, ModelSettings } from '../translations/types';

export interface ArtifactReference {
  uri: string;
  kind: 'image' | 'video' | 'text';
  description: string;
}

export interface GenerationSnapshot {
  instruction: string;
  settings: ModelSettings;
  /** Use a string to preserve large provider seed values without numeric rounding. */
  seed: string | null;
}

/** A group holds the common protocol; each run stores its exact generation inputs. */
export interface Experiment {
  id: string;
  studyId: StudyId;
  baselineId: BaselineId;
  /** Shared ID across the four lens experiments in one comparable model/protocol set. */
  comparisonSetId?: string;
  controlId: ControlId;
  controlRevision: number;
  translationId: string;
  translationRevision: number;
  model: ModelIdentity;
  parameterValues: Record<string, ParameterValue>;
  references: ArtifactReference[];
  baseline: GenerationSnapshot;
  translated: GenerationSnapshot;
  protocol: string;
  controlledVariables: string[];
  /** Repeatability belongs to the group, supported by multiple run IDs. */
  evaluation: Evaluation;
  notes: string[];
}

interface RunBase {
  id: string;
  experimentId: string;
  runNumber: number;
  createdAt: string;
  baseline: GenerationSnapshot;
  translated: GenerationSnapshot;
  observations: string[];
  evaluation: Omit<Evaluation, 'consistency'>;
  /** Canonical failure-mode IDs, with free-form unexpected failures below. */
  failureModeIds: string[];
  unexpectedFailures: string[];
  notes: string[];
}

export type ExperimentRun = RunBase & (
  | { status: 'planned'; baselineOutput: null; output: null }
  | { status: 'completed'; baselineOutput: ArtifactReference; output: ArtifactReference }
  | { status: 'error'; baselineOutput: ArtifactReference | null; output: ArtifactReference | null; error: string }
);
