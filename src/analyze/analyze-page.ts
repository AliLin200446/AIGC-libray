/**
 * Framefield — Analyze page (R1)
 * mountAnalyze(root, opts) → dispose. One route (/analyze), three steps:
 *   01 Upload → 02 Processing → 03 Results
 * Framework-free. All model text is escaped. Image stays local (object URL)
 * until the provider uploads it; the URL is revoked on reset/dispose.
 */
import {
  type AnalysisResult, type AnalyzeProvider, type Progress, type Movement, type Pace, type Reading, type Category,
  CATEGORY_LABEL, validateResult, ResultError,
} from './analyze-model';
import { buildPrompt, promptText, MOVEMENT_CONTROL, type Segment } from './prompt-builder';
import { paintCells } from '../pixel/mosaic-heading';
import { pixelSVG } from '../pixel/pixel';

export interface AnalyzeOptions {
  live?: boolean;
  provider: AnalyzeProvider;
  samples?: { name: string; src: string }[];
  maxBytes?: number;                                     // default 10 MB
  retention?: string;                                    // shown under the drop zone
  controlHref?: (slug: string) => string;                // default /library/<slug>
  composeHref?: string;                                  // default /compose?from=analyze
}

type Step = 'upload' | 'processing' | 'results' | 'error';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MOD: Record<Category, string> = { composition: 'ff-px--checker', lens: 'ff-px--ring', position: 'ff-px--cross', light: 'ff-px--ink' };
const UNDERLINE: Record<Segment['source'], string> = {
  composition: 'az-u-comp', lens: 'az-u-lens', position: 'az-u-cam', light: 'az-u-light', movement: 'az-u-move', subject: '', fixed: 'az-u-fixed',
};
const HANDOFF_KEY = 'ff:analyze-handoff';

