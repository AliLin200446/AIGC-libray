import type { VisualPreview } from '../visuals/types';

export type ControlId =
  | 'pan' | 'tilt' | 'dolly' | 'orbit'
  | 'lens-24mm' | 'lens-35mm' | 'lens-50mm' | 'lens-85mm'
  | 'centered' | 'symmetrical' | 'rule-of-thirds' | 'negative-space';

export type ControlCategory = 'camera' | 'lens' | 'composition';
export type ParameterValue = string | number | boolean;

interface ParameterBase {
  id: string;
  name: string;
  description: string;
}
export type ControlParameter = ParameterBase & (
  | { kind: 'choice'; options: readonly string[]; defaultValue: string }
  | { kind: 'number'; unit: string; min: number; max: number; defaultValue: number }
  | { kind: 'boolean'; defaultValue: boolean }
);

export interface Criterion {
  id: string;
  description: string;
}

export interface ControlSpecification {
  id: ControlId;
  revision: number;
  name: string;
  category: ControlCategory;
  media: readonly ('image' | 'video')[];
  shortDescription: string;
  visualPreview: VisualPreview;
  creativeIntent: string;
  observableBehavior: readonly string[];
  /** Conditions needed to distinguish a physical control from a visual imitation. */
  testConditions: readonly string[];
  parameters: readonly ControlParameter[];
  invariants: readonly string[];
  evaluationCriteria: readonly Criterion[];
  knownFailureModes: readonly Criterion[];
  experimentStatus: 'untested' | 'planned' | 'in-progress' | 'evaluated';
}
