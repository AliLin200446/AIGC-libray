/**
 * Framefield — Analyze: prompt builder (R1)
 * Deterministic: same result + same choices → same prompt.
 * Each segment remembers its source so the UI can underline it in that category's colour.
 */
import type { AnalysisResult, Category, Movement, Pace } from './analyze-model';

export type SegmentSource = Category | 'subject' | 'movement' | 'fixed';
export interface Segment { text: string; source: SegmentSource }

const ORDER: Category[] = ['composition', 'lens', 'position', 'light'];

export const MOVEMENT_TEXT = (m: Movement, pace: Pace): string => {
  const p = pace === 'slow' ? 'Slow' : 'Steady';
  switch (m) {
    case 'static': return 'Locked-off static camera.';
    case 'pan': return `${p} pan right of about 20° over 5 seconds.`;
    case 'tilt': return `${p} tilt up of about 15° over 5 seconds.`;
    case 'dolly': return `${p} dolly in of about 1 m over 5 seconds, focal length fixed.`;
    case 'orbit': return `${p} orbit clockwise of about 30° around the subject.`;
  }
};

export const MOVEMENT_CONTROL: Partial<Record<Movement, string>> = { pan: 'pan', tilt: 'tilt', dolly: 'dolly', orbit: 'orbit' };

const sentence = (s: string) => {
  const t = s.trim();
  return /[.!?,;]$/.test(t) ? t : `${t}.`;
};

export function buildPrompt(
  r: AnalysisResult, included: ReadonlySet<string>, movement: Movement, pace: Pace,
): Segment[] {
  const segs: Segment[] = [{ text: `${r.subject.charAt(0).toUpperCase()}${r.subject.slice(1)}.`, source: 'subject' }];
  for (const cat of ORDER) {
    // one sentence per category: "Medium shot, head on the upper-right thirds intersection."
    const parts = r.readings
      .filter((x) => x.category === cat && included.has(x.id) && x.status !== 'unknown')
      .map((x) => x.phrase.trim().replace(/[.!?;,]+$/, ''));
    if (!parts.length) continue;
    const joined = parts.join(', ');
    segs.push({ text: sentence(joined.charAt(0).toUpperCase() + joined.slice(1)), source: cat });
  }
  segs.push({ text: MOVEMENT_TEXT(movement, pace), source: 'movement' });
  segs.push({ text: 'No cuts or sudden zooms.', source: 'fixed' });
  return segs;
}

export const promptText = (segs: Segment[]) => segs.map((s) => s.text).join(' ');