/** Pixel upload glyph: frame corners (ink), up-arrow (camera blue), base (lens pink). */
const DROP_GLYPH = (() => {
  const rows = ['XXXX.....XXXX', 'X...........X', 'X.....B.....X', '.....BBB.....', '....B.B.B....', '......B......', 'X.....B.....X', 'X....PPP....X', 'XXXX.....XXXX'];
  const fill: Record<string, string> = { X: 'var(--ff-ink)', B: 'var(--ff-camera)', P: 'var(--ff-lens)' };
  const rects = rows.flatMap((r, y) => r.split('').map((ch, x) => (fill[ch] ? `<rect x="${x * 11}" y="${y * 11}" width="9" height="9" fill="${fill[ch]}"/>` : '')));
  return `<svg viewBox="0 0 141 97" width="141" height="97" shape-rendering="crispEdges">${rects.join('')}</svg>`;
})();

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const meter = (n: number) =>
  `<span class="az-meter" role="img" aria-label="Confidence ${n} of 5">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const statusChip = (s: Reading['status']) => `<span class="az-chip az-st-${s}">${s}</span>`;
const brackets = '<span class="az-brk" aria-hidden="true"></span>';

export function mountAnalyze(root: HTMLElement, opts: AnalyzeOptions): () => void {
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024;
  const controlHref = opts.controlHref ?? ((s: string) => `/library/${s}`);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  let step: Step = 'upload';
  let file: Blob | null = null, fileName = '', url = '', dims = { w: 0, h: 0 };
  let result: AnalysisResult | null = null;
  let progress: Progress = { stage: 'scan', fraction: 0 };
  let indeterminate = false, lastProgressAt = 0;
  let included = new Set<string>();
  let movement: Movement = 'static', pace: Pace = 'slow';
  let creativeComposition = '', creativeFocal = 50, creativeLensEdited=false;
  function segments(r:AnalysisResult){const base=buildPrompt(r,included,movement,pace);if(creativeComposition){for(let i=base.length-1;i>=0;i--)if(base[i]!.source==='composition')base.splice(i,1);base.push({source:'composition',text:`Use ${creativeComposition.replaceAll('-',' ')} framing as a creative target.`});}if(creativeLensEdited){for(let i=base.length-1;i>=0;i--)if(base[i]!.source==='lens')base.splice(i,1);base.push({source:'lens',text:`Use a ${creativeFocal}mm lens as a creative target, not a measured focal length.`});}return base;}
  const ov = { thirds: true, subject: true, horizon: true };
  let errorMsg = '', uploadError = '';
  let ac: AbortController | null = null;
  let timer = 0, phase = 0;
  let copyTimer = 0;
  const live = new AbortController();

  /* ---------- shell ---------- */
  const stepper = () => {
    const s = (n: number, id: Step, label: string) => {
      const order: Step[] = ['upload', 'processing', 'results'];
      const cur = order.indexOf(step === 'error' ? 'processing' : step), me = order.indexOf(id);
      const cls = me === cur ? 'on' : me < cur ? 'done' : '';
      return `<li class="az-step ${cls}" ${me === cur ? 'aria-current="step"' : ''}><span class="az-step-mk ${cls}" aria-hidden="true"></span>0${n} ${label}</li>`;
    };
    const sim = result?.simulated ?? !opts.live;
    return `
    <div class="az-top">
      <ol class="az-steps" aria-label="Analysis steps">${s(1, 'upload', 'Upload')}${s(2, 'processing', 'Processing')}${s(3, 'results', 'Results')}</ol>
      <div class="az-top-right">
        ${sim ? '<span class="az-sim"><span class="ff-px ff-px--strike" aria-hidden="true"></span>Simulated · example output</span>' : ''}
        ${result?.provider==='NVIDIA NIM'&&!result.simulated?'<span class="az-lab">Analyzed with Meta Muse Glimmer 30B via NVIDIA NIM.</span>':''}
        ${step === 'results' ? '<button type="button" class="az-link" data-act="reset">New image</button>' : ''}
      </div>
    </div>`;
  };

  /* ---------- 01 upload ---------- */
  const uploadView = () => `
    <section class="az-hero">
      <div class="az-hero-text">
        <span class="az-lab">Analyze / image to prompt</span>
        <h1 class="az-h1">Read a<br>frame.</h1>
        <p class="az-lede">Upload a still. Framefield reads its composition, lens and camera position, then writes a prompt you can edit.</p>
      </div>
      <figure class="az-mosaic" aria-hidden="true">${brackets}<figcaption>Frame · guides · subject · horizon</figcaption></figure>
    </section>

    ${url ? `<section class="az-sec"><img src="${esc(url)}" alt="Selected image preview" style="max-width:100%;max-height:320px;object-fit:contain"><p>${esc(fileName)}</p><button class="az-btn az-btn--pri" data-act="analyze">Analyze image →</button></section>` : ''}
    <section class="az-drop-row">
      <label class="az-drop" data-drop>
        <input type="file" accept="${ACCEPT.join(',')}" class="az-file" data-act="file">
        <span class="az-drop-dash" aria-hidden="true"></span>
        <span class="az-drop-icon" aria-hidden="true">${DROP_GLYPH}</span>
        <span class="az-drop-title">Drop a still here</span>
        <span class="az-drop-btns"><span class="az-btn az-btn--pri">Choose a file</span><span class="az-btn az-btn--sec">Paste · ⌘V</span></span>
        <span class="az-drop-chips"><span class="az-chip">JPG · PNG · WebP</span><span class="az-chip">Up to ${Math.round(maxBytes / 1048576)} MB</span><span class="az-chip">One frame</span></span>
        <span class="az-drop-err" aria-live="assertive">${esc(uploadError)}</span>
      </label>
      ${opts.samples?.length ? `
      <aside class="az-samples">
        <div class="az-samples-head"><span class="az-lab az-lab--ink">No image? Try a sample</span><span class="az-lab">Original studies</span></div>
        <div class="az-samples-grid">
          ${opts.samples.map((s, i) => `<button type="button" class="az-sample" data-act="sample" data-i="${i}" aria-label="Analyze sample: ${esc(s.name)}"><img src="${esc(s.src)}" alt="" loading="lazy"><span><b>${esc(s.name)}</b><span aria-hidden="true">→</span></span></button>`).join('')}
        </div>
      </aside>` : ''}
    </section>

    <section class="az-sec">
      <div class="az-sec-head">
        <div><span class="az-lab"><span class="az-no">What it reads</span> / five categories</span><h2>One frame, five readings.</h2></div>
        <p>Each reading is labeled observed, inferred or unknown, with a confidence level. Nothing is presented as capture metadata.</p>
      </div>
      <div class="az-cats-intro">
        ${introCard('composition', 'Placement & shot size', 'Where the subject sits, how much of the frame it fills. Usually observed.')}
        ${introCard('lens', 'Perspective & depth', 'Visible perspective cues, with uncertainty. Focal length is a creative choice.')}
        ${introCard('position', 'Height & angle', 'Eye level, low or high, read from the horizon and convergence.')}
        ${introCard('light', 'Quality & direction', 'Soft or hard, and roughly where it comes from. Inferred.')}
        <div class="az-intro az-intro--yours"><div class="az-intro-dia" aria-hidden="true"><span class="ff-px ff-px--cross"></span><i></i></div><span class="az-lab az-lab--ink"><span class="ff-px ff-px--cross" aria-hidden="true"></span>Camera movement</span><h3>Yours to choose</h3><p>A still can't show motion. You pick the intended move; the prompt follows.</p></div>
      </div>
      ${opts.retention ? `<p class="az-fine">${esc(opts.retention)}</p>` : ''}
    </section>`;

  function introCard(cat: Category, title: string, body: string) {
    return `<div class="az-intro"><div class="az-intro-dia az-intro-dia--${cat}" aria-hidden="true"></div><span class="az-lab az-lab--ink"><span class="ff-px ${MOD[cat]}" aria-hidden="true"></span>${CATEGORY_LABEL[cat]}</span><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  }

  /* ---------- 02 processing ---------- */
  const LOG: { cat: string; mod: string; at: number; done: string }[] = [
    { cat: 'Composition', mod: 'ff-px--checker', at: 1, done: 'Placement and shot size' },
    { cat: 'Lens', mod: 'ff-px--ring', at: 3, done: 'Field of view range' },
    { cat: 'Camera position', mod: 'ff-px--cross', at: 3, done: 'Height and angle' },
    { cat: 'Light', mod: 'ff-px--ink', at: 3, done: 'Quality and direction' },
  ];
  const STAGE_INDEX = { scan: 0, composition: 1, subject: 2, lens: 3, done: 4 } as const;
  const STAGE_NAME = ['Scanning frame', 'Reading composition', 'Locking subject', 'Estimating lens & height', 'Done'];

  const processingView = () => `
    <section class="az-proc">
      <figure class="az-figure">
        <div class="az-stage" style="--ar:${dims.w || 16} / ${dims.h || 10}" data-pstage="0">
          <img src="${esc(url)}" alt="Your image, being analyzed">
          <canvas class="az-scan" aria-hidden="true"></canvas>
          <span class="az-g az-g-v1" aria-hidden="true"></span><span class="az-g az-g-v2" aria-hidden="true"></span>
          <span class="az-g az-g-h1" aria-hidden="true"></span><span class="az-g az-g-h2" aria-hidden="true"></span>
          <span class="az-search" aria-hidden="true"></span>
          <span class="az-hz" aria-hidden="true"></span>
          <span class="az-tag az-ptag"></span>
          ${brackets}
        </div>
        <figcaption><span class="az-lab">${esc(fileName || 'Image')}${dims.w ? ` · ${dims.w}×${dims.h}` : ''}</span><span class="az-lab">One frame · no motion data</span></figcaption>
      </figure>
      <aside class="az-panel" aria-label="Analysis progress">
        <div class="az-panel-top">
          <div class="az-pct"><span class="az-pct-num" aria-hidden="true"></span><span class="az-pct-sign" aria-hidden="true">%</span><span class="az-lab az-pname" aria-live="polite"></span></div>
          <div class="az-bar" aria-hidden="true">${Array.from({ length: 24 }, () => '<i></i>').join('')}</div>
        </div>
        <ul class="az-log">${LOG.map((l, i) => `<li data-log="${i}"><span class="ff-px ${l.mod}" aria-hidden="true"></span><span class="az-log-t"><span class="az-lab">${l.cat}</span><span class="az-log-v">Waiting</span></span><span class="az-log-s"></span></li>`).join('')}
          <li class="is-unknown"><span class="ff-px ff-px--cross" aria-hidden="true"></span><span class="az-log-t"><span class="az-lab">Camera movement</span><span class="az-log-v">Not in a still · you'll choose it</span></span><span class="az-log-s">Unknown</span></li>
        </ul>
        <div class="az-panel-foot"><span class="az-fine">Readings are inferences from one image.</span><button type="button" class="az-link" data-act="cancel">Cancel</button></div>
      </aside>
    </section>
    <p class="az-tip"><span class="ff-px ff-px--cross" aria-hidden="true"></span>While you wait: a still can't show camera movement. You'll choose the intended move on the next screen.</p>`;

  function updateProcessing() {
    const si = indeterminate ? phase % 4 : STAGE_INDEX[progress.stage];
    const stage = root.querySelector<HTMLElement>('.az-stage');
    if (!stage) return;
    stage.dataset.pstage = String(si);
    root.querySelector('.az-ptag')!.textContent = opts.live?'Analyzing composition and perspective…':STAGE_NAME[Math.min(si, 4)]!;
    root.querySelector('.az-pname')!.textContent = indeterminate ? 'Analyzing composition and perspective…' : STAGE_NAME[Math.min(si, 4)]!;
    const numEl = root.querySelector<HTMLElement>('.az-pct-num')!;
    const signEl = root.querySelector<HTMLElement>('.az-pct-sign')!;
    if (indeterminate) { numEl.replaceChildren(); signEl.hidden = true; } else {
      const v = String(Math.min(99, Math.floor(progress.fraction * 100))).padStart(2, '0');
      if (numEl.dataset.v !== v) { numEl.dataset.v = v; numEl.replaceChildren(pixelSVG(v)); }
      signEl.hidden = false;
    }
    const filled = indeterminate ? (phase % 24) : Math.round(progress.fraction * 24);
    root.querySelectorAll('.az-bar i').forEach((c, i) => { c.className = indeterminate ? (i === filled ? 'now' : '') : (i < filled ? 'on' : i === filled ? 'now' : ''); });
    LOG.forEach((l, i) => {
      const li = root.querySelector<HTMLElement>(`[data-log="${i}"]`)!;
      const done = !opts.live && !indeterminate && si > l.at;
      const now = opts.live ? false : indeterminate ? si === l.at || (l.at === 3 && si === 3) : si === l.at || (l.at === 1 && si === 1);
      li.className = done ? 'is-done' : now ? 'is-now' : 'is-wait';
      li.querySelector('.az-log-v')!.textContent = done ? l.done : now ? 'Reading…' : 'Waiting';
      li.querySelector('.az-log-s')!.textContent = done ? 'Done' : now ? '● Reading' : '';
    });
    paintScan(si);
  }

  function paintScan(si: number) {
    const c = root.querySelector<HTMLCanvasElement>('.az-scan');
    if (!c) return;
    const COLS = 48, ROWS = 30;
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const row = si === 0 ? Math.round(((phase % 12) / 11) * ROWS) : -10;
    paintCells(c, COLS, ROWS, (x, y) => {
      if (y >= row || y < row - 7) return null;
      const d = 0.5 - (row - y) * 0.065;
      if (d * 16 <= bayer[y % 4]![x % 4]!) return null;
      return { tone: (x * 3 + y) % 5 === 0 ? 'lens' : 'camera', d: 1, size: 0.6 };
    });
    c.style.setProperty('--scan', `${(row / ROWS) * 100}%`);
  }

  /* ---------- 03 results ---------- */
  function resultsView(r: AnalysisResult) {
    const o = r.overlays;
    const head = r.readings.filter((x) => x.headline).slice(0, 4);
    const tiles = (head.length ? head : r.readings.slice(0, 4)).map((x) => `
      <div class="az-tile"><span class="az-lab"><span class="ff-px ${MOD[x.category]}" aria-hidden="true"></span>${esc(x.label)}</span>
      <span class="az-tile-big">${esc(x.value)}</span>
      <span class="az-tile-foot">${statusChip(x.status)}${meter(x.confidence)}</span></div>`).join('');
    const counts = (['observed', 'inferred'] as const).map((s) => `${r.readings.filter((x) => x.status === s).length} ${s}`).join(' · ');
    const cats = (['composition', 'lens', 'position', 'light'] as Category[]).filter((c) => r.readings.some((x) => x.category === c));
    const segs = segments(r);
    const text = promptText(segs);
    const mvControl = MOVEMENT_CONTROL[movement];
    return `
    <section class="az-summary">
      <figure class="az-figure">
        <div class="az-stage" style="--ar:${dims.w || 16} / ${dims.h || 10}">
          <img src="${esc(url)}" alt="Your image with analysis overlays">
          ${o.thirds && ov.thirds ? '<span class="az-g az-g-v1 is-on" aria-hidden="true"></span><span class="az-g az-g-v2 is-on" aria-hidden="true"></span><span class="az-g az-g-h1 is-on" aria-hidden="true"></span><span class="az-g az-g-h2 is-on" aria-hidden="true"></span>' : ''}
          ${o.subjectBox && ov.subject ? `<span class="az-box" aria-hidden="true" style="left:${pct(o.subjectBox.x)};top:${pct(o.subjectBox.y)};width:${pct(o.subjectBox.w)};height:${pct(o.subjectBox.h)}"></span>` : ''}
          ${o.anchor && ov.subject ? `<span class="az-anchor ff-px ff-px--ring" aria-hidden="true" style="left:${pct(o.anchor.x)};top:${pct(o.anchor.y)}"></span>` : ''}
          ${o.horizonY != null && ov.horizon ? `<span class="az-hz is-on" aria-hidden="true" style="top:${pct(o.horizonY)}"></span>` : ''}
          ${brackets}
        </div>
        <figcaption>
          <div class="az-togs" role="group" aria-label="Overlays">
            ${o.thirds ? tog('thirds', 'Thirds', 'ff-px--checker') : ''}${o.subjectBox || o.anchor ? tog('subject', 'Subject', 'ff-px--ring') : ''}${o.horizonY != null ? tog('horizon', 'Horizon', 'ff-px--cross') : ''}
          </div>
          <span class="az-lab">${esc(fileName || 'Image')}${dims.w ? ` · ${dims.w}×${dims.h}` : ''}</span>
        </figcaption>
      </figure>
      <div class="az-sig">
        <div class="az-sig-head"><span class="az-lab">Frame signature</span><h1 class="az-h1 az-h1--sm">${esc(r.summary)}</h1></div>
        <div class="az-tiles">${tiles}</div>
        <div class="az-sig-foot"><span>${counts} · movement yours to choose</span><a href="#az-prompt" class="az-link">Jump to prompt ↓</a></div>
      </div>
    </section>

    <section class="az-sec">
      <div class="az-sec-head">
        <div><span class="az-lab"><span class="az-no">01</span> / Readings by category</span><h2>What the frame shows</h2></div>
        <span class="az-legend">${statusChip('observed')}${statusChip('inferred')}${statusChip('unknown')}</span>
      </div>
      <div class="az-cards">
        ${cats.map((c) => catCard(r, c)).join('')}
      </div>
      <article class="az-card az-move">
        <div class="az-card-head"><span class="az-lab az-lab--ink"><span class="ff-px ff-px--cross" aria-hidden="true"></span>Camera movement</span><span class="az-chip az-st-unknown">Not in a still · you choose</span></div>
        <div class="az-move-body">
          <p>One frame can't show motion, so this isn't a reading. Pick the move you intend; the prompt and Compose use it.</p>
          <div class="az-move-opts">
            <div class="az-mvs" role="group" aria-label="Intended movement">
              ${(['static', 'pan', 'tilt', 'dolly', 'orbit'] as Movement[]).map((m) => `
              <button type="button" class="az-mv" data-act="move" data-v="${m}" data-focus="mv-${m}" aria-pressed="${movement === m}">
                <span class="az-mv-d az-mv-d--${m}" aria-hidden="true"><span class="ff-px ff-px--ring az-mv-subj"></span><span class="ff-px ff-px--cross az-mv-cam"></span><i></i></span>
                <span class="az-mv-l">${m}</span>
              </button>`).join('')}
            </div>
            <div class="az-move-foot">
              <span class="az-lab az-lab--ink">Pace</span>
              <div class="az-seg" role="group" aria-label="Pace">
                ${(['slow', 'steady'] as Pace[]).map((p) => `<button type="button" data-act="pace" data-v="${p}" data-focus="pace-${p}" aria-pressed="${pace === p}">${p}</button>`).join('')}
              </div>
              ${mvControl ? `<a class="az-link az-link--quiet" href="${esc(controlHref(mvControl))}">${esc(mvControl)} control →</a>` : ''}
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="az-sec"><h2>Try the Shot settings</h2><p>Creative controls for the canonical scene. Focal length is a default, not an image measurement.</p><label>Composition <select data-act="creative-composition"><option value="">Keep supported reference mapping / default</option>${['centered','symmetrical','rule-of-thirds','negative-space'].map(v=>`<option value="${v}" ${creativeComposition===v?'selected':''}>${v.replaceAll('-',' ')}</option>`).join('')}</select></label><label>Creative focal length <select data-act="creative-focal">${[24,35,50,85].map(v=>`<option value="${v}" ${creativeFocal===v?'selected':''}>${v} mm</option>`).join('')}</select></label><p>Only static and dolly motion transfer. Other moves, original geometry, lighting and camera angle remain in the reference notes.</p>${(r.unmappedProperties??[]).map(note=>`<p>${esc(note)}</p>`).join('')}</section>
    <section class="az-sec az-prompt-sec" id="az-prompt">
      <div class="az-prompt-side">
        <span class="az-lab"><span class="az-no">02</span> / Generated prompt</span>
        <h2>Your prompt</h2>
        <p>Each phrase is underlined in the colour of the reading it came from. Uncheck a reading to drop its phrase.</p>
        <ul class="az-key">
          <li><i class="k-comp"></i>Composition</li><li><i class="k-lens"></i>Lens</li><li><i class="k-cam"></i>Camera position</li><li><i class="k-light"></i>Light</li><li><i class="k-move"></i>Movement (your choice)</li>
        </ul>
      </div>
      <div class="az-prompt">
        <div class="az-prompt-bar"><span class="az-lab az-lab--ink">From ${r.readings.filter((x) => included.has(x.id)).length} of ${r.readings.length} readings + your movement</span><span class="az-lab">${text.split(/\s+/).length} words</span></div>
        <p class="az-prompt-text">${segs.map((s) => `<span class="${UNDERLINE[s.source]}">${esc(s.text)}</span>`).join(' ')}</p>
        <div class="az-prompt-foot">
          <span class="az-fine">Inferences from one image, not a record of how it was made.</span>
          <span class="az-prompt-actions">
            <button type="button" class="az-btn az-btn--sec" data-act="copy" data-focus="copy">Copy prompt</button>
            <button type="button" class="az-btn az-btn--pri" data-act="compose">Try the Shot →</button>
          </span>
        </div>
      </div>
    </section>`;
  }

  const tog = (k: keyof typeof ov, label: string, mod: string) =>
    `<button type="button" class="az-tog" data-act="ov" data-v="${k}" data-focus="ov-${k}" aria-pressed="${ov[k]}"><span class="az-tog-sw ${ov[k] ? `ff-px ${mod}` : ''}"></span>${label}</button>`;

  function catCard(r: AnalysisResult, c: Category) {
    const rows = r.readings.filter((x) => x.category === c);
    const on = rows.filter((x) => included.has(x.id)).length;
    return `
    <article class="az-card">
      <div class="az-card-head"><span class="az-lab az-lab--ink"><span class="ff-px ${MOD[c]}" aria-hidden="true"></span>${CATEGORY_LABEL[c]}</span><span class="az-lab">${on} / ${rows.length} in prompt</span></div>
      <div class="az-dia" aria-hidden="true">${diagram(r, c)}</div>
      ${rows.map((x) => `
      <div class="az-rd ${included.has(x.id) ? '' : 'is-off'}">
        <button type="button" class="az-inc" data-act="inc" data-v="${esc(x.id)}" data-focus="inc-${esc(x.id)}" aria-pressed="${included.has(x.id)}" aria-label="Use ${esc(x.label)} in prompt"${x.status === 'unknown' ? ' disabled' : ''}></button>
        <div class="az-rd-body">
          <div class="az-rd-row"><span class="az-lab">${esc(x.label)}</span>${meter(x.confidence)}</div>
          <span class="az-rd-v">${esc(x.value)}</span>
          <span class="az-rd-n">${esc(x.evidence)}</span>
          <div class="az-rd-row">${statusChip(x.status)}${x.control ? `<a class="az-link az-link--quiet" href="${esc(controlHref(x.control))}">${esc(x.control)} →</a>` : ''}</div>
        </div>
      </div>`).join('')}
    </article>`;
  }

  function diagram(r: AnalysisResult, c: Category): string {
    const h = r.hints ?? {};
    const o = r.overlays;
    if (c === 'composition') {
      const b = o.subjectBox;
      return `<span class="d-frame">
        ${o.thirds ? '<i class="d-g d-v1"></i><i class="d-g d-v2"></i><i class="d-g d-h1"></i><i class="d-g d-h2"></i>' : ''}
        ${b ? `<i class="d-box" style="left:${pct(b.x)};top:${pct(b.y)};width:${pct(b.w)};height:${pct(b.h)}"></i>` : ''}
        ${o.anchor ? `<i class="d-anchor ff-px ff-px--ring" style="left:${pct(o.anchor.x)};top:${pct(o.anchor.y)}"></i>` : ''}
      </span>`;
    }
    if (c === 'lens') {
      if (!h.lensMm) return '<span class="d-note">No range estimate</span>';
      const lx = (f: number) => 6 + (Math.log(f / 14) / Math.log(200 / 14)) * 88;
      const clamp = (f: number) => Math.min(200, Math.max(14, f));
      const l = lx(clamp(h.lensMm.min)), w = Math.max(1.5, lx(clamp(h.lensMm.max)) - l);
      return `<span class="d-cap">Focal length · full-frame equiv.</span><i class="d-axis"></i>
        ${[14, 24, 35, 50, 85, 200].map((f) => `<i class="d-tick" style="left:${lx(f)}%"></i><span class="d-tl" style="left:${lx(f)}%">${f}</span>`).join('')}
        <i class="d-band" style="left:${l}%;width:${w}%"></i><span class="d-band-l" style="left:${l}%">≈ ${h.lensMm.min}–${h.lensMm.max}mm · range</span>`;
    }
    if (c === 'position') {
      if (!h.cameraHeight) return '<span class="d-note">No camera height estimate</span>';
      const y = { low: 14, eye: 44, high: 70 }[h.cameraHeight ?? 'eye'];
      const ang = h.angleDeg ?? 0;
      return `<i class="d-floor"></i><i class="d-subj"></i>
        <i class="d-cam ff-px ff-px--cross" style="bottom:calc(18% + ${y}%)"></i><i class="d-camstem" style="height:${y}%"></i>
        <i class="d-sight" style="bottom:calc(18% + ${y}% + 6px);transform:rotate(${ang}deg)"></i>
        <span class="d-cap d-cap--cam">${esc((h.cameraHeight ?? 'eye') === 'eye' ? 'Eye level' : h.cameraHeight === 'low' ? 'Low' : 'High')}${h.angleDeg == null ? ' · qualitative estimate' : ` · ${ang}°`}</span>`;
    }
    if (h.lightFromDeg == null) return '<span class="d-note">No light direction estimate</span>';
    const from = Math.max(-90, Math.min(90, h.lightFromDeg ?? 0));
    const lxp = 50 + from / 90 * 38;
    return `<i class="d-floor"></i><i class="d-subj"></i><i class="d-shadow" style="${from < 0 ? 'left:57%' : 'right:57%'}"></i>
      <i class="d-sun" style="left:calc(${lxp}% - 8px)"></i><i class="d-ray" style="left:${lxp}%;transform:rotate(${90 - from * 0.5}deg)"></i>
      <span class="d-cap d-cap--r">${esc(h.lightQuality ?? '')}${h.lightQuality ? ' · ' : ''}${from < -10 ? 'from left' : from > 10 ? 'from right' : 'frontal'}</span>`;
  }

  /* ---------- error ---------- */
  const errorView = () => `
    <section class="az-error" role="alert">
      <span class="ff-px ff-px--strike" aria-hidden="true"></span>
      <h2>The analysis didn't finish.</h2>
      <p>${esc(errorMsg)}</p>
      <div class="az-error-actions"><button type="button" class="az-btn az-btn--pri" data-act="retry">Try again</button><button type="button" class="az-btn az-btn--sec" data-act="reset">Choose another image</button></div>
    </section>`;

  /* ---------- render + loop ---------- */
  function render() {
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.focus;
    root.innerHTML = `<div class="az">${stepper()}${
      step === 'upload' ? uploadView() : step === 'processing' ? processingView() : step === 'results' && result ? resultsView(result) : errorView()}</div>`;
    if (focusKey) root.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`)?.focus();
    window.clearInterval(timer);
    if (step === 'upload') { drawHero(); if (!reduce.matches) timer = window.setInterval(() => { phase++; drawHero(); }, 600); }
    if (step === 'processing') { updateProcessing(); timer = window.setInterval(() => { phase++; if (Date.now() - lastProgressAt > 900) indeterminate = true; updateProcessing(); }, reduce.matches ? 1000 : 140); }
  }

  function drawHero() {
    const fig = root.querySelector<HTMLElement>('.az-mosaic');
    if (!fig) return;
    let c = fig.querySelector('canvas');
    if (!c) { c = document.createElement('canvas'); c.style.width = '100%'; c.style.display = 'block'; fig.prepend(c); }
    const p = reduce.matches ? 3 : phase % 4;
    const W = 56, fx0 = 6, fx1 = 49, fy0 = 1, fy1 = 18, t1 = 20, t2 = 35, h1 = 7, h2 = 13;
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    paintCells(c, W, 20, (x, y) => {
      const edge = ((y === fy0 || y === fy1) && x >= fx0 && x <= fx1) || ((x === fx0 || x === fx1) && y >= fy0 && y <= fy1);
      const inside = x > fx0 && x < fx1 && y > fy0 && y < fy1;
      if (edge) return { tone: 'ink', d: 1, size: (x + y) % 2 ? 0.6 : 1 };
      if (inside && p >= 2 && (Math.hypot(x - t2, y - h1) <= 1.8 || (Math.abs(x - t2) <= 2 && y >= h1 + 3 && y <= fy1 - 1))) return { tone: 'lens', d: 1 };
      if (inside && p >= 1 && (((x === t1 || x === t2) && y % 2 === 0) || ((y === h1 || y === h2) && x % 2 === 0))) return { tone: 'composition', d: 1, size: 0.6 };
      if (inside && p >= 3 && y === 11 && x % 3 === 0) return { tone: 'camera', d: 1, size: 0.6 };
      if (inside && p === 0 && (x + 3) % 14 < 4 && 0.3 * 16 > bayer[y % 4]![x % 4]!) return { tone: 'camera', d: 1, size: 0.35 };
      if (!inside && !edge && (x < fx0 - 1 || x > fx1 + 1)) {
        const d = x < fx0 ? (fx0 - x) / 6 : (x - fx1) / 6;
        if ((0.35 - d * 0.3) * 16 > bayer[y % 4]![x % 4]!) return { tone: x < fx0 ? 'lens' : 'camera', d: 1, size: 0.35 };
      }
      return null;
    });
  }

  /* ---------- flow ---------- */
  function readDims(src: string) {
    return new Promise<{ w: number; h: number }>((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => res({ w: 0, h: 0 });
      img.src = src;
    });
  }

  async function accept(blob: Blob, name: string) {
    if (!ACCEPT.includes(blob.type)) { uploadError = 'Use a JPG, PNG or WebP image.'; render(); return; }
    if (blob.size > maxBytes) { uploadError = `That file is over ${Math.round(maxBytes / 1048576)} MB.`; render(); return; }
    uploadError = '';
    if (url) URL.revokeObjectURL(url);
    file = blob; fileName = name; url = URL.createObjectURL(blob);
    dims = await readDims(url);
    if(!dims.w||!dims.h){uploadError="This image could not be decoded.";file=null;URL.revokeObjectURL(url);url="";}
    render();
  }

  async function run() {
    if (!file) return;
    ac?.abort();
    ac = new AbortController();
    const currentRequest=ac;
    step = 'processing'; result = null; progress = { stage: 'scan', fraction: 0 }; indeterminate = !!opts.live; lastProgressAt = Date.now(); phase = 0;
    render();
    try {
      const raw = await opts.provider.analyze(file, {
        signal: ac.signal,
        onProgress: (p) => { progress = p; lastProgressAt = Date.now(); indeterminate = false; },
      });
      if(currentRequest!==ac||currentRequest.signal.aborted)return;
      const r = validateResult(raw);
      if(opts.live&&(r.simulated||r.provider!=='NVIDIA NIM'||r.model!=='meta/muse-glimmer-30b'))throw new ResultError('Unverified provider response');
      result = r;
      included = new Set(r.readings.filter((x) => x.status !== 'unknown').map((x) => x.id));
      movement = 'static'; pace = 'slow';creativeComposition='';creativeFocal=50;creativeLensEdited=false;
      step = 'results';
      render();
      root.querySelector<HTMLElement>('.az-h1')?.focus?.();
    } catch (e) {
      if (currentRequest!==ac||currentRequest.signal.aborted||(e as DOMException)?.name === 'AbortError') return;
      errorMsg = e instanceof ResultError ? `The model returned something we couldn't read (${e.message}).` : e instanceof Error?e.message:'Something went wrong while reading the image. Nothing was saved.';
      step = 'error';
      render();
    }
  }

  function reset() {
    ac?.abort();
    if (url) URL.revokeObjectURL(url);
    file = null; url = ''; fileName = ''; result = null; uploadError = ''; step = 'upload';
    render();
  }

  /* ---------- events (delegated) ---------- */
  const { signal } = live;
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if(t.dataset.act==='creative-composition'){creativeComposition=t.value;render();}
    if(t.dataset.act==='creative-focal'){creativeFocal=Number(t.value);creativeLensEdited=true;render();}
    if (t.dataset.act === 'file' && t.files?.[0]) void accept(t.files[0], t.files[0].name);
  }, { signal });

  root.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || el.dataset.act === 'file') return;
    const act = el.dataset.act, v = el.dataset.v ?? '';
    if (act === 'sample') {
      const s = opts.samples?.[Number(el.dataset.i)];
      if (!s) return;
      const blob = await (await fetch(s.src)).blob();
      void accept(blob, `${s.name.toLowerCase()}.${blob.type.split('/')[1] ?? 'png'}`);
    }
    if (act === 'cancel' || act === 'reset') reset();
    if (act === 'analyze') void run();
    if (act === 'retry') void run();
    if (act === 'ov') { ov[v as keyof typeof ov] = !ov[v as keyof typeof ov]; render(); }
    if (act === 'inc') { if (included.has(v)) included.delete(v); else included.add(v); render(); }
    if (act === 'move') { movement = v as Movement; render(); }
    if (act === 'pace') { pace = v as Pace; render(); }
    if (act === 'copy' && result) {
      const text = promptText(segments(result));
      try { await navigator.clipboard.writeText(text); } catch { el.textContent='Copy failed — select the prompt';return; }
      el.textContent = 'Copied';
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => { const b = root.querySelector('[data-act="copy"]'); if (b) b.textContent = 'Copy prompt'; }, 1600);
    }
    if (act === 'compose' && result) {
      const segs = segments(result);
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
          prompt: promptText(segs), movement, pace, simulated: result.simulated, result, creativeComposition, creativeFocal,
          readings: result.readings.filter((x) => included.has(x.id)).map(({ id, category, value, status }) => ({ id, category, value, status })),
        }));
      } catch { el.textContent='Storage unavailable — copy your prompt first';return; }
      location.href = opts.composeHref ?? '/compose?from=analyze';
    }
  }, { signal });

  // drag & drop + paste (upload step only)
  root.addEventListener('dragover', (e) => {
    if (step !== 'upload') return;
    e.preventDefault();
    root.querySelector('[data-drop]')?.classList.add('is-over');
  }, { signal });
  root.addEventListener('dragleave', (e) => {
    if ((e.target as HTMLElement).closest?.('[data-drop]')) root.querySelector('[data-drop]')?.classList.remove('is-over');
  }, { signal });
  root.addEventListener('drop', (e) => {
    if (step !== 'upload') return;
    e.preventDefault();
    root.querySelector('[data-drop]')?.classList.remove('is-over');
    const f = e.dataTransfer?.files?.[0];
    if (f) void accept(f, f.name);
  }, { signal });
  window.addEventListener('paste', (e) => {
    if (step !== 'upload') return;
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
    const f = item?.getAsFile();
    if (f) void accept(f, f.name || 'pasted-image.png');
  }, { signal });

  render();

  return () => {
    live.abort(); ac?.abort();
    window.clearInterval(timer); window.clearTimeout(copyTimer);
    if (url) URL.revokeObjectURL(url);
  };
}

/** Compose side: read (and clear) the handoff written by "Open in Compose". */
export function takeAnalyzeHandoff(): null | { prompt: string; movement: Movement; pace: Pace; simulated: boolean; readings: { id: string; category: Category; value: string; status: string }[] } {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}
