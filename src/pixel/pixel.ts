/**
 * Framefield — pixel marks (R1)
 * Framework-free. Renders 5×7 pixel numerals as crisp SVG, the wordmark glyph,
 * and family icons. Deterministic: the same value always yields the same cells.
 */

export type CellKind = 'ring' | 'core' | 'ink';
export type Family = 'lens' | 'composition' | 'camera' | 'failure';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 5×7 glyphs. 'X' = on. Extend as needed (only values get pixel type). */
const GLYPHS: Record<string, string[]> = {
  '0': ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
  '1': ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  '2': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  '3': ['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'],
  '4': ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'],
  '5': ['XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'],
  '6': ['..XX.', '.X...', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  '7': ['XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...'],
  '8': ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'],
  '9': ['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '...X.', '.XX..'],
  'M': ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  '.': ['.', '.', '.', '.', '.', '.', 'X'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

export interface PixelGrid { cols: number; rows: number; cells: (CellKind | null)[]; }

/**
 * Lay out a string as cells. Digits use `kind`; letters use 'ink' so units
 * read as secondary. Accent cells are chosen deterministically, not randomly.
 */
export function layout(text: string, kind: CellKind = 'ring', accent: CellKind = 'core'): PixelGrid {
  const rows = 7;
  const lines = Array.from({ length: rows }, () => '');
  const isLetter: boolean[] = [];
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS[' ']!;
    const letter = /[A-Z]/.test(ch);
    for (let r = 0; r < rows; r++) lines[r] += (i ? '.' : '') + g[r]!;
    const w = g[0]!.length + (i ? 1 : 0);
    for (let k = 0; k < w; k++) isLetter.push(letter);
  });
  const cols = lines[0]!.length;
  const cells: (CellKind | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (lines[r]![c] !== 'X') { cells.push(null); continue; }
      if (isLetter[c]) { cells.push('ink'); continue; }
      cells.push((r * 7 + c * 3) % 11 === 0 ? accent : kind);
    }
  }
  return { cols, rows, cells };
}

/** Build an SVG for a pixel string. Cell = 10 units, gap = 1.5 units. */
export function pixelSVG(text: string, opts: { kind?: CellKind; accent?: CellKind; label?: string } = {}): SVGSVGElement {
  const { cols, rows, cells } = layout(text, opts.kind ?? 'ring', opts.accent ?? 'core');
  const cell = 10, gap = 1.5, step = cell + gap;
  const w = cols * step - gap, h = rows * step - gap;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'ff-pixnum');
  if (opts.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opts.label); }
  else svg.setAttribute('aria-hidden', 'true');

  const frag = document.createDocumentFragment();
  cells.forEach((k, i) => {
    if (!k) return;
    const x = (i % cols) * step, y = Math.floor(i / cols) * step;
    const cx = x + cell / 2, cy = y + cell / 2;
    const order = `--i:${i % cols}`;
    if (k === 'ink') {
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
      r.setAttribute('width', String(cell)); r.setAttribute('height', String(cell));
      r.setAttribute('class', 'c-ink');
      r.setAttribute('style', order);
      frag.appendChild(r);
      return;
    }
    // ring: outer stroke + centre dot (core variant: blue centre)
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', String(cx)); ring.setAttribute('cy', String(cy));
    ring.setAttribute('r', '4.45'); ring.setAttribute('stroke-width', '1.1');
    ring.setAttribute('class', 'c-ring');
      ring.setAttribute('style', order);
    frag.appendChild(ring);
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(cx)); dot.setAttribute('cy', String(cy));
    dot.setAttribute('r', k === 'core' ? '3' : '2.2');
    dot.setAttribute('class', k === 'core' ? 'c-core' : 'c-ring-dot');
    dot.setAttribute('style', order);
    frag.appendChild(dot);
  });
  svg.appendChild(frag);
  return svg;
}

