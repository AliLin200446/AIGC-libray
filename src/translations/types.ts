import type { VisualAsset } from '../visuals/types';
import type { ControlId } from '../controls/types';
import type { Assessment } from '../evaluation/types';

export type ModelSlotId = 'model-a' | 'model-b' | 'model-c';
export type ModelSettings = Record<string, string | number | boolean | null>;

export interface ModelIdentity {
  provider: string;
  name: string;
  version: string;
}

export interface ModelSlot {
  id: ModelSlotId;
  label: string;
  /** Null until an actual provider, model and version are selected. */
  model: ModelIdentity | null;
}

export interface ModelTranslation {
  id: string;
  revision: number;
  controlId: ControlId;
  controlRevision: number;
  modelSlotId: ModelSlotId;
  status: 'unconfigured' | 'draft' | 'tested';
  instruction: string | null;
  settings: ModelSettings;
  visualEvidence: VisualAsset[];
  observedBehavior: string[];
  reliability: Assessment;
  knownFailures: string[];
  experimentNotes: string[];
}
