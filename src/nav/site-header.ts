/**
 * Framefield — global site header (R1)
 * One header for every route. Sections: Explore · Index · AI Analyze. One action: Try the shot.
 *
 *   const header = mountSiteHeader(document.getElementById('site-header')!, {
 *     indexCount: registry.length,
 *     navigate: (href) => router.go(href),      // optional SPA hook
 *   });
 *   router.onChange((path) => header.setPath(path));
 *
 * Framework-free. All motion is in whole cells (CSS steps()), nothing loops,
 * and prefers-reduced-motion turns every travel into a jump.
 */

export type SectionId = 'explore' | 'index' | 'analyze';
export type ActiveId = SectionId | 'compose' | null;

export interface HeaderItem {
  id: SectionId;
  label: string;
  href: string;
  /** pixel module shown only while active: cross (camera), checker (composition), ring (lens) */
  mod: 'cross' | 'checker' | 'ring';
}

export interface HeaderOptions {
  items?: HeaderItem[];
  homeHref?: string;
  composeHref?: string;
  composeLabel?: string;
  /** small label after the wordmark; '' hides it */
  volume?: string;
  /** shown as a superscript on Index (number of canonical controls, from the registry) */
  indexCount?: number;
  /** route → active item; defaults to activeFor() */
  resolveActive?: (path: string) => ActiveId;
  /** which routes show the reading-progress strip; defaults to isLongPage() */
  showProgress?: (path: string) => boolean;
  /** SPA navigation; plain left-clicks call this instead of a full page load */
  navigate?: (href: string) => void;
  /** initial path; defaults to location.pathname */
  path?: string;
}

export interface SiteHeader {
  setPath(path: string): void;
  dispose(): void;
}

export const DEFAULT_ITEMS: HeaderItem[] = [
  { id: 'explore', label: 'Explore', href: '/explore', mod: 'cross' },
  { id: 'index', label: 'Index', href: '/index', mod: 'checker' },
  { id: 'analyze', label: 'AI Analyze', href: '/analyze', mod: 'ring' },
];

/** Route → active state (see the route table in CODEX_PROMPT_NAV.md). */
export function activeFor(path: string): ActiveId {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return null;
  if (/^\/compose(\/|$)/.test(p)) return 'compose';
  if (/^\/analyze(\/|$)/.test(p)) return 'analyze';
  if (/^\/(index|library)(\/|$)/.test(p)) return 'index';
  if (/^\/(explore|reference|clip|clips|studies|study)(\/|$)/.test(p)) return 'explore';
  return null;
}

/** Long pages get the progress strip: detail pages and Analyze results. */
export function isLongPage(path: string): boolean {
  const p = path.replace(/\/+$/, '');
  return /^\/(explore|reference|clip|clips|studies|study|index|library)\/[^/]+/.test(p) || /^\/analyze(\/|$)/.test(p);
}

