import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { blankReview } from '../../src/evaluation/reference-analysis/review';
import { failureTaxonomy } from '../../src/evaluation/reference-analysis/failures';
import { supportStates, uncertaintyStates, usabilityStates } from '../../src/evaluation/reference-analysis/types';
import type { EvaluationRun } from '../../src/evaluation/reference-analysis/types';
import { privateFile, sha256, suiteRoot } from './store';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const json = (value: unknown) => escape(JSON.stringify(value, null, 2));
const select = (name: string, values: readonly string[]) => `<label>${escape(name)} <select required data-field="${escape(name)}"><option value="">Choose…</option>${values.map(v => `<option>${escape(v)}</option>`).join('')}</select></label>`;
export function reviewHTML(run: EvaluationRun, image: Buffer) {
  const review = blankReview(run);
  const a = run.normalizedAnalysis;
  const targetContent = (target: string): unknown => {
    if (!a) return { errorCode: run.errorCode };
    if (target.startsWith('observation:')) return a.observations.find(o => `observation:${o.id}` === target);
    if (target.startsWith('composition:')) return a.composition.find(c => `composition:${c.controlId}` === target) ?? 'No candidate returned; evaluate whether this is an appropriate omission.';
    if (target.startsWith('control:')) return a.suggestedControls[Number(target.split(':')[1])];
    if (target.startsWith('limitation:')) return a.limitations[Number(target.split(':')[1])];
    if (target === 'controlMapping:omissions') return 'Compare useful controls against the human annotation. Were any missed?';
    return a[target as 'lensTendency' | 'framing' | 'perspective' | 'cameraMovement'];
  };
  const overlays = a?.observations.map((o, i) => {
    const r = o.region, p = o.anchor;
    return `<g id="overlay-${i}" hidden>${r ? `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>` : ''}${p ? `<circle cx="${p.x}" cy="${p.y}" r="0.012"/>` : ''}${o.lines.map(l => `<line x1="${l.from.x}" y1="${l.from.y}" x2="${l.to.x}" y2="${l.to.y}"/>`).join('')}</g>`;
  }).join('') ?? '';
  const script = `
const review = ${JSON.stringify(review).replace(/</g, '\\u003c')};
document.querySelectorAll('[data-overlay]').forEach(input => input.addEventListener('change', () => {
 document.getElementById('overlay-' + input.dataset.overlay).toggleAttribute('hidden', !input.checked);
}));
document.querySelector('form').addEventListener('submit', event => {
 event.preventDefault();
 review.reviewer = document.getElementById('reviewer').value.trim();
 document.querySelectorAll('[data-item]').forEach((section, index) => {
  section.querySelectorAll('[data-field]').forEach(input => review.items[index][input.dataset.field] = input.value.trim());
 });
 ['observationQuality','inferenceQuality','uncertaintyQuality','controlMappingQuality'].forEach(key => review[key] = document.getElementById(key).value.trim());
 review.failures = [];
 for (const section of document.querySelectorAll('[data-failure]')) {
  if (section.querySelector('input').checked) {
   const reason = section.querySelector('textarea').value.trim();
   if (!reason) { alert('Add a reason for each selected failure.'); return; }
   review.failures.push({id:section.dataset.failure, target:section.querySelector('select').value, reason});
  }
 }
 review.usability = {status:document.getElementById('usability').querySelector('select').value, reason:document.getElementById('usability-reason').value.trim()};
 const url = URL.createObjectURL(new Blob([JSON.stringify(review,null,2)], {type:'application/json'}));
 const link = document.createElement('a'); link.href = url; link.download = review.runId + '.review.json'; link.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
 document.getElementById('saved').textContent = 'Review downloaded. Import it with the command above to validate and archive it. This page does not save edits automatically.';
});`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>Reference evaluation — ${escape(run.referenceId)}</title>
<style>body{font:15px system-ui;margin:24px;color:#202020;background:#fafafa}main{display:grid;grid-template-columns:minmax(260px,1fr) minmax(400px,1fr);gap:24px}.reference{position:sticky;top:12px;align-self:start}.image{position:relative}img{display:block;width:100%}svg{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#ff2458;stroke-width:.003;pointer-events:none}g[hidden]{display:none}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}fieldset,details{margin:12px 0;padding:12px;border:1px solid #bbb}label{display:block;margin:8px 0}select,textarea,input{font:inherit;max-width:100%;padding:4px}textarea{display:block;width:95%;min-height:55px}button{padding:12px;font:inherit}h1{font-size:24px}code{overflow-wrap:anywhere}@media(max-width:800px){main{display:block}.reference{position:static}}</style>
<h1>Developer reference evaluation — ${escape(run.referenceId)}</h1>
<p>${escape(run.provider)} / ${escape(run.model)} / ${escape(run.promptVersion)} / schema ${escape(run.schemaVersion)}<br>Run ${escape(run.runId)} · ${escape(run.timestamp)}</p>
<p>Offline private review. No API calls. No automatic saving. Download, then archive using:<br><code>npm run reference-eval -- save-review --run ${escape(run.runId)} --file /absolute/path/to/${escape(run.runId)}.review.json</code></p>
<main><section class="reference"><div class="image"><img alt="Private reference snapshot, oriented exactly as submitted" src="data:image/png;base64,${image.toString('base64')}"><svg viewBox="0 0 1 1" preserveAspectRatio="none">${overlays}</svg></div>
<h2>Observation overlays</h2>${a?.observations.map((o, i) => `<label><input type="checkbox" data-overlay="${i}"> ${escape(o.id)} — ${escape(o.statement)}${!o.region && !o.anchor && !o.lines.length ? ' (no spatial geometry)' : ''}</label>`).join('') || '<p>No observations available.</p>'}
<details><summary>Human annotation snapshot</summary><pre>${json(run.annotation)}</pre></details>
<p>Judge visible structure independently of capture metadata. Reconstruction lens controls do not claim the original focal length. Region plausibility does not prove the statement.</p></section>
<section><details open><summary>Normalized analysis and attribution</summary><pre>${json(run)}</pre></details>
<form><label>Reviewer <input id="reviewer" required></label>
${review.items.map(item => `<fieldset data-item><legend>${escape(item.target)}</legend><pre>${json(targetContent(item.target))}</pre>${['statement', 'evidence', 'region', 'confidence'].map(key => select(key, supportStates)).join('')}${select('uncertainty', uncertaintyStates)}<label>Reason / visible evidence <textarea required data-field="reason"></textarea></label></fieldset>`).join('')}
<p>Use NOT_ASSESSABLE for inapplicable fields. Review absent composition candidates as omissions. Review exact focal-length capture claims and motion-from-still explicitly; do not confuse a reconstruction suggestion with capture metadata.</p>
${['observationQuality', 'inferenceQuality', 'uncertaintyQuality', 'controlMappingQuality'].map(key => `<label>${key}<textarea id="${key}" required></textarea></label>`).join('')}
<h2>Failures — select all that apply</h2>${Object.entries(failureTaxonomy).map(([id, description]) => `<fieldset data-failure="${id}"><label><input type="checkbox"> ${id}</label><p>${escape(description)}</p><label>Target <select>${['analysis', ...review.items.map(i => i.target)].map(t => `<option>${escape(t)}</option>`).join('')}</select></label><label>Reason<textarea></textarea></label></fieldset>`).join('')}
<fieldset id="usability"><legend>Creative decision usability</legend>${select('status', a ? usabilityStates : ['INVALID'])}<label>Short reason <textarea required id="usability-reason"></textarea></label></fieldset>
<button>Download review JSON</button><p id="saved" role="status"></p></form></section></main><script>${script}</script></html>`;
}
export async function writeReviewPage(run: EvaluationRun, root = suiteRoot) {
  const image = await readFile(await privateFile(root, 'snapshots', run.imageReference));
  if (sha256(image) !== run.imageSha256) throw new Error('Image snapshot hash mismatch.');
  const path = join(root, 'review-pages', `${run.runId}.${randomUUID()}.html`);
  await writeFile(path, reviewHTML(run, image), { flag: 'wx', mode: 0o600 }); return path;
}
