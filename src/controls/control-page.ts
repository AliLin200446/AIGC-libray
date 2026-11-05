/**
 * Framefield — control page renderer (R1)
 * renderControlPage(root, model, { mountStudy }) → dispose.
 * Sections: hero · 01 What changes · 02 Configure (+ live spec) · 03 Failure modes · 04 Model evidence.
 * Removed vs. the old page: empty Model A/B/C cards, all-"Untested" assessment grid,
 * "pending" model translation, full spec table, repeated disclaimers.
 */
import type { ControlPageModel, ControlDef, ParamDef, ParamValues, MountStudy, StudyHost } from './control-model';
import { defaults } from './control-model';
import { mountMiniMosaic } from '../pixel/mini-mosaic';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeUrl = (u?: string) => (u && (/^https?:\/\//i.test(u) || u.startsWith('/') || u.startsWith('#')) ? u : '#');
const pad = (n: number) => String(n).padStart(2, '0');

const MODULE = { camera: 'ff-px--cross', lens: 'ff-px--ring', composition: 'ff-px--checker' } as const;

function fmt(p: ParamDef, v: ParamValues[string]): string {
  if (p.kind === 'range') {
    const n = Number(v);
    const digits = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
    if (p.unit === 'f/') return `f/${n.toFixed(1)}`;
    if (p.unit === '°') return `${n}°`;
    if (p.unit === 'frame') return `${n.toFixed(2)} of frame`;
    return `${n.toFixed(digits)} ${p.unit}`;
  }
  if (p.kind === 'toggle') return v ? 'On' : 'Off';
  return p.options.find((o) => o.value === v)?.label ?? String(v);
}

function field(p: ParamDef, v: ParamValues[string]): string {
  const id = `ct-${p.id}`;
  if (p.kind === 'range') {
    return `
    <div class="ct-field">
      <label class="ct-frow" for="${id}"><span class="ct-flab">${esc(p.label)}</span><span class="ct-fval" data-val="${p.id}">${esc(fmt(p, v))}</span></label>
      <input id="${id}" class="ct-range" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${Number(v)}" data-param="${p.id}" aria-describedby="${id}-h">
      <span class="ct-fhint" id="${id}-h">${esc(p.hint)}</span>
    </div>`;
  }
  if (p.kind === 'toggle') {
    return `
    <div class="ct-field">
      <div class="ct-frow"><span class="ct-flab" id="${id}-l">${esc(p.label)}</span>
        <button type="button" class="ct-switch" data-param="${p.id}" aria-pressed="${Boolean(v)}" aria-labelledby="${id}-l" aria-describedby="${id}-h"><span aria-hidden="true"></span><b data-val="${p.id}">${v ? 'On' : 'Off'}</b></button>
      </div>
      <span class="ct-fhint" id="${id}-h">${esc(p.hint)}</span>
    </div>`;
  }
  return `
    <div class="ct-field">
      <div class="ct-frow ct-frow--wrap"><span class="ct-flab" id="${id}-l">${esc(p.label)}</span>
        <div class="ct-seg" role="group" aria-labelledby="${id}-l">
          ${p.options.map((o) => `<button type="button" data-param="${p.id}" data-value="${esc(o.value)}" aria-pressed="${o.value === v}">${esc(o.label)}</button>`).join('')}
        </div>
      </div>
      <span class="ct-fhint">${esc(p.hint)}</span>
    </div>`;
}

function evidence(m: ControlPageModel): string {
  const c = m.control;
  if (!c.evidence.length) {
    return `
    <div class="ct-ev-empty">
      <div class="ct-ev-left">
        <span class="ct-chip ct-chip--untested">Not tested yet</span>
        <p class="ct-ev-big">No model has been run against this control.</p>
        <p class="ct-ev-small">Nothing here is a claim about any model's behavior.</p>
      </div>
      <div class="ct-ev-right">
        <span class="ct-lab">A matching experiment needs</span>
        <ul>${m.experimentNeeds.map((n) => `<li><span aria-hidden="true"></span>${esc(n)}</li>`).join('')}</ul>
        <span class="ct-lab">Rated on intent fidelity · consistency · collateral change</span>
      </div>
    </div>`;
  }
  return `
    <div class="ct-ev-table" role="table" aria-label="Model evidence">
      <div class="ct-ev-row ct-ev-head" role="row">
        <span role="columnheader">Model</span><span role="columnheader">Intent fidelity</span>
        <span role="columnheader">Consistency</span><span role="columnheader">Collateral change</span><span aria-hidden="true"></span>
      </div>
      ${c.evidence.map((e) => `
      <a class="ct-ev-row" role="row" href="${esc(safeUrl(e.href))}">
        <span role="cell" class="ct-ev-model"><b>${esc(e.model)}</b><small>${e.runs} paired runs · ${esc(e.date)}</small></span>
        <span role="cell">${esc(e.intentFidelity)}</span><span role="cell">${esc(e.consistency)}</span><span role="cell">${esc(e.collateralChange)}</span>
        <span class="ct-go" aria-hidden="true">→</span>
      </a>`).join('')}
    </div>
    <p class="ct-ev-note">Strong collateral change means unrelated aspects were preserved. Each row opens that model's runs, known behaviors and failures, and its translated instruction.</p>`;
}

export function controlPageHTML(m: ControlPageModel, v: ParamValues): string {
  const c = m.control;
  const id = `C-${pad(c.no)}`;
  return `
  <div class="ct" data-control="${esc(c.slug)}">
    <div class="ct-crumbs">
      <nav aria-label="Breadcrumb"><a href="${esc(safeUrl(m.indexHref))}">← Index</a><span aria-hidden="true">/</span><span>${esc(c.familyLabel)}</span></nav>
      <div class="ct-pager">
        ${m.prev ? `<a href="${esc(safeUrl(m.prev.href))}">← ${esc(m.prev.label)}</a>` : ''}
        ${m.next ? `<a href="${esc(safeUrl(m.next.href))}">${esc(m.next.label)} →</a>` : ''}
      </div>
    </div>

    <section class="ct-hero">
      <div class="ct-hero-text">
        <div class="ct-kick"><span class="ff-px ${MODULE[c.family]}" aria-hidden="true"></span>${id} · ${esc(c.familyLabel)}</div>
        <div class="ct-titlerow">
          <h1 class="ct-h1${c.title.length >= 10 ? ' ct-h1--long' : c.title.length >= 7 ? ' ct-h1--mid' : ''}">${esc(c.title)}</h1>
          <div class="ct-mini" aria-hidden="true"></div>
        </div>
        <p class="ct-def">${esc(c.definition)}</p>
        <div class="ct-chips">
          <span class="ct-chip ct-chip--${c.status}">${c.status === 'canonical' ? 'Canonical' : 'Draft'} · rev ${c.revision}</span>
          <span class="ct-chip ${c.evidence.length ? 'ct-chip--tested' : 'ct-chip--untested'}">${c.evidence.length ? `Tested · ${c.evidence.length} model${c.evidence.length > 1 ? 's' : ''}` : 'Untested'}</span>
          <span class="ct-chip ct-chip--plain">${esc(c.media)}</span>
        </div>
        <blockquote class="ct-intent"><span class="ct-lab">Canonical intent</span><span>${esc(c.intent)}</span></blockquote>
        <div class="ct-actions">
          <a class="ct-btn ct-btn--pri" href="#configure">Configure <span aria-hidden="true">↓</span></a>
          <a class="ct-btn ct-btn--sec ct-compose" href="${esc(safeUrl(m.composeHref(c, v)))}">Try in Compose <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <figure class="ct-study">
        <div class="ct-study-frame">
          <div class="ct-study-stage" data-study><div class="ct-study-ph"><span>[ Deterministic study ]</span></div></div>
          <span class="ct-hud" aria-live="off"></span>
          <span class="ct-brk" aria-hidden="true"></span>
        </div>
        <figcaption>
          <span class="ct-lab">Deterministic study · not model output</span>
          <span class="ct-transport">
            <button type="button" data-act="replay">▶ Replay</button>
            <button type="button" data-act="pause">Pause</button>
          </span>
        </figcaption>
      </figure>
    </section>

    <section class="ct-sec" aria-labelledby="ct-s1">
      <div class="ct-shead"><span class="ct-lab"><span class="ct-no">01</span> / Observable behavior</span><h2 id="ct-s1">What changes</h2></div>
      <div class="ct-sbody ct-behaviors">
        ${c.behaviors.map((b) => `<div class="ct-card"><span class="ff-px ${MODULE[c.family]}" aria-hidden="true"></span><p>${esc(b)}</p></div>`).join('')}
      </div>
    </section>

    <section class="ct-sec" id="configure" aria-labelledby="ct-s2">
      <div class="ct-shead">
        <span class="ct-lab"><span class="ct-no">02</span> / Parameters</span>
        <h2 id="ct-s2">Configure</h2>
        <p>Values stay local and never generate media. Supported settings update the study; preview limits are listed beside the spec.</p>
      </div>
      <div class="ct-sbody ct-config">
        <div class="ct-fields">${c.params.map((p) => field(p, v[p.id]!)).join('')}</div>
        <div class="ct-spec">
          <div class="ct-spec-bar"><span class="ct-lab ct-lab--ink">Control spec</span><span class="ct-lab ct-spec-state"></span></div>
          <p class="ct-spec-text" aria-live="polite"></p>
          <p class="ct-spec-note">${esc(c.specNote)}</p>
          <div class="ct-spec-foot">
            <button type="button" class="ct-link" data-act="reset">Reset</button>
            <span class="ct-spec-actions">
              <button type="button" class="ct-btn ct-btn--sec" data-act="copy">Copy spec</button>
              <a class="ct-btn ct-btn--pri ct-compose" href="${esc(safeUrl(m.composeHref(c, v)))}">Open in Compose →</a>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="ct-sec" aria-labelledby="ct-s3">
      <div class="ct-shead">
        <span class="ct-lab"><span class="ct-no">03</span> / Test criteria</span>
        <h2 id="ct-s3">Failure modes</h2>
        <p>What to look for when a result claims to be ${/^[aeiou]/i.test(c.title) ? 'an' : 'a'} ${esc(c.title.toLowerCase())}. Inspection criteria, not measured results.</p>
      </div>
      <ol class="ct-sbody ct-fails">
        ${c.failures.map((f, i) => `<li><span class="ff-px ff-px--strike" aria-hidden="true"></span><span class="ct-fid">F${i + 1}</span><span>${esc(f)}</span></li>`).join('')}
      </ol>
    </section>

    <section class="ct-sec" aria-labelledby="ct-s4">
      <div class="ct-shead">
        <span class="ct-lab"><span class="ct-no">04</span> / Evidence</span>
        <h2 id="ct-s4">Model evidence</h2>
        <p>Ratings and model-specific translations appear only after a matching experiment.</p>
      </div>
      <div class="ct-sbody">${evidence(m)}</div>
    </section>
  </div>`;
}

export function renderControlPage(root: HTMLElement, m: ControlPageModel, opts: { mountStudy?: MountStudy } = {}): () => void {
  const c: ControlDef = m.control;
  const v: ParamValues = defaults(c);
  root.innerHTML = controlPageHTML(m, v);

  const ac = new AbortController();
  const { signal } = ac;
  let copyTimer = 0;

  const specEl = root.querySelector<HTMLElement>('.ct-spec-text')!;
  const stateEl = root.querySelector<HTMLElement>('.ct-spec-state')!;
  const hudEl = root.querySelector<HTMLElement>('.ct-hud')!;

  const mini = mountMiniMosaic(root.querySelector<HTMLElement>('.ct-mini')!, () => ({ slug: c.slug, values: v }));

  let study: StudyHost | null = null;
  const stage = root.querySelector<HTMLElement>('[data-study]')!;
  if (opts.mountStudy) {
    stage.innerHTML = '';
    study = opts.mountStudy(stage, c, { ...v });
  }

  const isDefault = () => c.params.every((p) => v[p.id] === p.default);
  const sync = () => {
    specEl.textContent = c.spec(v);
    stateEl.textContent = isDefault() ? 'Default' : 'Edited';
    hudEl.textContent = `${c.title} · ${c.params.map((p) => fmt(p, v[p.id]!)).join(' · ')}`;
    c.params.forEach((p) => {
      root.querySelectorAll<HTMLElement>(`[data-val="${p.id}"]`).forEach((el) => (el.textContent = fmt(p, v[p.id]!)));
      if (p.kind === 'choice') {
        root.querySelectorAll<HTMLButtonElement>(`.ct-seg [data-param="${p.id}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v[p.id]!)));
      } else if (p.kind === 'toggle') {
        root.querySelector(`.ct-switch[data-param="${p.id}"]`)?.setAttribute('aria-pressed', String(Boolean(v[p.id]!)));
      } else {
        const input = root.querySelector<HTMLInputElement>(`input[data-param="${p.id}"]`);
        if (input && Number(input.value) !== Number(v[p.id]!)) input.value = String(v[p.id]!);
      }
    });
    const href = safeUrl(m.composeHref(c, v));
    root.querySelectorAll<HTMLAnchorElement>('.ct-compose').forEach((a) => (a.href = href));
    mini.update();
    const transport = root.querySelector<HTMLButtonElement>('[data-act="pause"]');
    transport?.setAttribute('aria-pressed','false');
    if (transport) transport.textContent = 'Pause';
    study?.update({ ...v });
  };

  root.querySelectorAll<HTMLButtonElement>('.ct-seg [data-param]').forEach((b) =>
    b.addEventListener('click', () => { v[b.dataset.param!] = b.dataset.value!; sync(); }, { signal }));
  root.querySelectorAll<HTMLButtonElement>('.ct-switch').forEach((b) =>
    b.addEventListener('click', () => { v[b.dataset.param!] = !v[b.dataset.param!]; sync(); }, { signal }));
  root.querySelectorAll<HTMLInputElement>('input[data-param]').forEach((i) =>
    i.addEventListener('input', () => { v[i.dataset.param!] = Number(i.value); sync(); }, { signal }));

  root.querySelector('[data-act="reset"]')?.addEventListener('click', () => { Object.assign(v, defaults(c)); sync(); }, { signal });
  const copyBtn = root.querySelector<HTMLButtonElement>('[data-act="copy"]')!;
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(c.spec(v)); } catch { copyBtn.textContent='Copy failed — select spec';return; }
    copyBtn.textContent = 'Copied';
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => (copyBtn.textContent = 'Copy spec'), 1600);
  }, { signal });
  root.querySelector('[data-act="replay"]')?.addEventListener('click', () => { study?.replay?.(); pause?.setAttribute('aria-pressed','false'); if(pause)pause.textContent='Pause'; }, { signal });
  const pause=root.querySelector<HTMLButtonElement>('[data-act="pause"]');
  pause?.setAttribute('aria-pressed','false');
  pause?.addEventListener('click',()=>{study?.pause?.();const paused=pause.getAttribute('aria-pressed')!=='true';pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume':'Pause';},{signal});

  sync();
  return () => { ac.abort(); window.clearTimeout(copyTimer); mini.dispose(); study?.dispose(); };
}

/** Convenience: build a page model from the ordered control list. */
export function pageModelFor(list: ControlDef[], slug: string, base: Omit<ControlPageModel, 'control' | 'prev' | 'next'>): ControlPageModel | null {
  const i = list.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  const at = (k: number) => list[(k + list.length) % list.length];
  const link = (x: ControlDef) => ({ href: `/library/${x.slug}`, label: `C-${pad(x.no)} ${x.title}` });
  return { ...base, control: list[i]!, prev: link(at(i - 1)!), next: link(at(i + 1)!) };
}
