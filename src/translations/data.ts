import { controls } from '../controls';
import type { ModelSlot, ModelTranslation } from './types';

export const modelSlots: ModelSlot[] = [
  { id: 'model-a', label: 'Model A', model: null },
  { id: 'model-b', label: 'Model B', model: null },
  { id: 'model-c', label: 'Model C', model: null },
];

/** Empty slots define coverage only; no instruction or performance is inferred. */
export const modelTranslations: ModelTranslation[] = controls.flatMap(control =>
  modelSlots.map(model => ({
    id: `${control.id}:${model.id}`,
    revision: 1,
    controlId: control.id,
    controlRevision: control.revision,
    modelSlotId: model.id,
    status: 'unconfigured',
    instruction: null,
    settings: {},
    visualEvidence: [],
    observedBehavior: [],
    reliability: { status: 'untested', notes: [], evidenceRunIds: [] },
    knownFailures: [],
    experimentNotes: [],
  })),
);
