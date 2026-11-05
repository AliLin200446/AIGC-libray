/**
 * Framefield — clip detail page renderer (R1)
 * renderClipPage(root, model) → dispose(). Framework-free.
 * One layout for every clip page: hero · 01 setup · 02 prompt · 03 evidence · 04 sources.
 */
import type { ClipPage, ClipParam, ClaimStatus, ParamFamily } from './clip-model';
import { EVIDENCE_CELLS } from './clip-model';
import { renderDiagram, type DiagramView } from './clip-diagram';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Only http(s) and same-site paths are allowed into href/src. */
const safeUrl = (u?: string) => (u && (/^https?:\/\//i.test(u) || (/^\/(?![\\/])/.test(u)) || u.startsWith('#')) ? u : '#');

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const MODULE: Record<ParamFamily, string> = {
  camera: 'ff-px--cross', composition: 'ff-px--checker', lens: 'ff-px--ring', light: 'ff-px--ink',
};

const CLAIM_LABEL: Record<ClaimStatus, string> = {
  observed: 'Observed', inferred: 'Inferred', unverified: 'Unverified', 'not-supported': 'Not supported',
};

const meter = (n: number, label?: string) =>
  `<span class="cp-meter" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${
    [0, 1, 2, 3, 4].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

const brackets = '<span class="cp-brackets" aria-hidden="true"></span>';

/* ---------- sections ---------------------------------------------------- */

function hero(m: ClipPage): string {
  const idx = m.index != null ? ` · ${String(m.index).padStart(2, '0')}` : '';
  const tags = [
    `<span class="cp-tag"><span class="ff-px ff-px--cross" aria-hidden="true"></span>${esc(m.technique)}</span>`,
    ...m.tags.map((t) => `<span class="cp-tag">${esc(t)}</span>`),
  ].join('');
  const ev = m.status.evidence;
  return `
  <section class="cp-hero">
    <div class="cp-hero-text">
      <div class="cp-eyebrow"><span class="ff-px ff-px--cross" aria-hidden="true"></span>Motion study · ${esc(m.collection)}${idx}</div>
      <h1 class="cp-title">${esc(m.title)}</h1>
      ${m.subtitle ? `<p class="cp-subtitle">${esc(m.subtitle)}</p>` : ''}
      ${m.tagline ? `<p class="cp-tagline">${esc(m.tagline)}</p>` : ''}
      <div class="cp-tags">${tags}</div>
      <dl class="cp-status">
        <div><dt>Media</dt><dd>${esc(m.status.media)}</dd></div>
        <div><dt>Parameters</dt><dd>${esc(m.status.parameters)}</dd></div>
        <div><dt>Evidence</dt><dd>${meter(EVIDENCE_CELLS[ev])}<span class="cp-ev-${ev}">${esc(ev.charAt(0).toUpperCase() + ev.slice(1))}</span></dd></div>
      </dl>
      <div class="cp-actions">
        <a class="cp-btn cp-btn--pri" href="#clip-prompt">Get the prompt <span aria-hidden="true">↓</span></a>
        ${m.composeHref ? `<a class="cp-btn cp-btn--sec" href="${esc(safeUrl(m.composeHref))}">Try in Compose <span aria-hidden="true">→</span></a>` : ''}
      </div>
    </div>
    <div class="cp-hero-media">${media(m)}</div>
  </section>`;
}

function media(m: ClipPage): string {
  const md = m.media;
  if(md.kind==='hosted')return `<div class="cp-player"><video class="cp-hosted" controls playsinline preload="none" poster="${esc(safeUrl(md.posterUrl))}" src="${esc(safeUrl(md.url))}" aria-label="${esc(m.title)}"></video>${brackets}</div><p class="cp-link">${esc(md.attribution)}</p>`;
  if (md.kind !== 'official') {
    const pending = md.kind === 'pending';
    return `
    <div class="cp-player cp-player--${md.kind}">
      ${brackets}
      <div class="cp-player-empty">
        <span class="cp-lab">${pending ? 'Footage pending' : 'Schematic study'}</span>
        <span class="cp-player-note">${esc(md.note ?? (pending
          ? 'This page is a study brief. Parameters stay unavailable until footage is reviewed.'
          : 'Original geometric study artwork. No footage is included.'))}</span>
      </div>
    </div>`;
  }
  const dur = md.durationSec;
  const pct = (s: number) => (dur ? Math.max(0, Math.min(100, (s / dur) * 100)) : 0);
  const timeline = dur ? `
    <figure class="cp-timeline">
      <div class="cp-track">
        ${md.studied ? `<span class="cp-studied" style="left:${pct(md.studied.start)}%;width:${pct(md.studied.end) - pct(md.studied.start)}%"></span>` : ''}
        ${(md.marks ?? []).map((k) => `<span class="cp-mark" style="left:${pct(k.at)}%" title="${esc(mmss(k.at))} ${esc(k.label)}"></span>`).join('')}
      </div>
      <figcaption>
        ${md.studied ? `<span><b>${mmss(md.studied.start)}–${mmss(md.studied.end)}</b> Studied · ${esc(md.studied.label)}</span>` : ''}
        ${(md.marks ?? []).map((k) => `<span><b>${mmss(k.at)}</b> ${esc(k.label)}</span>`).join('')}
        <span>${mmss(dur)} full upload${md.containsCuts ? ' · contains cuts' : ''}</span>
      </figcaption>
    </figure>` : '';
  const poster = md.posterUrl ? `<img class="cp-poster" src="${esc(safeUrl(md.posterUrl))}" alt="" loading="lazy">` : '';
  return `
    <div class="cp-player" data-embed="${esc(safeUrl(md.embedUrl))}">
      ${poster}
      <button type="button" class="cp-load" aria-label="Load the official player from ${esc(md.provider === 'youtube' ? 'YouTube' : 'Vimeo')}">
        <span class="cp-play" aria-hidden="true"></span>
        <span class="cp-lab cp-lab--ink">Load official player</span>
        <span class="cp-player-note">Connects to ${md.provider === 'youtube' ? 'YouTube' : 'Vimeo'} · nothing loads until you click</span>
      </button>
      ${brackets}
    </div>
    ${timeline}
    <a class="cp-link" href="${esc(safeUrl(md.pageUrl))}" target="_blank" rel="noopener">${esc(md.channel)} / ${md.provider === 'youtube' ? 'YouTube' : 'Vimeo'} · ${esc(md.uploadTitle)} ↗</a>`;
}

function sectionHead(no: string, kicker: string, title: string, note?: string) {
  return `
  <div class="cp-sec-head">
    <div class="cp-kicker"><span class="cp-no">${no}</span> / ${esc(kicker)}</div>
    <h2>${esc(title)}</h2>
    ${note ? `<p>${esc(note)}</p>` : ''}
  </div>`;
}

function paramRow(p: ClipParam): string {
  const badge = p.status === 'unknown' ? '<span class="cp-chip cp-chip--unv">Unknown</span>' : '';
  return `
  <div class="cp-prow${p.status === 'unavailable' ? ' is-unavailable' : ''}">
    <dt><span class="ff-px ${MODULE[p.family]}" aria-hidden="true"></span>${esc(p.label)}</dt>
    <dd>${esc(p.value)}${badge}</dd>
  </div>`;
}

function setup(m: ClipPage): string {
  const diagram = m.setup ? `
    <figure class="cp-diagram">
      <div class="cp-diagram-bar">
        <div class="cp-seg" role="group" aria-label="Diagram view">
          <button type="button" data-view="plan" aria-pressed="true">Plan</button>
          <button type="button" data-view="elevation" aria-pressed="false">Elevation</button>
        </div>
        <span class="cp-lab">Not to scale</span>
      </div>
      <div class="cp-diagram-stage">${renderDiagram(m.setup, 'plan')}</div>
    </figure>` : '';
  const negs = m.negatives.length ? `
    <div class="cp-prow">
      <dt><span class="ff-px ff-px--strike" aria-hidden="true"></span>Negative constraints</dt>
      <dd class="cp-negs">${m.negatives.map((n) => `<span class="cp-neg">${esc(n)}</span>`).join('')}</dd>
    </div>` : '';
  return `
  <section class="cp-section cp-setup${m.setup ? '' : ' no-diagram'}">
    ${sectionHead('01', 'Authored camera parameters', 'Camera setup',
      m.setupNote ?? 'A creative brief for the shot, not a reconstruction of the original rig. Diagram positions are relative.')}
    ${diagram}
    <dl class="cp-params">${m.params.map(paramRow).join('')}${negs}</dl>
  </section>`;
}

function prompt(m: ClipPage): string {
  const words = m.prompt.trim().split(/\s+/).length;
  return `
  <section class="cp-section" id="clip-prompt">
    ${sectionHead('02', 'Curated camera prompt', 'Prompt', 'Built from the parameters above.')}
    <div class="cp-prompt">
      <div class="cp-prompt-bar"><span>${esc(m.promptLabel ?? `Camera · ${m.technique} · R1`)}</span><span>${words} words</span></div>
      <p class="cp-prompt-text">${esc(m.prompt)}</p>
      <div class="cp-prompt-foot">
        <span>${esc(m.promptNote ?? 'Creative direction · not capture metadata')}</span>
        <div class="cp-prompt-actions">
          ${m.composeHref ? `<a class="cp-btn cp-btn--sec" href="${esc(safeUrl(m.composeHref))}">Try in Compose →</a>` : ''}
          <button type="button" class="cp-btn cp-btn--pri cp-copy" aria-live="polite">Copy prompt</button>
        </div>
      </div>
    </div>
  </section>`;
}

function evidence(m: ClipPage): string {
  const insp = m.inspection ? `
    <dl class="cp-inspection">
      <div><dt>Method</dt><dd>${esc(m.inspection.method)}</dd></div>
      <div><dt>Inspected</dt><dd>${esc(m.inspection.date)}</dd></div>
    </dl>` : '';
  const body = m.claims.length ? `
    <div class="cp-claims-head" aria-hidden="true"><span>Claim</span><span>Status</span><span>Strength</span></div>
    <ul class="cp-claims">${m.claims.map((c) => `
      <li>
        <div class="cp-claim"><span>${esc(c.claim)}</span><small>${esc(c.note)}</small></div>
        <span class="cp-claim-status"><span class="cp-chip cp-chip--${c.status}">${CLAIM_LABEL[c.status]}</span></span>
        ${meter(c.strength, `Evidence strength ${c.strength} of 5`)}
      </li>`).join('')}
    </ul>` : `
    <div class="cp-empty">
      <span class="ff-px ff-px--strike" aria-hidden="true"></span>
      <p>${esc(m.claimsEmpty ?? 'No footage reviewed. No visual observations recorded.')}</p>
    </div>`;
  return `
  <section class="cp-section">
    <div class="cp-sec-head">
      <div class="cp-kicker"><span class="cp-no">03</span> / Observations &amp; evidence</div>
      <h2>What we can claim</h2>
      <p>Technique research, not scene verification. Each claim is rated against what the source shows.</p>
      ${insp}
    </div>
    <div class="cp-claims-wrap">${body}</div>
  </section>`;
}

function sources(m: ClipPage): string {
  return `
  <section class="cp-section">
    ${sectionHead('04', 'Source & rights', 'Sources')}
    <div class="cp-sources">
      ${m.sources.map((s) => {
        const inner = `<span class="cp-lab">${esc(s.role)}</span><span class="cp-src-title">${esc(s.title)}</span><span class="cp-src-pub">${esc(s.publisher)}${s.url ? ' ↗' : ''}</span>`;
        return s.url
          ? `<a class="cp-src" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${inner}</a>`
          : `<div class="cp-src">${inner}</div>`;
      }).join('')}
      <p class="cp-rights">${esc(m.rights)}</p>
    </div>
  </section>`;
}

/* ---------- page -------------------------------------------------------- */

export function clipPageHTML(m: ClipPage): string {
  const pager = `
    <div class="cp-pager">
      ${m.prev ? `<a href="${esc(safeUrl(m.prev.href))}" aria-label="Previous clip, ${esc(m.prev.label)}">← ${esc(m.prev.label)}</a>` : ''}
      ${m.next ? `<a href="${esc(safeUrl(m.next.href))}" aria-label="Next clip, ${esc(m.next.label)}">${esc(m.next.label)} →</a>` : ''}
    </div>`;
  return `
  <div class="cp" data-ff-no-trail data-clip="${esc(m.id)}">
    <div class="cp-crumbs">
      <nav aria-label="Breadcrumb"><a href="${esc(safeUrl(m.backHref))}">← All clips</a><span aria-hidden="true">/</span><span>${esc(m.collection)}${m.index != null ? ` · ${String(m.index).padStart(2, '0')}` : ''}</span></nav>
      ${pager}
    </div>
    ${hero(m)}
    ${setup(m)}
    ${prompt(m)}
    ${evidence(m)}
    ${sources(m)}
  </div>`;
}

/** Render into `root` (e.g. main.clips-main) and wire interactions. Returns dispose. */
export function renderClipPage(root: HTMLElement, m: ClipPage): () => void {
  root.innerHTML = clipPageHTML(m);
  const ac = new AbortController();
  const { signal } = ac;
  let copyTimer = 0;
  const allowed = () => m.media.kind !== 'official' || !m.media.expiresAt || Date.parse(m.media.expiresAt)>Date.now();
  const stop = () => {root.querySelectorAll('video').forEach(v=>v.pause()); root.querySelectorAll('iframe').forEach(f=>f.remove()); root.querySelectorAll<HTMLElement>('.cp-load').forEach(b=>{b.hidden=false;}); };
  const check = () => { if(!allowed()){stop();const b=root.querySelector<HTMLButtonElement>('.cp-load');if(b){b.disabled=true;b.textContent='Display permission expired · view source';}} };
  const expiryTimer=m.media.kind==='official'?window.setInterval(check,4000):0;
  const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)stop();},{threshold:0.15});
  const player=root.querySelector('.cp-player');if(player)observer.observe(player);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal});

  // player facade → iframe only after an explicit click
  root.querySelectorAll<HTMLElement>('.cp-player[data-embed]').forEach((p) => {
    p.querySelector('.cp-load')?.addEventListener('click', () => {
      if(!allowed()){check();return;}
      const src = p.dataset.embed;
      if (!src || src === '#') return;
      const f = document.createElement('iframe');
      f.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
      f.title = m.media.kind === 'official' ? m.media.uploadTitle : m.title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.className = 'cp-iframe';
      const load=p.querySelector<HTMLElement>('.cp-load');if(load)load.hidden=true;
      p.querySelector('.cp-poster')?.remove();
      p.prepend(f);
      p.classList.add('is-loaded');
    }, { signal });
  });

  // diagram view toggle
  const stage = root.querySelector<HTMLElement>('.cp-diagram-stage');
  root.querySelectorAll<HTMLButtonElement>('.cp-seg [data-view]').forEach((b) => {
    b.addEventListener('click', () => {
      if (!m.setup || !stage) return;
      const view = b.dataset.view as DiagramView;
      stage.innerHTML = renderDiagram(m.setup, view);
      root.querySelectorAll('.cp-seg [data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }, { signal });
  });

  // copy prompt
  const copyBtn = root.querySelector<HTMLButtonElement>('.cp-copy');
  copyBtn?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(m.prompt); } catch { if(!signal.aborted)copyBtn.textContent='Copy failed · select prompt'; return; }
    if(signal.aborted)return;
    copyBtn.textContent = 'Copied';
    copyBtn.classList.add('is-done');
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copyBtn.textContent = 'Copy prompt'; copyBtn.classList.remove('is-done'); }, 1600);
  }, { signal });

  return () => { ac.abort(); window.clearTimeout(copyTimer); window.clearInterval(expiryTimer);observer.disconnect();stop(); };
}
