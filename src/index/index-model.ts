/**
 * Framefield — Index page model (R1)
 * The Index renders only from this shape. Controls live in index-data.ts
 * (or an adapter from the repo's existing control registry).
 */

export type FamilyId = 'camera' | 'lens' | 'composition';

export type ThumbSpec =
  | { kind: 'pan' }
  | { kind: 'tilt' }
  | { kind: 'dolly' }
  | { kind: 'orbit' }
  | { kind: 'lens'; focalMm: number }          // FOV computed from a 36 mm sensor width
  | { kind: 'centered' }
  | { kind: 'symmetrical' }
  | { kind: 'thirds' }
  | { kind: 'negative-space' };

export type ControlStatus = import('../controls/metadata').ControlStatus;
export type ExperimentStatus = import('../controls/types').ControlSpecification['experimentStatus'];

export interface ControlCard {
  id: string;            // "C-01"
  slug: string;          // "pan" → /library/pan
  family: FamilyId;
  title: string;         // "Pan"
  behavior: string;      // one line, from the control page's own definition
  status: ControlStatus;
  experiments: ExperimentStatus;
  thumb: ThumbSpec;
}

export interface Family {
  id: FamilyId;
  no: string;            // "01"
  name: string;          // "Camera movement"
  description: string;
}

export interface IndexModel {
  title: string;         // "Index"
  kicker: string;        // "Index / Vol. 01"
  lede: string;
  steps: { title: string; body: string }[];   // 3-step "how it works"
  families: Family[];
  controls: ControlCard[];
  about: string[];       // build / disclaimer paragraphs (footnote block)
  hrefFor: (c: ControlCard) => string;
}