/** A single family module as a span (styled by pixel-theme.css). */
export function familyIcon(family: Family, size = 16): HTMLSpanElement {
  const map: Record<Family, string> = {
    lens: 'ff-px--ring', composition: 'ff-px--checker', camera: 'ff-px--cross', failure: 'ff-px--strike',
  };
  const s = document.createElement('span');
  s.className = `ff-px ${map[family]}`;
  s.style.width = `${size}px`;
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/** 5×5 wordmark glyph: a frame with a lens-pink centre cell. */
export function logoGlyph(): HTMLSpanElement {
  const rows = ['XXXXX', 'X...X', 'X.R.X', 'X...X', 'XXXXX'];
  const el = document.createElement('span');
  el.className = 'ff-logo';
  el.setAttribute('aria-hidden', 'true');
  rows.join('').split('').forEach((ch) => {
    const i = document.createElement('i');
    if (ch === 'X') i.className = 'on';
    if (ch === 'R') i.className = 'core';
    el.appendChild(i);
  });
  return el;
}

/* ------------------------------------------------------------------------ */
/* Mounting into the existing Framefield DOM                                */
/* ------------------------------------------------------------------------ */

/** Render (or re-render) a pixel number into `host`, only when the value changes. */
export function renderPixelValue(host: HTMLElement, value: string, label?: string) {
  if (host.dataset.ffValue === value) return;
  const isUpdate = host.dataset.ffValue !== undefined;
  host.dataset.ffValue = value;
  const svg = pixelSVG(value, label ? { label } : {});
  if (isUpdate) svg.classList.add('is-entering');
  host.replaceChildren(svg);
}

/**
 * Keep a pixel numeral in sync with the existing `.focal-number` text.
 * Inserts `.ff-focal-pix` beside the caption; returns a disposer.
 */
export function mountFocalPixels(root: ParentNode = document): () => void {
  const source = root.querySelector<HTMLElement>('.focal-number, .lens-value');
  const caption = root.querySelector<HTMLElement>('.instrument-caption');
  if (!source || !caption) return () => {};

  let wrap = caption.querySelector<HTMLElement>('.ff-focal-pix');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'ff-focal-pix';
    const num = document.createElement('div');
    num.className = 'ff-focal-pix__num';
    wrap.append(num);
    caption.classList.add('ff-caption-row');
    caption.appendChild(wrap);
  }
  const numHost = wrap.querySelector<HTMLElement>('.ff-focal-pix__num')!;
  const sync = () => {
    const v = (source.textContent ?? '').replace(/[^0-9.]/g, '');
    if (v) renderPixelValue(numHost, v, `${v} millimetres`);
  };
  sync();
  const mo = new MutationObserver(sync);
  mo.observe(source, { childList: true, characterData: true, subtree: true });
  return () => mo.disconnect();
}

/** Prefix the edge triggers with their family module. Idempotent. */
export function mountFamilyIcons(root: ParentNode = document) {
  const zones: [string, Family][] = [
    ['.zone-lens .category-trigger', 'lens'],
    ['.zone-composition .category-trigger', 'composition'],
    ['.zone-camera .category-trigger', 'camera'],
  ];
  zones.forEach(([sel, fam]) => {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (el.querySelector('.ff-px')) return;
      el.prepend(familyIcon(fam));
    });
  });
}

/** Wordmark glyph in every header. Idempotent. */
export function mountLogo(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.wordmark').forEach((el) => {
    if (!el.querySelector('.ff-logo')) el.prepend(logoGlyph());
  });
}

/** Library page: replace the H1 text with a pixel title (keeps the text for a11y). */
export function mountControlTitle(root: ParentNode = document) {
  const h1 = root.querySelector<HTMLElement>('.archive-title h1');
  if (!h1 || h1.querySelector('.ff-pixnum')) return;
  const text = (h1.textContent ?? '').trim().toUpperCase();
  if (!/^[0-9]+(?:\.[0-9]+)?\s*MM$/.test(text)) return; // only numeric control names get pixel type
  h1.setAttribute('aria-label', text.toLowerCase());
  h1.replaceChildren(pixelSVG(text));
}

/** One call for the whole app. Safe to call after every route render. */
export function mountPixelTheme(root: ParentNode = document) {
  mountLogo(root);
  mountFamilyIcons(root);
  mountControlTitle(root);
  return mountFocalPixels(root);
}