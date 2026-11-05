/**
 * Framefield — Analyze: data contract (R1)
 * The vision model (or any provider) must return `AnalysisResult`.
 * `validateResult()` checks it at runtime before the UI renders anything.
 * Coordinates are normalized 0–1 in image space (x right, y down).
 */

export type Category = 'composition' | 'lens' | 'position' | 'light';
export type Status = 'observed' | 'inferred' | 'unknown';
export type Movement = 'static' | 'pan' | 'tilt' | 'dolly' | 'orbit';
export type Pace = 'slow' | 'steady';

export interface Reading {
  id: string;                 // stable key, e.g. "shot_size"
  category: Category;
  label: string;              // "Shot size"
  value: string;              // "Medium shot"
  status: Status;
  confidence: 0 | 1 | 2 | 3 | 4 | 5;
  evidence: string;           // one sentence: what in the image supports it
  phrase: string;             // prompt fragment contributed by this reading
  control?: string;           // Framefield control slug, e.g. "rule-of-thirds"
  headline?: boolean;         // show in the 4-tile frame signature
}

export interface Box { x: number; y: number; w: number; h: number }

export interface AnalysisResult {
  provider?: string;
  model?: string;
  observations?: Reading[];
  inferences?: Reading[];
  cameraControls?: {composition:string;confidence:number};
  unmappedProperties?: string[];
  version: 1;
  simulated: boolean;         // true → UI shows "SIMULATED" and treats readings as example output
  summary: string;            // one sentence, e.g. "A medium shot, off-center, at eye level."
  subject: string;            // short noun phrase for the prompt, e.g. "a standing figure in a quiet interior"
  readings: Reading[];
  overlays: {
    thirds: boolean;
    subjectBox?: Box | undefined;
    anchor?: { x: number; y: number } | undefined;   // the point placement is judged on
    horizonY?: number | undefined;
  };
  /** Optional hints that drive the category diagrams. Omit what the model can't support. */
  hints?: {
    lensMm?: { min: number; max: number } | undefined;            // full-frame equivalent range
    cameraHeight?: 'low' | 'eye' | 'high' | undefined;
    angleDeg?: number | undefined;                                 // + = looking down
    lightFromDeg?: number | undefined;                             // 0 = from camera, 90 = from right, -90 = from left
    lightQuality?: 'soft' | 'hard' | undefined;
  };
}

export type Stage = 'scan' | 'composition' | 'subject' | 'lens' | 'done';
export interface Progress { stage: Stage; fraction: number }   // fraction 0–1 overall

export interface AnalyzeProvider {
  analyze(image: Blob, opts: { signal: AbortSignal; onProgress: (p: Progress) => void }): Promise<AnalysisResult>;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  composition: 'Composition', lens: 'Lens', position: 'Camera position', light: 'Light',
};

/* ---------- runtime validation ------------------------------------------ */

const isNum01 = (n: unknown) => typeof n === 'number' && n >= 0 && n <= 1;
const isStr = (s: unknown, max = 400) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;

export class ResultError extends Error {}

/** Throws ResultError with a readable reason; returns a cleaned result. */
export function validateResult(raw: unknown): AnalysisResult {
  const r = raw as AnalysisResult;
  if (!r || typeof r !== 'object') throw new ResultError('Result is not an object');
  if (r.version !== 1) throw new ResultError('Unsupported result version');
  if (!isStr(r.summary, 160)) throw new ResultError('Missing summary');
  if (!isStr(r.subject, 120)) throw new ResultError('Missing subject phrase');
  if (!Array.isArray(r.readings) || r.readings.length === 0) throw new ResultError('No readings');
  const seen = new Set<string>();
  const readings = r.readings.filter((x) => {
    const ok = x && isStr(x.id, 40) && !seen.has(x.id)
      && ['composition', 'lens', 'position', 'light'].includes(x.category)
      && isStr(x.label, 40) && isStr(x.value, 80) && isStr(x.evidence, 240) && isStr(x.phrase, 200)
      && ['observed', 'inferred', 'unknown'].includes(x.status)
      && Number.isInteger(x.confidence) && x.confidence >= 0 && x.confidence <= 5;
    if (ok) seen.add(x.id);
    return ok;
  }).map((x) => ({
    ...x,
    // guardrails: unknown readings never claim confidence; lens is never "observed"
    confidence: (x.status === 'unknown' ? 0 : x.confidence) as Reading['confidence'],
    status: x.category === 'lens' && x.status === 'observed' ? 'inferred' as Status : x.status,
  }));
  if (!readings.length) throw new ResultError('No valid readings');
  const o = r.overlays ?? { thirds: false };
  const box = o.subjectBox && [o.subjectBox.x, o.subjectBox.y, o.subjectBox.w, o.subjectBox.h].every(isNum01) ? o.subjectBox : undefined;
  const anchor = o.anchor && isNum01(o.anchor.x) && isNum01(o.anchor.y) ? o.anchor : undefined;
  const horizonY = isNum01(o.horizonY) ? o.horizonY : undefined;
  const h = r.hints ?? {};
  const lensMm = h.lensMm && h.lensMm.min >= 8 && h.lensMm.max <= 800 && h.lensMm.min <= h.lensMm.max ? h.lensMm : undefined;
  return {
    ...(r.provider==='NVIDIA NIM'&&r.model==='meta/muse-glimmer-30b'?{provider:r.provider,model:r.model,observations:readings.filter(x=>x.status==='observed'),inferences:readings.filter(x=>x.status!=='observed'),cameraControls:{composition:['centered','symmetrical','rule-of-thirds','negative-space'].includes(r.cameraControls?.composition??'')?r.cameraControls!.composition:'centered',confidence:Number.isInteger(r.cameraControls?.confidence)?r.cameraControls!.confidence:0},unmappedProperties:(r.unmappedProperties??[]).filter(x=>typeof x==='string').slice(0,8)}:{}),
    version: 1, simulated: Boolean(r.simulated), summary: r.summary.trim(), subject: r.subject.trim(), readings,
    overlays: { thirds: Boolean(o.thirds), subjectBox: box, anchor, horizonY },
    hints: {
      lensMm,
      cameraHeight: ['low', 'eye', 'high'].includes(h.cameraHeight as string) ? h.cameraHeight : undefined,
      angleDeg: typeof h.angleDeg === 'number' && Math.abs(h.angleDeg) <= 90 ? h.angleDeg : undefined,
      lightFromDeg: typeof h.lightFromDeg === 'number' && Math.abs(h.lightFromDeg) <= 180 ? h.lightFromDeg : undefined,
      lightQuality: h.lightQuality === 'soft' || h.lightQuality === 'hard' ? h.lightQuality : undefined,
    },
  };
}