const CELLS = 48;
const LOGO = ['XXXXX', 'X...X', 'X...X', 'X...X', 'XXXXX'];
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function mountSiteHeader(host: HTMLElement, opts: HeaderOptions = {}): SiteHeader {
  const items = opts.items ?? DEFAULT_ITEMS;
  const resolve = opts.resolveActive ?? activeFor;
  const progressFor = opts.showProgress ?? isLongPage;
  const volume = opts.volume ?? 'VOL. 01';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  // sticky needs the page as its scroll container, not a wrapper exactly as tall as the header
  const prevDisplay = host.style.display;
  host.style.display = 'contents';

  const logoCells = LOGO.join('').split('').map((c) => `<i${c === 'X' ? ' class="on"' : ''}></i>`).join('');
  host.innerHTML = `
<header class="ff-hdr" data-ff-header>
  <div class="ff-hdr__bar">
    <a class="ff-hdr__home" href="${esc(opts.homeHref ?? '/')}" aria-label="Framefield home">
      <span class="ff-hdr__mark" aria-hidden="true">${logoCells}<b class="ff-hdr__core"></b></span>
      <span class="ff-hdr__word">FRAMEFIELD</span>
      ${volume ? `<span class="ff-hdr__vol">${esc(volume)}</span>` : ''}
    </a>
    <nav class="ff-hdr__nav" aria-label="Primary">
      ${items.map((it) => `
      <a class="ff-hdr__item" href="${esc(it.href)}" data-id="${it.id}">
        <span class="ff-px ff-px--${it.mod} ff-hdr__mod" aria-hidden="true"></span>
        <span class="ff-hdr__label">${esc(it.label)}${it.id === 'index' && opts.indexCount != null
          ? `<sup class="ff-hdr__count" aria-label="${opts.indexCount} controls">${opts.indexCount}</sup>` : ''}</span>
      </a>`).join('')}
      <span class="ff-hdr__marker" aria-hidden="true"></span>
    </nav>
    <span class="ff-hdr__div" aria-hidden="true"></span>
    <a class="ff-hdr__cta" href="${esc(opts.composeHref ?? '/compose/workspace')}" data-id="compose">
      <span class="ff-hdr__cta-text">${esc(opts.composeLabel ?? 'Try the shot')}</span><span class="ff-hdr__arrow" aria-hidden="true">→</span>
    </a>
  </div>
  <div class="ff-hdr__prog" aria-hidden="true">${'<i></i>'.repeat(CELLS)}</div>
</header>`;

  const root = host.querySelector<HTMLElement>('.ff-hdr')!;
  const nav = root.querySelector<HTMLElement>('.ff-hdr__nav')!;
  const marker = root.querySelector<HTMLElement>('.ff-hdr__marker')!;
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.ff-hdr__item')];
  const cta = root.querySelector<HTMLAnchorElement>('.ff-hdr__cta')!;
  const cells = [...root.querySelectorAll<HTMLElement>('.ff-hdr__prog i')];

  let active: ActiveId = null;
  let progressOn = false;
  let lastFill = -1;
  let lastY = window.scrollY;
  let raf = 0;
  let placed = false;

  /* ---------- marker: one element that steps to the active item ---------- */
  function placeMarker() {
    const link = links.find((l) => l.dataset.id === active);
    if (!link) { marker.style.opacity = '0'; return; }
    const navBox = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    const w = marker.offsetWidth || 22;
    const x = Math.round((box.left - navBox.left + box.width / 2 - w / 2) / 2) * 2; // even px: stays on the grid
    if (marker.style.opacity === '0') placed = false; // coming from home/compose: appear in place, don't travel
    if (!placed) marker.classList.add('is-instant');
    marker.style.transform = `translateX(${x}px)`;
    marker.style.opacity = '1';
    if (!placed) {
      placed = true;
      void marker.offsetWidth;
      marker.classList.remove('is-instant');
    }
  }

  function setPath(path: string) {
    active = resolve(path);
    for (const l of links) {
      const on = l.dataset.id === active;
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
    }
    const composeOn = active === 'compose';
    cta.classList.toggle('is-active', composeOn);
    if (composeOn) cta.setAttribute('aria-current', 'page'); else cta.removeAttribute('aria-current');
    placeMarker();
    progressOn = progressFor(path);
    root.classList.toggle('has-progress', progressOn);
    lastFill = -1;
    onScroll();
  }

  /* ---------- scroll: condense, tuck (phone), progress ---------- */
  function update() {
    raf = 0;
    const y = Math.max(0, window.scrollY);
    root.classList.toggle('is-condensed', y > 8);
    const down = y > lastY;
    if (Math.abs(y - lastY) > 4) root.classList.toggle('is-tucked', down && y > 96);
    lastY = y;
    if (!progressOn) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const fill = max > 0 ? Math.round((y / max) * CELLS) : 0;
    if (fill === lastFill) return;
    lastFill = fill;
    cells.forEach((c, i) => { c.className = i < fill ? (i === fill - 1 ? 'is-head' : 'is-on') : ''; });
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }

  /* ---------- logo: restart the scan on each hover / focus ---------- */
  const home = root.querySelector<HTMLElement>('.ff-hdr__home')!;
  function scan() {
    if (reduce?.matches) return;
    home.classList.remove('is-scanning');
    void home.offsetWidth;
    home.classList.add('is-scanning');
  }
  const endScan = () => home.classList.remove('is-scanning');

  /* ---------- SPA navigation ---------- */
  function onClick(e: MouseEvent) {
    if (!opts.navigate || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!a || !root.contains(a)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    opts.navigate(url.pathname + url.search + url.hash);
  }

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    marker.classList.add('is-instant'); placeMarker(); void marker.offsetWidth; marker.classList.remove('is-instant');
  }) : null;
  ro?.observe(nav);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  home.addEventListener('pointerenter', scan);
  home.addEventListener('focus', scan);
  home.addEventListener('animationend', endScan);
  root.addEventListener('click', onClick);
  // fonts change label widths: re-place once they load
  (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => { if (root.isConnected) placeMarker(); });

  setPath(opts.path ?? location.pathname);

  return {
    setPath,
    dispose() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      home.removeEventListener('pointerenter', scan);
      home.removeEventListener('focus', scan);
      home.removeEventListener('animationend', endScan);
      root.removeEventListener('click', onClick);
      host.innerHTML = '';
      host.style.display = prevDisplay;
    },
  };
}
