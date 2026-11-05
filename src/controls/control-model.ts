/**
 * Framefield — control page model (R1)
 * One template for all 12 /library/<slug> pages. The renderer only reads this shape.
 */

export type ControlFamily = 'camera' | 'lens' | 'composition';

export type ParamDef =
  | { kind: 'choice'; id: string; label: string; options: { value: string; label: string }[]; default: string; hint: string }
  | { kind: 'range'; id: string; label: string; min: number; max: number; step: number; unit: string; default: number; hint: string }
  | { kind: 'toggle'; id: string; label: string; default: boolean; hint: string };

export type ParamValues = Record<string, string | number | boolean>;

/** Evidence for one model. Absent until a matching experiment exists — never placeholder data. */
export interface ModelEvidence {
  model: string;
  runs: number;
  date: string;              // ISO date of the latest run
  intentFidelity: string;    // e.g. "Strong" | "Mixed" | "Weak"
  consistency: string;
  collateralChange: string;
  href: string;              // detail page with runs, known behaviors/failures, translation
}

export interface ControlDef {
  no: number;                // 2 → "C-02"
  slug: string;              // "tilt"
  family: ControlFamily;
  familyLabel: string;       // "Camera movement"
  title: string;             // "Tilt" / "24mm"
  definition: string;        // one sentence under the title
  intent: string;            // canonical intent
  revision: number;
  status: import('./metadata').ControlStatus;
  media: string;             // "video" | "image / video"
  behaviors: string[];       // "What changes"
  params: ParamDef[];
  /** Live spec sentence from the current values. */
  spec: (v: ParamValues) => string;
  /** Fixed constraint line under the spec. */
  specNote: string;
  failures: string[];
  evidence: ModelEvidence[]; // [] → "Not tested yet" panel
}

export interface ControlPageModel {
  control: ControlDef;
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
  indexHref: string;
  composeHref: (c: ControlDef, v: ParamValues) => string;
  experimentNeeds: string[];   // shown in the untested panel
}

/** Host hook for the existing three.js study. Optional: without it the page shows a placeholder. */
export interface StudyHost {
  update(values: ParamValues): void;
  replay?(): void;
  pause?(): void;
  dispose(): void;
}
export type MountStudy = (el: HTMLElement, control: ControlDef, values: ParamValues) => StudyHost;

export const defaults = (c: ControlDef): ParamValues =>
  Object.fromEntries(c.params.map((p) => [p.id, p.default]));
