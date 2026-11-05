/**
 * Framefield — Analyze: simulated provider (R1)
 * Used while the real model is offline. It does NOT look at the image: it returns
 * a fixed example with `simulated: true`, and reports staged progress so the
 * processing screen can be built and tested end to end.
 */
import type { AnalysisResult, AnalyzeProvider, Stage } from './analyze-model';

export const EXAMPLE_RESULT: AnalysisResult = {
  version: 1,
  simulated: true,
  summary: 'A medium shot, off-center, at eye level.',
  subject: 'a standing figure in a quiet interior',
  readings: [
    { id: 'shot_size', category: 'composition', label: 'Shot size', value: 'Medium shot', status: 'observed', confidence: 4, evidence: 'Subject fills about half the frame height.', phrase: 'Medium shot', headline: true },
    { id: 'placement', category: 'composition', label: 'Placement', value: 'Rule of thirds · upper right', status: 'observed', confidence: 4, evidence: 'Head sits near the upper-right intersection.', phrase: 'head on the upper-right thirds intersection', control: 'rule-of-thirds', headline: true },
    { id: 'fov', category: 'lens', label: 'Field of view', value: '≈ 35–50mm equivalent', status: 'inferred', confidence: 2, evidence: 'Moderate convergence, no wide-angle stretch. One image can’t measure focal length.', phrase: 'a 35–50mm full-frame equivalent field of view', control: 'lens-35mm', headline: true },
    { id: 'dof', category: 'lens', label: 'Depth of field', value: 'Deep · background readable', status: 'inferred', confidence: 2, evidence: 'Doorway edges stay sharp behind the subject.', phrase: 'deep focus with the background readable' },
    { id: 'height', category: 'position', label: 'Height', value: 'Eye level', status: 'inferred', confidence: 3, evidence: 'Horizon crosses near the subject’s shoulders.', phrase: 'camera at eye level', headline: true },
    { id: 'angle', category: 'position', label: 'Angle', value: 'Level · 0°', status: 'inferred', confidence: 3, evidence: 'Verticals stay parallel; no keystoning.', phrase: 'level angle with parallel verticals' },
    { id: 'quality', category: 'light', label: 'Quality', value: 'Soft daylight', status: 'inferred', confidence: 3, evidence: 'Low-contrast shadow edges.', phrase: 'soft daylight' },
    { id: 'direction', category: 'light', label: 'Direction', value: 'Front-left', status: 'inferred', confidence: 2, evidence: 'Shadow falls behind and to the right of the subject.', phrase: 'light from the front left' },
  ],
  overlays: { thirds: true, subjectBox: { x: 0.596, y: 0.18, w: 0.14, h: 0.6 }, anchor: { x: 0.6667, y: 0.3333 }, horizonY: 0.46 },
  hints: { lensMm: { min: 35, max: 50 }, cameraHeight: 'eye', angleDeg: 0, lightFromDeg: -40, lightQuality: 'soft' },
};

const STAGES: Stage[] = ['scan', 'composition', 'subject', 'lens'];

export function simulatedProvider(totalMs = 6000): AnalyzeProvider {
  return {
    analyze(_image, { signal, onProgress }) {
      return new Promise((resolve, reject) => {
        const t0 = performance.now();
        let raf = 0;
        const tick = () => {
          if (signal.aborted) { cancelAnimationFrame(raf); reject(new DOMException('Aborted', 'AbortError')); return; }
          const f = Math.min(1, (performance.now() - t0) / totalMs);
          onProgress({ stage: f >= 1 ? 'done' : STAGES[Math.min(3, Math.floor(f * 4))]!, fraction: f });
          if (f >= 1) { resolve(structuredClone(EXAMPLE_RESULT)); return; }
          raf = requestAnimationFrame(tick);
        };
        signal.addEventListener('abort', () => { cancelAnimationFrame(raf); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        raf = requestAnimationFrame(tick);
      });
    },
  };
}

/**
 * Template for the real provider. The server endpoint should stream
 * `{"stage":…,"fraction":…}` lines while working and end with the result JSON.
 * If it can't stream, call onProgress only on completion; the UI then loops its
 * animation instead of showing a fake percentage (see `indeterminate` in the page).
 */
export function httpProvider(endpoint: string): AnalyzeProvider {
  return {
    async analyze(image, { signal, onProgress }) {
      const body = new FormData();
      body.append('image', image);
      const res = await fetch(endpoint, { method: 'POST', body, signal });
      if (!res.ok || !res.body) { const body=await res.json().catch(()=>null); throw new Error(typeof body?.error==='string'?body.error:`Analyze failed (${res.status})`); }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '', last: unknown = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg && typeof msg.stage === 'string' && typeof msg.fraction === 'number') onProgress(msg);
          else last = msg;
        }
      }
      if (buf.trim()) last = JSON.parse(buf);
      return last as never;   // validated by the page with validateResult()
    },
  };
}
