/**
 * Framefield — Studies page renderer (R1)
 * renderStudiesPage(root, model) → dispose. Framework-free.
 * Filters live in the URL: ?source=film&move=dolly,pan&size=wide
 */
import type { StudiesModel, Study, Movement, ShotSize, StudySource } from './studies-model';
import { renderDiagram } from '../clips/clip-diagram';
import { pixelSVG } from '../pixel/pixel';
import { mountMosaic } from '../pixel/mosaic-heading';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeUrl = (u?: string) => (u && (/^https?:\/\//i.test(u) || u.startsWith('/')) ? u : '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, '0');

interface Filters { source: 'all' | StudySource; move: Set<Movement>; size: Set<ShotSize> }

const brackets = '<span class="st-brk" aria-hidden="true"></span>';

function thumb(s: Study): string {
  const t = s.thumb;
  const dur = s.awaitingFootage ? 'No footage' : s.durationSec != null ? `${s.durationSec.toFixed(1)} s` : '';
  const chips = `
    <span class="st-tchip st-tchip--${s.source}">${s.source === 'film' ? 'Film reference' : 'Original study'}</span>
    ${dur ? `<span class="st-tchip st-tchip--dur">${esc(dur)}</span>` : ''}`;
  if (t.type === 'schematic') {
    return `<div class="st-thumb st-thumb--schematic">${renderDiagram(t.setup, 'plan')}${chips}</div>`;
  }
  const img = safeUrl(t.src)
    ? `<img src="${esc(safeUrl(t.src))}" alt="${esc(t.alt)}" loading="lazy">`
    : `<div class="st-render-ph" role="img" aria-label="${esc(t.alt)}"><span>[ Render ]</span></div>`;
  const prev = safeUrl(t.previewSrc) ? ` data-preview="${esc(safeUrl(t.previewSrc))}"` : '';
  return `<div class="st-thumb st-thumb--render"${prev}>${img}${chips}
    <span class="st-pv" aria-hidden="true"><span class="ff-px ff-px--cross"></span>Previewing</span></div>`;
}

function card(s: Study, href: string): string {
  const chips = [
    ...(s.awaitingFootage ? ['<span class="st-chip st-chip--warn"><span class="ff-px ff-px--strike" aria-hidden="true"></span>Awaiting footage</span>'] : []),
    ...s.chips.map((c) => `<span class="st-chip">${esc(c)}</span>`),
  ].join('');
  return `
  <li data-source="${s.source}" data-move="${s.movement}" data-size="${s.size}">
    <a class="st-card" href="${esc(href)}">
      ${thumb(s)}
      <div class="st-meta">
        <div class="st-row"><span class="st-lab"><span class="ff-px ff-px--cross" aria-hidden="true"></span>${esc(s.no)} · ${esc(s.movementLabel ?? cap(s.movement))}</span><span class="st-go" aria-hidden="true">→</span></div>
        <span class="st-title">${esc(s.title)}</span>
        <span class="st-src">${esc(s.sourceLine)}</span>
        <span class="st-chips">${chips}</span>
      </div>
    </a>
  </li>`;
}

export function studiesPageHTML(m: StudiesModel): string {
  const n = m.studies.length;
  const film = m.studies.filter((s) => s.source === 'film').length;
  const awaiting = m.studies.filter((s) => s.awaitingFootage).length;
  const moves = [...new Set(m.studies.map((s) => s.movement))];
  const sizes = [...new Set(m.studies.map((s) => s.size))];
  const count = (pred: (s: Study) => boolean) => m.studies.filter(pred).length;
  const chip = (group: 'move' | 'size', v: string, c: number) =>
    `<button type="button" class="st-fchip" data-group="${group}" data-value="${v}" aria-pressed="false">${esc(cap(v))} <span class="st-n">${c}</span></button>`;

  return `
  <div class="st">
    <nav class="st-tabs" aria-label="Explore sections">
      ${m.tabs.map((t) => `
      <a class="st-tab" href="${esc(safeUrl(t.href) || '#')}"${t.current ? ' aria-current="page"' : ''}>
        <span class="ff-px ${t.family === 'camera' ? 'ff-px--cross' : 'ff-px--ring'}" aria-hidden="true"></span>
        <span class="st-tab-t"><b>${esc(t.label)}</b><small>${esc(t.sub)}</small></span>
        ${t.current ? '' : '<span class="st-tab-ar" aria-hidden="true">→</span>'}
      </a>`).join('')}
    </nav>

    <section class="st-hero">
      <div class="st-hero-text">
        <span class="st-lab">${esc(m.kicker)}</span>
        <h1 class="st-h1">${esc(m.titleLines[0])}<br>${esc(m.titleLines[1])}</h1>
        <p class="st-lede">${esc(m.lede)}</p>
      </div>
      <figure class="st-mosaic" data-ff-no-trail aria-hidden="true">
        ${brackets}
        <figcaption>${esc(m.mosaic.caption)}</figcaption>
      </figure>
    </section>

    <section class="st-stats" aria-label="Collection summary">
      <div class="st-total"><span class="st-pixnum" data-value="${pad(n)}"></span><span class="st-lab st-lab--ink">Studies</span></div>
      <dl>
        <div><dt>Film refs</dt><dd>${pad(film)}</dd></div>
        <div><dt>Original</dt><dd>${pad(n - film)}</dd></div>
        <div><dt><span class="ff-px ff-px--strike" aria-hidden="true"></span>Awaiting footage</dt><dd>${pad(awaiting)}</dd></div>
      </dl>
    </section>

    <p class="st-note"><span class="ff-px ff-px--checker" aria-hidden="true"></span><span>${esc(m.disclaimer)}</span></p>

    <section class="st-filters" aria-label="Filter studies">
      <div class="st-filters-top">
        <div class="st-seg" role="group" aria-label="Source">
          <button type="button" data-source="all" aria-pressed="true">All ${n}</button>
          <button type="button" data-source="film" aria-pressed="false">Film references ${film}</button>
          <button type="button" data-source="original" aria-pressed="false">Original studies ${n - film}</button>
        </div>
        <div class="st-filters-status">
          <span class="st-lab st-count" aria-live="polite"></span>
          <button type="button" class="st-clear" hidden>Clear filters</button>
        </div>
      </div>
      <div class="st-groups">
        <div class="st-group" role="group" aria-label="Camera movement">
          <span class="st-glab"><span class="ff-px ff-px--cross" aria-hidden="true"></span>Movement</span>
          ${moves.map((v) => chip('move', v, count((s) => s.movement === v))).join('')}
        </div>
        ${sizes.length > 1 ? `
        <div class="st-group" role="group" aria-label="Shot size">
          <span class="st-glab"><span class="ff-px ff-px--checker" aria-hidden="true"></span>Shot size</span>
          ${sizes.map((v) => chip('size', v, count((s) => s.size === v))).join('')}
        </div>` : ''}
      </div>
    </section>

    <ul class="st-grid">${m.studies.map((s) => card(s, m.hrefFor(s))).join('')}</ul>
    <div class="st-empty" hidden>
      <p>No study matches every selected filter.</p>
      <button type="button" class="st-clear st-clear--solid">Clear filters</button>
    </div>
  </div>`;
}

export function renderStudiesPage(root: HTMLElement, m: StudiesModel): () => void {
  root.innerHTML = studiesPageHTML(m);
  const ac = new AbortController();
  const { signal } = ac;
  const disposers: (() => void)[] = [];

  // mosaic heading + pixel numeral
  const fig = root.querySelector<HTMLElement>('.st-mosaic');
  if (fig) disposers.push(mountMosaic(fig, { scene: m.mosaic.scene, animate: m.mosaic.animate??false }));
  root.querySelectorAll<HTMLElement>('.st-pixnum').forEach((el) => el.appendChild(pixelSVG(el.dataset.value ?? '')));

  /* ---------- filters (URL-backed) ---------- */
  const read = (): Filters => {
    const q = new URLSearchParams(location.search);
    const src = q.get('source');
    const list = (k: string) => (q.get(k) ?? '').split(',').filter(Boolean);
    return {
      source: src === 'film' || src === 'original' ? src : 'all',
      move: new Set(list('move').filter(v=>m.studies.some(s=>s.movement===v)) as Movement[]),
      size: new Set(list('size').filter(v=>m.studies.some(s=>s.size===v)) as ShotSize[]),
    };
  };
  let f = read();

  const write = () => {
    const u = new URL(location.href);
    const set = (k: string, v: string) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set('source', f.source === 'all' ? '' : f.source);
    set('move', [...f.move].join(','));
    set('size', [...f.size].join(','));
    history.replaceState(history.state, '', u);
  };

  const items = Array.from(root.querySelectorAll<HTMLElement>('.st-grid > li'));
  const countEl = root.querySelector<HTMLElement>('.st-count')!;
  const emptyEl = root.querySelector<HTMLElement>('.st-empty')!;
  const clearTop = root.querySelector<HTMLButtonElement>('.st-filters .st-clear')!;

  const apply = () => {
    let shown = 0;
    items.forEach((li) => {
      const ok = (f.source === 'all' || li.dataset.source === f.source)
        && (f.move.size === 0 || f.move.has(li.dataset.move as Movement))
        && (f.size.size === 0 || f.size.has(li.dataset.size as ShotSize));
      li.hidden = !ok;
      if (ok) shown++;
    });
    root.querySelectorAll<HTMLButtonElement>('button[data-source]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.source === f.source)));
    root.querySelectorAll<HTMLButtonElement>('.st-fchip').forEach((b) => {
      const set = b.dataset.group === 'move' ? f.move : f.size;
      b.setAttribute('aria-pressed', String((set as Set<string>).has(b.dataset.value!)));
    });
    countEl.textContent = `${pad(shown)} / ${pad(items.length)} studies`;
    emptyEl.hidden = shown > 0;
    clearTop.hidden = f.source === 'all' && f.move.size === 0 && f.size.size === 0;
  };

  root.querySelectorAll<HTMLButtonElement>('button[data-source]').forEach((b) => b.addEventListener('click', () => {
    f.source = b.dataset.source as Filters['source']; write(); apply();
  }, { signal }));
  root.querySelectorAll<HTMLButtonElement>('.st-fchip').forEach((b) => b.addEventListener('click', () => {
    const set = (b.dataset.group === 'move' ? f.move : f.size) as Set<string>;
    const v = b.dataset.value!;
    if (set.has(v)) set.delete(v); else set.add(v);
    write(); apply();
  }, { signal }));
  root.querySelectorAll<HTMLButtonElement>('.st-clear').forEach((b) => b.addEventListener('click', () => {
    f = { source: 'all', move: new Set(), size: new Set() }; write(); apply();
  }, { signal }));
  window.addEventListener('popstate', () => { f = read(); apply(); }, { signal });
  apply();

  /* ---------- hover preview for original renders (only if a loop exists) ---------- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopPreview=()=>{};
  root.querySelectorAll<HTMLElement>('.st-thumb[data-preview]').forEach((th) => {
    const card = th.closest('.st-card')!;
    let v: HTMLVideoElement | null = null;
    const on = (event:Event) => {
      if (reduce.matches || matchMedia('(hover: none)').matches || (event instanceof PointerEvent && event.pointerType==='touch')) return;
      stopPreview();stopPreview=off;
      if (!v) {
        v = document.createElement('video');
        v.preload='none'; v.src = th.dataset.preview!; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('aria-hidden', 'true'); v.className = 'st-video';
        th.prepend(v);
      }
      void v.play().then(()=>{if(!v?.paused)th.classList.add('is-previewing');}).catch(() => {th.classList.remove('is-previewing');});
    };
    const off = () => { th.classList.remove('is-previewing'); if(v){v.pause();v.currentTime=0;} };
    const observer=new IntersectionObserver(([entry])=>{if(!entry?.isIntersecting)off();});observer.observe(card);
    reduce.addEventListener('change',off,{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)off();},{signal});
    disposers.push(()=>{off();observer.disconnect();if(v){v.removeAttribute('src');v.load();v.remove();}});
    card.addEventListener('pointerenter', on, { signal });
    card.addEventListener('pointerleave', off, { signal });
    card.addEventListener('focusin', on, { signal });
    card.addEventListener('focusout', off, { signal });
  });

  return () => { ac.abort(); disposers.forEach((d) => d()); };
}
